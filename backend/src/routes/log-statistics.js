const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { Client } = require('ssh2');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

const executeRemoteCommand = (server, command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    let output = '';
    let error = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
        });

        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(error || output));
          } else {
            resolve({ output, error });
          }
        });
      });
    });

    conn.on('error', (err) => {
      reject(err);
    });

    const config = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 60000,
      connectTimeout: 60000,
      keepaliveInterval: 30000,
    };

    if (server.password) {
      config.password = server.password;
    } else if (server.private_key) {
      config.privateKey = server.private_key;
    }

    conn.connect(config);
  });
};

const getServer = (serverId) => {
  if (!serverId || serverId === 'local') {
    const defaultServer = db.prepare('SELECT * FROM servers WHERE is_default = 1').get();
    return defaultServer || null;
  }

  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  return server;
};

const parseAccessLog = (logContent) => {
  const lines = logContent.split('\n').filter(line => line.trim());
  const logs = [];

  const monthMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  lines.forEach(line => {
    const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+)(?: "([^"]*)"(?: "([^"]*)")?)?/;
    const match = line.match(regex);
    
    if (match) {
      const timeStr = match[2];
      const timeParts = timeStr.match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
      
      let date = null;
      if (timeParts) {
        const day = parseInt(timeParts[1]);
        const month = monthMap[timeParts[2]];
        const year = parseInt(timeParts[3]);
        const hours = parseInt(timeParts[4]);
        const minutes = parseInt(timeParts[5]);
        const seconds = parseInt(timeParts[6]);
        
        date = new Date(year, month, day, hours, minutes, seconds);
      }
      
      logs.push({
        ip: match[1],
        time: match[2],
        date: date,
        method: match[3],
        path: match[4],
        protocol: match[5],
        status: parseInt(match[6]),
        size: parseInt(match[7]) || 0,
        referer: match[8] || '-',
        userAgent: match[9] || '-',
      });
    }
  });

  return logs;
};

const calculateStatistics = (logs) => {
  const stats = {
    totalRequests: logs.length,
    uniqueVisitors: new Set(logs.map(log => log.ip)).size,
    totalTraffic: logs.reduce((sum, log) => sum + log.size, 0),
    statusCodes: {},
    methods: {},
    topPaths: {},
    topIPs: {},
    hourlyStats: {},
    dailyStats: {},
  };

  logs.forEach(log => {
    const status = Math.floor(log.status / 100) * 100;
    stats.statusCodes[status] = (stats.statusCodes[status] || 0) + 1;
    
    stats.methods[log.method] = (stats.methods[log.method] || 0) + 1;
    
    stats.topPaths[log.path] = (stats.topPaths[log.path] || 0) + 1;
    
    stats.topIPs[log.ip] = (stats.topIPs[log.ip] || 0) + 1;

    if (log.date) {
      const hourKey = `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, '0')}-${String(log.date.getDate()).padStart(2, '0')} ${String(log.date.getHours()).padStart(2, '0')}:00`;
      stats.hourlyStats[hourKey] = (stats.hourlyStats[hourKey] || 0) + 1;

      const dayKey = `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, '0')}-${String(log.date.getDate()).padStart(2, '0')}`;
      stats.dailyStats[dayKey] = (stats.dailyStats[dayKey] || 0) + 1;
    }
  });

  stats.topPaths = Object.entries(stats.topPaths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  stats.topIPs = Object.entries(stats.topIPs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  stats.successRate = logs.length > 0 
    ? ((stats.statusCodes[200] || 0) / logs.length * 100).toFixed(2)
    : 0;

  stats.errorRate = logs.length > 0
    ? ((stats.statusCodes[400] || 0 + stats.statusCodes[500] || 0) / logs.length * 100).toFixed(2)
    : 0;

  return stats;
};

router.get('/statistics', requirePermission('log:read'), async (req, res) => {
  const { serverId, hours = 24 } = req.query;
  const server = getServer(serverId);

  try {
    let content = '';
    const lines = hours * 1000;

    if (server && !server.is_default) {
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const accessLogPath = path.join(logPath, 'access.log');
      const { output } = await executeRemoteCommand(server, `test -f ${accessLogPath} && tail -n ${lines} ${accessLogPath}`);
      content = output;
    } else {
      const logPath = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      const accessLogPath = path.join(logPath, 'access.log');

      if (fs.existsSync(accessLogPath)) {
        content = fs.readFileSync(accessLogPath, 'utf-8');
      }
    }

    const logs = parseAccessLog(content);
    const stats = calculateStatistics(logs);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting log statistics:', error);
    res.status(500).json({ success: false, message: '获取日志统计失败', error: error.message });
  }
});

router.get('/trends', requirePermission('log:read'), async (req, res) => {
  const { serverId, days = 7 } = req.query;
  const server = getServer(serverId);

  try {
    let content = '';
    const lines = days * 24 * 1000;

    if (server && !server.is_default) {
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const accessLogPath = path.join(logPath, 'access.log');
      const { output } = await executeRemoteCommand(server, `test -f ${accessLogPath} && tail -n ${lines} ${accessLogPath}`);
      content = output;
    } else {
      const logPath = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      const accessLogPath = path.join(logPath, 'access.log');

      if (fs.existsSync(accessLogPath)) {
        content = fs.readFileSync(accessLogPath, 'utf-8');
      }
    }

    const logs = parseAccessLog(content);
    const dailyStats = {};

    logs.forEach(log => {
      if (!log.date) return;
      
      const dayKey = `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, '0')}-${String(log.date.getDate()).padStart(2, '0')}`;
      
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = {
          date: dayKey,
          requests: 0,
          uniqueVisitors: new Set(),
          traffic: 0,
          successRate: 0,
          errors: 0,
        };
      }

      dailyStats[dayKey].requests++;
      dailyStats[dayKey].uniqueVisitors.add(log.ip);
      dailyStats[dayKey].traffic += log.size;
      
      if (log.status >= 400) {
        dailyStats[dayKey].errors++;
      }
    });

    const trendData = Object.values(dailyStats)
      .map(day => ({
        ...day,
        uniqueVisitors: day.uniqueVisitors.size,
        successRate: day.requests > 0 ? ((day.requests - day.errors) / day.requests * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-parseInt(days));

    res.json({ success: true, data: trendData });
  } catch (error) {
    console.error('Error getting log trends:', error);
    res.status(500).json({ success: false, message: '获取趋势数据失败', error: error.message });
  }
});

module.exports = router;

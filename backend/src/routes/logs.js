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
      readyTimeout: 10000,
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
  if (!serverId) return null;
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  if (server && server.is_default) {
    return null;
  }
  return server;
};

const getLogPath = () => {
  if (process.env.NODE_ENV === 'development') {
    const projectLogPath = path.join(__dirname, '../../data/logs');
    console.log(`[getLogPath] Using development log path: ${projectLogPath}`);
    return projectLogPath;
  }
  return process.env.NGINX_LOG_PATH || '/var/log/nginx';
};

const getSetting = (key) => {
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return setting ? parseInt(setting.value) : null;
};

const getConfigPath = () => {
  return process.env.NGINX_CONFIG_PATH || '/etc/nginx';
};

const parseAccessLogPath = () => {
  const configPath = getConfigPath();
  const nginxConfPath = path.join(configPath, 'nginx.conf');
  
  try {
    if (!fs.existsSync(nginxConfPath)) {
      return path.join(getLogPath(), 'access.log');
    }

    const content = fs.readFileSync(nginxConfPath, 'utf-8');
    const match = content.match(/access_log\s+([^\s;]+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (error) {
    console.error('Error parsing nginx.conf:', error);
  }

  return path.join(getLogPath(), 'access.log');
};

const getAvailableLogFiles = () => {
  const logPath = getLogPath();
  const logFiles = [];

  try {
    if (!fs.existsSync(logPath)) {
      return logFiles;
    }

    const files = fs.readdirSync(logPath);
    files.forEach(file => {
      const filePath = path.join(logPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile() && (file.endsWith('.log') || file.includes('log'))) {
        logFiles.push({
          name: file,
          path: filePath,
          size: stats.size,
          lastModified: stats.mtime,
        });
      }
    });
  } catch (error) {
    console.error('Error reading log files:', error);
  }

  return logFiles;
};

router.get('/files', requirePermission('log:read'), async (req, res) => {
  const { serverId } = req.query;
  const server = getServer(serverId);

  try {
    let logFiles;

    if (server) {
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const { output } = await executeRemoteCommand(server, `find ${logPath} -maxdepth 1 -type f \\( -name "*.log" -o -name "*log*" \\) -exec stat -c "%n %s %Y" {} \\;`);
      const lines = output.trim().split('\n').filter(line => line.trim());
      
      logFiles = lines.map(line => {
        const parts = line.trim().split(' ');
        const filePath = parts[0];
        const size = parseInt(parts[1]) || 0;
        const timestamp = parseInt(parts[2]) || Date.now();
        const fileName = path.basename(filePath);
        
        return {
          name: fileName,
          path: filePath,
          size: size,
          lastModified: new Date(timestamp * 1000),
        };
      });
    } else {
      logFiles = getAvailableLogFiles();
    }

    res.json({ success: true, data: logFiles });
  } catch (error) {
    console.error('Error getting log files:', error);
    res.status(500).json({ success: false, message: '获取日志文件失败', error: error.message });
  }
});

router.get('/access', requirePermission('log:read'), async (req, res) => {
  const lines = parseInt(req.query.lines) || getSetting('max_log_lines') || 100;
  const logFile = req.query.file || 'access.log';
  const keyword = req.query.keyword || '';
  const { serverId } = req.query;
  const server = getServer(serverId);

  try {
    let content = '';
    let totalLines = 0;
    let stats = { success: 0, error: 0, redirect: 0, statusCodes: {}, methods: {} };

    if (server) {
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const accessLogPath = `${logPath}/${logFile}`;
      const { output: totalOutput } = await executeRemoteCommand(server, `wc -l ${accessLogPath} 2>/dev/null || echo "0"`);
      totalLines = parseInt(totalOutput.trim().split(' ')[0]) || 0;
      
      const linesToRead = keyword && keyword.trim() ? Math.min(totalLines, 10000) : lines * 2;
      const { output } = await executeRemoteCommand(server, `test -f ${accessLogPath} && tail -n ${linesToRead} ${accessLogPath}`);
      content = output;
      
      const { output: grepOutput } = await executeRemoteCommand(server, `grep -oE '" [0-9]{3}' ${accessLogPath} 2>/dev/null | cut -d' ' -f2 | sort | uniq -c`);
      if (grepOutput) {
        const grepLines = grepOutput.trim().split('\n');
        grepLines.forEach(line => {
          const match = line.trim().match(/^(\d+)\s+([0-9]{3})/);
          if (match) {
            const count = parseInt(match[1]);
            const code = match[2];
            if (code.startsWith('2')) {
              stats.success += count;
            } else if (code.startsWith('3')) {
              stats.redirect += count;
            } else if (code.startsWith('4') || code.startsWith('5')) {
              stats.error += count;
            }
            stats.statusCodes[code] = (stats.statusCodes[code] || 0) + count;
          }
        });
      }
      
      const { output: methodOutput } = await executeRemoteCommand(server, `grep -oE '"[A-Z]+ [^"]+"' ${accessLogPath} 2>/dev/null | cut -d' ' -f1 | tr -d '"' | sort | uniq -c`);
      if (methodOutput) {
        const methodLines = methodOutput.trim().split('\n');
        methodLines.forEach(line => {
          const match = line.trim().match(/^(\d+)\s+([A-Z]+)/);
          if (match) {
            const count = parseInt(match[1]);
            const method = match[2];
            stats.methods[method] = (stats.methods[method] || 0) + count;
          }
        });
      }
    } else {
      const logPath = getLogPath();
      const accessLogPath = path.join(logPath, logFile);

      if (!fs.existsSync(accessLogPath)) {
        return res.json({ logs: '', total: 0, filteredTotal: 0, stats });
      }

      content = fs.readFileSync(accessLogPath, 'utf-8');
      const allLogLines = content.split('\n').filter(line => line.trim());
      totalLines = allLogLines.length;
      
      allLogLines.forEach(line => {
        const match = line.match(/" (\d{3})/);
        if (match) {
          const status = match[1];
          if (status.startsWith('2')) {
            stats.success++;
          } else if (status.startsWith('3')) {
            stats.redirect++;
          } else if (status.startsWith('4') || status.startsWith('5')) {
            stats.error++;
          }
          stats.statusCodes[status] = (stats.statusCodes[status] || 0) + 1;
        }
        
        const methodMatch = line.match(/"([A-Z]+) /);
        if (methodMatch) {
          const method = methodMatch[1];
          stats.methods[method] = (stats.methods[method] || 0) + 1;
        }
      });
    }

    const logLines = content.split('\n').filter(line => line.trim());

    let filteredLogs = logLines;
    if (keyword && keyword.trim()) {
      const keywords = keyword.trim().toLowerCase().split(/\s+/);
      filteredLogs = logLines.filter(line => {
        const lowerLine = line.toLowerCase();
        return keywords.every(kw => lowerLine.includes(kw));
      });
    }

    const lastLines = filteredLogs.slice(-lines);
    res.json({ 
      success: true,
      data: {
        logs: lastLines.join('\n'),
        total: totalLines,
        filteredTotal: filteredLogs.length,
        stats,
        filtered: true,
      }
    });
  } catch (error) {
    console.error('Error reading access log:', error);
    res.json({ 
      success: true,
      data: {
        logs: '', 
        total: 0, 
        filteredTotal: 0, 
        stats: { success: 0, error: 0, redirect: 0, statusCodes: {}, methods: {} } 
      }
    });
  }
});

router.get('/error', requirePermission('log:read'), async (req, res) => {
  const lines = parseInt(req.query.lines) || getSetting('max_log_lines') || 100;
  const logFile = req.query.file || 'error.log';
  const keyword = req.query.keyword || '';
  const { serverId } = req.query;
  const server = getServer(serverId);

  try {
    let content = '';
    let totalLines = 0;
    let stats = { total: 0, error: 0, warn: 0, info: 0 };

    if (server) {
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const errorLogPath = `${logPath}/${logFile}`;
      const { output: totalOutput } = await executeRemoteCommand(server, `wc -l ${errorLogPath} 2>/dev/null || echo "0"`);
      totalLines = parseInt(totalOutput.trim().split(' ')[0]) || 0;
      
      const linesToRead = keyword && keyword.trim() ? Math.min(totalLines, 10000) : lines * 2;
      const { output } = await executeRemoteCommand(server, `test -f ${errorLogPath} && tail -n ${linesToRead} ${errorLogPath}`);
      content = output;
      
      const { output: grepOutput } = await executeRemoteCommand(server, `grep -oE '\\[(error|warn|info|debug)\\]' ${errorLogPath} 2>/dev/null | sort | uniq -c`);
      if (grepOutput) {
        const grepLines = grepOutput.trim().split('\n');
        grepLines.forEach(line => {
          const match = line.trim().match(/^(\d+)\s+\[(\w+)\]/);
          if (match) {
            const count = parseInt(match[1]);
            const level = match[2].toLowerCase();
            stats.total += count;
            if (level === 'error') {
              stats.error += count;
            } else if (level === 'warn') {
              stats.warn += count;
            } else if (level === 'info') {
              stats.info += count;
            }
          }
        });
      }
    } else {
      const logPath = getLogPath();
      const errorLogPath = path.join(logPath, logFile);

      if (!fs.existsSync(errorLogPath)) {
        return res.json({ success: true, data: { logs: '', total: 0, filteredTotal: 0, stats } });
      }

      content = fs.readFileSync(errorLogPath, 'utf-8');
      const logLines = content.split('\n').filter(line => line.trim());
      totalLines = logLines.length;
      
      logLines.forEach(line => {
        const match = line.match(/\[(error|warn|info|debug)\]/i);
        if (match) {
          const level = match[1].toLowerCase();
          stats.total++;
          if (level === 'error') {
            stats.error++;
          } else if (level === 'warn') {
            stats.warn++;
          } else if (level === 'info') {
            stats.info++;
          }
        }
      });
    }

    const logLines = content.split('\n').filter(line => line.trim());

    let filteredLogs = logLines;
    if (keyword && keyword.trim()) {
      const keywords = keyword.trim().toLowerCase().split(/\s+/);
      filteredLogs = logLines.filter(line => {
        const lowerLine = line.toLowerCase();
        return keywords.every(kw => lowerLine.includes(kw));
      });
    }

    const lastLines = filteredLogs.slice(-lines);
    res.json({ 
      success: true,
      data: {
        logs: lastLines.join('\n'),
        total: totalLines,
        filteredTotal: filteredLogs.length,
        stats,
        filtered: true,
      }
    });
  } catch (error) {
    console.error('Error reading error log:', error);
    res.json({ 
      success: true,
      data: {
        logs: '', 
        total: 0, 
        filteredTotal: 0,
        stats: { total: 0, error: 0, warn: 0, info: 0 }
      }
    });
  }
});

router.get('/traffic', requirePermission('log:read'), async (req, res) => {
  const { serverId } = req.query;
  const logFile = req.query.file || 'access.log';
  const server = getServer(serverId);
  
  const hoursToAnalyze = parseInt(req.query.hours) || 24;
  const now = new Date();
  const startTime = new Date(now.getTime() - hoursToAnalyze * 60 * 60 * 1000);

  try {
    let content = '';
    let totalBytes = 0;
    let requestCount = 0;

    if (server) {
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const accessLogPath = `${logPath}/${logFile}`;
      const { output } = await executeRemoteCommand(server, `test -f ${accessLogPath} && tail -n 100000 ${accessLogPath} 2>/dev/null || echo ""`);
      content = output;
    } else {
      const logPath = getLogPath();
      const accessLogPath = path.join(logPath, logFile);
      if (fs.existsSync(accessLogPath)) {
        content = fs.readFileSync(accessLogPath, 'utf-8');
      }
    }

    const logLines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    logLines.forEach((line) => {
      const timeMatch = line.match(/\[([^\]]+)\]/);
      if (timeMatch) {
        const timeStr = timeMatch[1];
        const time = parseLogDateTime(timeStr);
        
        if (time && time >= startTime) {
          requestCount++;
          const bytesMatch = line.match(/ (\d{3}) (\d+|-)$/);
          if (bytesMatch) {
            const bytes = parseInt(bytesMatch[2]);
            if (!isNaN(bytes)) {
              totalBytes += bytes;
            }
          }
        }
      }
    });

    const avgBytes = requestCount > 0 ? Math.round(totalBytes / requestCount) : 0;
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      data: {
        totalBytes,
        totalMB: parseFloat(totalMB),
        totalGB: parseFloat(totalGB),
        requestCount,
        avgBytes,
        hoursToAnalyze,
      }
    });
  } catch (error) {
    console.error('[Traffic] Error:', error);
    res.json({
      success: true,
      data: {
        totalBytes: 0,
        totalMB: 0,
        totalGB: 0,
        requestCount: 0,
        avgBytes: 0,
        hoursToAnalyze,
      }
    });
  }
});

function parseLogDateTime(timeStr) {
  const match = timeStr.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  const [, day, monthStr, year, hour, minute, second] = match;
  const month = months[monthStr];
  if (month === undefined) return null;

  return new Date(year, month, day, hour, minute, second);
}

module.exports = router;

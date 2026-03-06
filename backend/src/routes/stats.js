const express = require('express');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { getServer, executeRemoteCommand } = require('../utils/ssh');

const router = express.Router();

router.use(authMiddleware);

const parseStubStatus = (output) => {
  const lines = output.trim().split('\n');
  const stats = {
    activeConnections: 0,
    accepts: 0,
    handled: 0,
    requests: 0,
    reading: 0,
    writing: 0,
    waiting: 0,
  };

  lines.forEach(line => {
    const activeMatch = line.match(/Active connections:\s*(\d+)/);
    if (activeMatch) {
      stats.activeConnections = parseInt(activeMatch[1]);
    }

    const serverMatch = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)/);
    if (serverMatch) {
      stats.accepts = parseInt(serverMatch[1]);
      stats.handled = parseInt(serverMatch[2]);
      stats.requests = parseInt(serverMatch[3]);
    }

    const connectionMatch = line.match(/Reading:\s*(\d+)\s+Writing:\s*(\d+)\s+Waiting:\s*(\d+)/);
    if (connectionMatch) {
      stats.reading = parseInt(connectionMatch[1]);
      stats.writing = parseInt(connectionMatch[2]);
      stats.waiting = parseInt(connectionMatch[3]);
    }
  });

  return stats;
};

const getNginxStatusUrl = (server) => {
  if (server && server.nginx_status_url) {
    return server.nginx_status_url;
  }
  
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('nginx_status_url');
  return setting ? setting.value : 'http://localhost/nginx_status';
};

router.get('/', requirePermission('server:read'), async (req, res) => {
  const { serverId } = req.query;
  console.log(`[Stats API] GET /stats - serverId: ${serverId || 'null'}`);
  
  const server = getServer(serverId);
  if (!server) {
    console.error(`[Stats API] ✗ 服务器不存在 - serverId: ${serverId}`);
    return res.json({ 
      success: true,
      data: {
        activeConnections: 0,
        accepts: 0,
        handled: 0,
        requests: 0,
        reading: 0,
        writing: 0,
        waiting: 0
      }
    });
  }

  try {
    let output = '';
    const statusUrl = getNginxStatusUrl(server);
    console.log(`[Stats API] 获取Nginx状态URL: ${statusUrl}`);

    if (server && !server.is_default) {
      console.log(`[Stats API] 执行远程命令 - 服务器: ${server.host}:${server.port}`);
      const { output: remoteOutput } = await executeRemoteCommand(server, `curl -s ${statusUrl}`);
      output = remoteOutput;
      console.log(`[Stats API] ✓ 远程命令执行成功 - 输出长度: ${output.length} bytes`);
    } else {
      console.log(`[Stats API] 执行本地命令`);
      const { execSync } = require('child_process');
      output = execSync(`curl -s ${statusUrl}`, { encoding: 'utf-8' });
      console.log(`[Stats API] ✓ 本地命令执行成功 - 输出长度: ${output.length} bytes`);
    }

    const stats = parseStubStatus(output);
    console.log(`[Stats API] ✓ 解析Nginx状态成功 - activeConnections: ${stats.activeConnections}, requests: ${stats.requests}`);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(`[Stats API] ✗ 获取Nginx状态失败 - serverId: ${serverId}, 错误: ${error.message}`);
    res.json({ 
      success: true,
      data: {
        activeConnections: 0,
        accepts: 0,
        handled: 0,
        requests: 0,
        reading: 0,
        writing: 0,
        waiting: 0
      }
    });
  }
});

router.get('/history', requirePermission('server:read'), async (req, res) => {
  const { serverId } = req.query;
  const server = getServer(serverId);

  try {
    let output = '';
    const statusUrl = getNginxStatusUrl(server);

    if (server && !server.is_default) {
      const { output: remoteOutput } = await executeRemoteCommand(server, `curl -s ${statusUrl}`);
      output = remoteOutput;
    } else {
      const { execSync } = require('child_process');
      output = execSync(`curl -s ${statusUrl}`, { encoding: 'utf-8' });
    }

    const stats = parseStubStatus(output);

    const history = db.prepare(
      'SELECT * FROM nginx_stats_history WHERE server_id = ? ORDER BY timestamp DESC LIMIT 60'
    ).all(serverId || 'local');

    res.json({
      success: true,
      data: {
        current: stats,
        history: history.map(h => ({
          timestamp: h.timestamp,
          activeConnections: h.active_connections,
          requests: h.requests,
          reading: h.reading,
          writing: h.writing,
          waiting: h.waiting,
        })),
      }
    });
  } catch (error) {
    console.error('Failed to get nginx stats history:', error);
    res.json({
      success: true,
      data: {
        current: {
          activeConnections: 0,
          accepts: 0,
          handled: 0,
          requests: 0,
          reading: 0,
          writing: 0,
          waiting: 0
        },
        history: []
      }
    });
  }
});

router.post('/record', requirePermission('server:manage'), async (req, res) => {
  const { serverId } = req.query;
  const server = getServer(serverId);

  try {
    let output = '';
    const statusUrl = getNginxStatusUrl(server);

    if (server && !server.is_default) {
      const { output: remoteOutput } = await executeRemoteCommand(server, `curl -s ${statusUrl}`);
      output = remoteOutput;
    } else {
      const { execSync } = require('child_process');
      output = execSync(`curl -s ${statusUrl}`, { encoding: 'utf-8' });
    }

    const stats = parseStubStatus(output);

    db.prepare(
      `INSERT INTO nginx_stats_history 
       (server_id, active_connections, accepts, handled, requests, reading, writing, waiting, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      serverId || 'local',
      stats.activeConnections,
      stats.accepts,
      stats.handled,
      stats.requests,
      stats.reading,
      stats.writing,
      stats.waiting
    );

    res.json({ message: '统计记录成功', stats });
  } catch (error) {
    console.error('Failed to record nginx stats:', error);
    res.status(500).json({ message: '记录nginx统计失败' });
  }
});

module.exports = router;

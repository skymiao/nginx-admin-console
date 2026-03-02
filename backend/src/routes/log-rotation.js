const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { 
  rotateLog, 
  compressLog, 
  getRotatedLogs, 
  cleanupOldLogs, 
  getLogSize, 
  shouldRotate,
  reloadNginx 
} = require('../utils/logRotation');
const { db } = require('../database');

const router = express.Router();

router.use(authMiddleware);

router.get('/size', requirePermission('log:manage'), async (req, res) => {
  const { logFile, serverId } = req.query;
  
  try {
    let logPath;
    
    if (serverId) {
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
      if (!server) {
        return res.status(404).json({ success: false, message: '服务器不存在' });
      }
      
      const logPathBase = server.nginx_log_path || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    } else {
      const logPathBase = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    }
    
    const result = getLogSize(logPath);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting log size:', error);
    res.status(500).json({ success: false, message: '获取日志大小失败', error: error.message });
  }
});

router.post('/rotate', requirePermission('log:manage'), async (req, res) => {
  const { logFile, serverId } = req.body;
  
  try {
    let logPath;
    
    if (serverId) {
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
      if (!server) {
        return res.status(404).json({ success: false, message: '服务器不存在' });
      }
      
      const logPathBase = server.nginx_log_path || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    } else {
      const logPathBase = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    }
    
    const result = await rotateLog(logPath);
    
    if (result.success) {
      await reloadNginx();
    }
    
    res.json({ success: result.success, data: result });
  } catch (error) {
    console.error('Error rotating log:', error);
    res.status(500).json({ success: false, message: '切割日志失败', error: error.message });
  }
});

router.post('/compress', requirePermission('log:manage'), async (req, res) => {
  const { logFile, serverId } = req.body;
  
  try {
    let logPath;
    
    if (serverId) {
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
      if (!server) {
        return res.status(404).json({ success: false, message: '服务器不存在' });
      }
      
      const logPathBase = server.nginx_log_path || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    } else {
      const logPathBase = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    }
    
    const result = await compressLog(logPath);
    
    res.json({ success: result.success, data: result });
  } catch (error) {
    console.error('Error compressing log:', error);
    res.status(500).json({ success: false, message: '压缩日志失败', error: error.message });
  }
});

router.get('/rotated', requirePermission('log:read'), async (req, res) => {
  const { logFile, serverId } = req.query;
  
  try {
    let logPath;
    
    if (serverId) {
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
      if (!server) {
        return res.status(404).json({ success: false, message: '服务器不存在' });
      }
      
      const logPathBase = server.nginx_log_path || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    } else {
      const logPathBase = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    }
    
    const result = await getRotatedLogs(logPath);
    
    res.json({ success: result.success, data: result });
  } catch (error) {
    console.error('Error getting rotated logs:', error);
    res.status(500).json({ success: false, message: '获取历史日志失败', error: error.message });
  }
});

router.post('/cleanup', requirePermission('log:manage'), async (req, res) => {
  const { logFile, serverId, maxAgeDays } = req.body;
  
  try {
    let logPath;
    
    if (serverId) {
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
      if (!server) {
        return res.status(404).json({ success: false, message: '服务器不存在' });
      }
      
      const logPathBase = server.nginx_log_path || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    } else {
      const logPathBase = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    }
    
    const result = await cleanupOldLogs(logPath, maxAgeDays || 30);
    
    res.json({ success: result.success, data: result });
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
    res.status(500).json({ success: false, message: '清理历史日志失败', error: error.message });
  }
});

router.get('/check-rotate', requirePermission('log:read'), async (req, res) => {
  const { logFile, serverId, maxSizeMB } = req.query;
  
  try {
    let logPath;
    
    if (serverId) {
      const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
      if (!server) {
        return res.status(404).json({ success: false, message: '服务器不存在' });
      }
      
      const logPathBase = server.nginx_log_path || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    } else {
      const logPathBase = process.env.NGINX_LOG_PATH || '/var/log/nginx';
      logPath = `${logPathBase}/${logFile}`;
    }
    
    const result = getLogSize(logPath);
    const needsRotation = shouldRotate(logPath, maxSizeMB || 100);
    
    res.json({ 
      success: true, 
      data: { 
        ...result, 
        needsRotation,
        maxSizeMB: maxSizeMB || 100
      } 
    });
  } catch (error) {
    console.error('Error checking rotation status:', error);
    res.status(500).json({ success: false, message: '检查切割状态失败', error: error.message });
  }
});

module.exports = router;

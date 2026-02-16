const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const os = require('os');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('system:manage'), (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsMap = {};
  settings.forEach(setting => {
    settingsMap[setting.key] = setting.value;
  });
  res.json(settingsMap);
});

router.put('/', requirePermission('system:manage'), (req, res) => {
  const updates = req.body;

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ message: '无效的设置数据' });
  }

  try {
    Object.entries(updates).forEach(([key, value]) => {
      const stringValue = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
      db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, stringValue);
    });

    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });
    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ message: '更新设置失败', error: error.message });
  }
});

router.post('/test', requirePermission('system:manage'), (req, res) => {
  const { configPath, logPath } = req.body;

  if (!configPath || !logPath) {
    return res.status(400).json({ message: '缺少必要字段' });
  }

  const results = {
    configPath: { exists: false, readable: false, writable: false },
    logPath: { exists: false, readable: false, writable: false },
  };

  try {
    results.configPath.exists = fs.existsSync(configPath);
    if (results.configPath.exists) {
      results.configPath.readable = fs.accessSync(configPath, fs.constants.R_OK) === undefined;
      results.configPath.writable = fs.accessSync(configPath, fs.constants.W_OK) === undefined;
    }

    results.logPath.exists = fs.existsSync(logPath);
    if (results.logPath.exists) {
      results.logPath.readable = fs.accessSync(logPath, fs.constants.R_OK) === undefined;
      results.logPath.writable = fs.accessSync(logPath, fs.constants.R_OK) === undefined;
    }

    const allValid = results.configPath.exists && results.configPath.readable && 
                      results.logPath.exists && results.logPath.readable;

    res.json({ success: allValid, results });
  } catch (error) {
    res.status(500).json({ message: '路径测试失败', error: error.message });
  }
});

router.get('/info', requirePermission('system:manage'), (req, res) => {
  try {
    exec('nginx -v 2>&1', (error, stdout) => {
      const nginxVersion = error ? 'Unknown' : stdout.trim().replace('nginx version: ', '');

      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      exec('uptime -p 2>/dev/null || uptime', (error, stdout) => {
        const uptime = error ? 'Unknown' : stdout.trim();

        res.json({
          nginxVersion,
          os: `${os.type()} ${os.release()}`,
          uptime,
          cpuUsage: `${cpus.length} cores`,
          memoryUsage: `${Math.round((usedMem / totalMem) * 100)}%`,
          diskUsage: 'Unknown',
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: '获取系统信息失败', error: error.message });
  }
});

module.exports = router;

const express = require('express');
const { exec } = require('child_process');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/reload', requirePermission('config:apply'), (req, res) => {
  try {
    exec('nginx -s reload', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ message: '重载 Nginx 失败', error: stderr || error.message });
      }

      res.json({ message: 'Nginx 重载成功' });
    });
  } catch (error) {
    res.status(500).json({ message: '重载 Nginx 失败', error: error.message });
  }
});

router.post('/validate', requirePermission('config:write'), (req, res) => {
  try {
    exec('nginx -t', (error, stdout, stderr) => {
      if (error) {
        return res.json({ valid: false, error: stderr || error.message });
      }

      if (stderr && stderr.includes('successful')) {
        return res.json({ valid: true });
      }

      res.json({ valid: false, error: stderr || '配置验证失败' });
    });
  } catch (error) {
    res.status(500).json({ message: '验证配置失败', error: error.message });
  }
});

router.get('/status', requirePermission('config:read'), (req, res) => {
  try {
    exec('pgrep nginx', (error, stdout) => {
      const isRunning = !error && stdout.trim().length > 0;

      exec('nginx -v 2>&1', (versionError, versionStdout) => {
        const version = versionError ? 'Unknown' : versionStdout.trim().replace('nginx version: ', '');

        res.json({
          running: isRunning,
          version,
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: '获取 Nginx 状态失败', error: error.message });
  }
});

module.exports = router;

const express = require('express');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { encryptPassword, encryptPrivateKey, decryptPassword, decryptPrivateKey } = require('../utils/crypto');

const router = express.Router();

router.use(authMiddleware);

const formatServer = (server) => {
  if (!server) return null;
  return {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };
};

router.get('/', requirePermission('server:read'), (req, res) => {
  try {
    const servers = db.prepare('SELECT * FROM servers ORDER BY is_default DESC, created_at DESC').all();
    const decryptedServers = servers.map(formatServer);
    res.json({ success: true, data: decryptedServers });
  } catch (error) {
    console.error('Failed to fetch servers:', error);
    res.status(500).json({ success: false, message: '获取服务器列表失败', error: error.message });
  }
});

router.get('/:id', requirePermission('server:read'), (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: '服务器不存在' });
    }
    res.json({ success: true, data: formatServer(server) });
  } catch (error) {
    console.error('Failed to fetch server:', error);
    res.status(500).json({ success: false, message: '获取服务器信息失败', error: error.message });
  }
});

router.post('/', requirePermission('server:manage'), (req, res) => {
  try {
    const { name, host, port, username, password, privateKey, description, nginxConfigPath, nginxLogPath, nginxStatusUrl, useSudo } = req.body;

    if (!name || !host || !username) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    if (!password && !privateKey) {
      return res.status(400).json({ success: false, message: '密码和私钥至少提供一个' });
    }

    const encryptedPassword = password ? encryptPassword(password) : null;
    const encryptedPrivateKey = privateKey ? encryptPrivateKey(privateKey) : null;

    const insertSQL = `
      INSERT INTO servers (name, host, port, username, password, private_key, description, nginx_config_path, nginx_log_path, nginx_status_url, use_sudo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.prepare(insertSQL).run(
      name,
      host,
      port || 22,
      username,
      encryptedPassword,
      encryptedPrivateKey,
      description || null,
      nginxConfigPath || '/etc/nginx',
      nginxLogPath || '/var/log/nginx',
      nginxStatusUrl || 'http://localhost/nginx_status',
      useSudo ?1 : 0
    );

    res.status(201).json({ 
      success: true,
      data: { id: result.lastInsertRowid },
      message: '创建成功' 
    });
  } catch (error) {
    console.error('Failed to create server:', error);
    res.status(500).json({ success: false, message: '创建服务器失败', error: error.message });
  }
});

router.put('/:id', requirePermission('server:manage'), (req, res) => {
  try {
    const { name, host, port, username, password, privateKey, description, nginxConfigPath, nginxLogPath, nginxStatusUrl, useSudo } = req.body;

    const existingServer = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!existingServer) {
      return res.status(404).json({ success: false, message: '服务器不存在' });
    }

    let encryptedPassword = existingServer.password;
    let encryptedPrivateKey = existingServer.private_key;

    if (password !== undefined && password !== '') {
      encryptedPassword = encryptPassword(password);
    }

    if (privateKey !== undefined && privateKey !== '') {
      encryptedPrivateKey = encryptPrivateKey(privateKey);
    }

    const updateSQL = `
      UPDATE servers 
      SET name = ?, host = ?, port = ?, username = ?, password = ?, private_key = ?, description = ?, nginx_config_path = ?, nginx_log_path = ?, nginx_status_url = ?, use_sudo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.prepare(updateSQL).run(
      name !== undefined ? name : existingServer.name,
      host !== undefined ? host : existingServer.host,
      port !== undefined ? port : existingServer.port,
      username !== undefined ? username : existingServer.username,
      encryptedPassword,
      encryptedPrivateKey,
      description !== undefined ? description : existingServer.description,
      nginxConfigPath !== undefined ? nginxConfigPath : existingServer.nginx_config_path,
      nginxLogPath !== undefined ? nginxLogPath : existingServer.nginx_log_path,
      nginxStatusUrl !== undefined ? nginxStatusUrl : existingServer.nginx_status_url,
      useSudo !== undefined ? (useSudo ? 1 : 0) : existingServer.use_sudo,
      req.params.id
    );

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('Failed to update server:', error);
    res.status(500).json({ success: false, message: '更新服务器失败', error: error.message });
  }
});

router.delete('/:id', requirePermission('server:manage'), (req, res) => {
  try {
    const existingServer = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!existingServer) {
      return res.status(404).json({ success: false, message: '服务器不存在' });
    }

    if (existingServer.is_default) {
      return res.status(403).json({ success: false, message: '默认服务器不能删除' });
    }

    db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Failed to delete server:', error);
    res.status(500).json({ success: false, message: '删除服务器失败', error: error.message });
  }
});

module.exports = router;

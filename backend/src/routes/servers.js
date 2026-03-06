const express = require('express');
const { Client } = require('ssh2');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { db } = require('../database');
const { executeWithPool } = require('../utils/sshPool');
const { decryptPassword, decryptPrivateKey } = require('../utils/crypto');

const router = express.Router();

router.use(authMiddleware);

router.post('/test-connection', requirePermission('server:manage'), async (req, res) => {
  try {
    const { host, port, username, password, privateKey, isLocal, nginxStatusUrl } = req.body;

    const validatePrivateKey = (key) => {
      if (!key) return { valid: true };
      
      const trimmedKey = key.trim();
      
      if (!trimmedKey.includes('-----BEGIN') || !trimmedKey.includes('-----END')) {
        return { 
          valid: false, 
          error: '私钥格式不正确，必须包含 BEGIN 和 END 标记（如：-----BEGIN RSA PRIVATE KEY-----）' 
        };
      }
      
      if (!trimmedKey.includes('PRIVATE KEY')) {
        return { 
          valid: false, 
          error: '私钥格式不正确，必须是 PRIVATE KEY 格式' 
        };
      }
      
      return { valid: true };
    };

    const formatSSHError = (err, host, port, username) => {
      const key = `${host}:${port}:${username}`;
      
      if (err.message.includes('All configured authentication methods failed')) {
        if (privateKey) {
          return `SSH 认证失败 (${key}): 私钥认证失败，请检查：\n1. 私钥是否正确\n2. 私钥是否已添加到服务器的 authorized_keys\n3. 私钥文件权限是否正确 (600)\n4. 用户名是否正确`;
        } else if (password) {
          return `SSH 认证失败 (${key}): 密码认证失败，请检查：\n1. 密码是否正确\n2. 用户名是否正确\n3. 服务器是否允许密码认证`;
        } else {
          return `SSH 认证失败 (${key}): 未提供认证凭据（密码或私钥）`;
        }
      }
      
      if (err.message.includes('ECONNREFUSED')) {
        return `SSH 连接被拒绝 (${key}): 请检查主机地址和SSH端口 (默认22)`;
      }
      
      if (err.message.includes('ETIMEDOUT') || err.message.includes('Timed out')) {
        return `SSH 连接超时 (${key}): 请检查主机地址是否可达，网络连接是否正常`;
      }
      
      if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        return `SSH 主机未找到 (${key}): 请检查主机地址是否正确`;
      }
      
      if (err.message.includes('EHOSTUNREACH')) {
        return `SSH 主机不可达 (${key}): 请检查网络连接和防火墙设置`;
      }
      
      if (err.message.includes('Permission denied')) {
        return `SSH 权限被拒绝 (${key}): 请检查用户名和密码/密钥是否正确`;
      }
      
      return `SSH 连接失败 (${key}): ${err.message}`;
    };

    if (isLocal || host === 'localhost' || host === '127.0.0.1' || !host) {
      const statusUrl = nginxStatusUrl || 'http://localhost/nginx_status';
      
      try {
        const http = require('http');
        const url = new URL(statusUrl);
        
        return new Promise((resolve) => {
          const req = http.get(url, (httpRes) => {
            let data = '';
            httpRes.on('data', chunk => data += chunk);
            httpRes.on('end', () => {
              if (httpRes.statusCode === 200) {
                resolve(res.json({ success: true, message: '本地连接成功 (Nginx状态: 正常)' }));
              } else {
                resolve(res.json({ success: true, message: `本地连接成功 (Nginx状态: HTTP ${httpRes.statusCode})` }));
              }
            });
          });
          
          req.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
              resolve(res.status(500).json({ success: false, message: '本地连接成功，但Nginx未运行或无法访问nginx_status' }));
            } else {
              resolve(res.status(500).json({ success: false, message: `连接失败: ${err.message}` }));
            }
          });
          
          req.setTimeout(10000, () => {
            req.destroy();
            resolve(res.status(500).json({ success: false, message: '连接超时' }));
          });
        });
      } catch (httpError) {
        return res.status(500).json({ success: false, message: `连接失败: ${httpError.message}` });
      }
    }

    if (!host || !username || (!password && !privateKey)) {
      return res.status(400).json({ success: false, message: '缺少必要的连接参数 (host/username/password或privateKey)' });
    }

    if (privateKey) {
      const validation = validatePrivateKey(privateKey);
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false, 
          message: `私钥格式错误: ${validation.error}` 
        });
      }
    }

    try {
      const serverWithCredentials = {
        host,
        port: port || 22,
        username,
        password: password || null,
        private_key: privateKey || null,
      };

      const result = await executeWithPool(serverWithCredentials, 'echo "connection test"');
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      res.json({ success: true, message: 'SSH连接成功', output: result.output });
    } catch (err) {
      const formattedError = formatSSHError(err, host, port || 22, username);
      console.error('SSH Connection Error:', formattedError);
      res.status(500).json({ 
        success: false, 
        message: formattedError,
        error: err.message 
      });
    }
  } catch (error) {
    console.error('Test Connection Exception:', error);
    res.status(500).json({ 
      success: false, 
      message: '连接测试失败', 
      error: error.message 
    });
  }
});

router.post('/execute-command', requirePermission('server:manage'), async (req, res) => {
  try {
    const { serverId, command } = req.body;

    if (!serverId || !command) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const { db } = require('../database');
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);

    if (!server) {
      return res.status(404).json({ message: '服务器不存在' });
    }

    const serverWithCredentials = {
      ...server,
      password: server.password ? decryptPassword(server.password) : null,
      private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
    };

    const result = await executeWithPool(serverWithCredentials, command);
    res.json({ 
      success: true, 
      output: result.output, 
      error: result.error || null 
    });
  } catch (error) {
    const formattedError = formatSSHError(error, server?.host, server?.port || 22, server?.username);
    res.status(500).json({ 
      success: false, 
      message: '命令执行失败', 
      error: formattedError || error.message 
    });
  }
});

router.post('/reload-nginx', requirePermission('server:manage'), async (req, res) => {
  try {
    const { serverId } = req.body;

    if (!serverId) {
      return res.status(400).json({ message: '缺少服务器ID' });
    }

    const { db } = require('../database');
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);

    if (!server) {
      return res.status(404).json({ message: '服务器不存在' });
    }

    const serverWithCredentials = {
      ...server,
      password: server.password ? decryptPassword(server.password) : null,
      private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
    };

    console.log(`Connected to server ${server.name}, reloading nginx...`);
    
    const commands = [
      'nginx -t',
      'nginx -s reload'
    ];

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      console.log(`Executing command: ${cmd}`);

      const result = await executeWithPool(serverWithCredentials, cmd);
      console.log(`Command ${cmd} completed`);
      console.log(`Output: ${result.output}`);
      console.log(`Error: ${result.error}`);

      if (i === 0 && result.error) {
        return res.status(500).json({ 
          success: false, 
          message: 'nginx配置验证失败', 
          error: result.error || result.output 
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'nginx重载成功' 
    });
  } catch (error) {
    const formattedError = formatSSHError(error, server?.host, server?.port || 22, server?.username);
    res.status(500).json({ 
      success: false, 
      message: 'nginx重载失败', 
      error: formattedError || error.message 
    });
  }
});

router.get('/nginx-status', requirePermission('server:read'), async (req, res) => {
  try {
    const { serverId } = req.query;

    if (!serverId) {
      return res.status(400).json({ message: '缺少服务器ID' });
    }

    const { db } = require('../database');
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);

    if (!server) {
      return res.status(404).json({ message: '服务器不存在' });
    }

    if (server.is_default) {
      res.json({ 
        success: true, 
        running: true,
        status: '运行中'
      });
      return;
    }

    const serverWithCredentials = {
      ...server,
      password: server.password ? decryptPassword(server.password) : null,
      private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
    };

    const result = await executeWithPool(serverWithCredentials, 'pgrep -x nginx && echo "running" || echo "stopped"');
    const isRunning = result.output.trim() === 'running';
    
    res.json({ 
      success: true, 
      running: isRunning,
      status: isRunning ? '运行中' : '已停止'
    });
  } catch (error) {
    const formattedError = formatSSHError(error, server?.host, server?.port || 22, server?.username);
    res.status(500).json({ 
      success: false, 
      message: '状态检查失败', 
      error: formattedError || error.message 
    });
  }
});

module.exports = router;
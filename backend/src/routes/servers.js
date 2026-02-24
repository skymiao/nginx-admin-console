const express = require('express');
const { Client } = require('ssh2');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { db } = require('../database');

const router = express.Router();

router.use(authMiddleware);

router.post('/test-connection', requirePermission('server:manage'), async (req, res) => {
  try {
    const { host, port, username, password, privateKey, isLocal, nginxStatusUrl } = req.body;

    if (isLocal || host === 'localhost' || host === '127.0.0.1' || !host) {
      const statusUrl = nginxStatusUrl || 'http://localhost/nginx_status';
      
      try {
        const http = require('http');
        const url = new URL(statusUrl);
        
        return new Promise((resolve) => {
          const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              if (res.statusCode === 200) {
                resolve(res.json({ success: true, message: '本地连接成功 (Nginx状态: 正常)' }));
              } else {
                resolve(res.json({ success: true, message: `本地连接成功 (Nginx状态: HTTP ${res.statusCode})` }));
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
          
          req.setTimeout(5000, () => {
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

    const conn = new Client();
    
    conn.on('ready', () => {
      conn.end();
      res.json({ success: true, message: 'SSH连接成功' });
    });

    conn.on('error', (err) => {
      console.error('SSH Connection Error:', err.message);
      let errorMessage = 'SSH连接失败';
      
      if (err.message.includes('ECONNREFUSED')) {
        errorMessage = '连接被拒绝 - 请检查主机地址和SSH端口 (默认22)';
      } else if (err.message.includes('ETIMEDOUT') || err.message.includes('Timed out')) {
        errorMessage = '连接超时 - 请检查主机地址是否可达';
      } else if (err.message.includes('Authentication')) {
        errorMessage = '认证失败 - 请检查用户名和密码/密钥';
      } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        errorMessage = '主机未找到 - 请检查主机地址是否正确';
      } else {
        errorMessage = `连接失败: ${err.message}`;
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        error: err.message 
      });
    });

    const config = {
      host,
      port: port || 22,
      username,
      readyTimeout: 15000,
      keepaliveInterval: 0,
    };

    if (password) {
      config.password = password;
    } else if (privateKey) {
      config.privateKey = privateKey;
    }

    conn.connect(config);
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

    const conn = new Client();
    
    let output = '';
    let error = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return res.status(500).json({ 
            success: false, 
            message: '命令执行失败', 
            error: err.message 
          });
        }

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
        });

        stream.on('close', () => {
          conn.end();
          res.json({ 
            success: true, 
            output, 
            error: error || null 
          });
        });
      });
    });

    conn.on('error', (err) => {
      res.status(500).json({ 
        success: false, 
        message: 'SSH连接失败', 
        error: err.message 
      });
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
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '命令执行失败', 
      error: error.message 
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

    const conn = new Client();
    
    conn.on('ready', () => {
      console.log(`Connected to server ${server.name}, reloading nginx...`);
      
      const commands = [
        'nginx -t',
        'nginx -s reload'
      ];

      let currentCommand = 0;

      const executeNext = () => {
        if (currentCommand >= commands.length) {
          conn.end();
          return res.json({ 
            success: true, 
            message: 'nginx重载成功' 
          });
        }

        const cmd = commands[currentCommand];
        console.log(`Executing command: ${cmd}`);

        conn.exec(cmd, (err, stream) => {
          if (err) {
            conn.end();
            return res.status(500).json({ 
              success: false, 
              message: '命令执行失败', 
              error: err.message 
            });
          }

          let output = '';
          let stderr = '';

          stream.on('data', (data) => {
            output += data.toString();
          });

          stream.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          stream.on('close', (code) => {
            console.log(`Command ${cmd} completed with code ${code}`);
            console.log(`Output: ${output}`);
            console.log(`Stderr: ${stderr}`);

            if (code !== 0 && currentCommand === 0) {
              conn.end();
              return res.status(500).json({ 
                success: false, 
                message: 'nginx配置验证失败', 
                error: stderr || output 
              });
            }

            currentCommand++;
            executeNext();
          });
        });
      };

      executeNext();
    });

    conn.on('error', (err) => {
      res.status(500).json({ 
        success: false, 
        message: 'SSH连接失败', 
        error: err.message 
      });
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
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'nginx重载失败', 
      error: error.message 
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

    const conn = new Client();
    
    conn.on('ready', () => {
      conn.exec('pgrep -x nginx && echo "running" || echo "stopped"', (err, stream) => {
        if (err) {
          conn.end();
          return res.status(500).json({ 
            success: false, 
            message: '状态检查失败', 
            error: err.message 
          });
        }

        let output = '';

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.on('close', () => {
          conn.end();
          const isRunning = output.trim() === 'running';
          res.json({ 
            success: true, 
            running: isRunning,
            status: isRunning ? '运行中' : '已停止'
          });
        });
      });
    });

    conn.on('error', (err) => {
      res.status(500).json({ 
        success: false, 
        message: 'SSH连接失败', 
        error: err.message 
      });
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
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '状态检查失败', 
      error: error.message 
    });
  }
});

module.exports = router;
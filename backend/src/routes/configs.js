const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { getServer, executeRemoteCommand } = require('../utils/ssh');

const router = express.Router();

router.use(authMiddleware);

const checkAndFixNginxPid = () => {
  return new Promise((resolve, reject) => {
    const pidPaths = [
      '/run/nginx/nginx.pid',
      '/var/run/nginx/nginx.pid',
      '/var/run/nginx.pid',
      '/tmp/nginx.pid'
    ];
    
    let checkedPaths = 0;
    
    pidPaths.forEach(pidPath => {
      exec('cat ' + pidPath + ' 2>/dev/null', (error, stdout, stderr) => {
        checkedPaths++;
        
        if (!error && stdout.trim()) {
          const pid = parseInt(stdout.trim());
          exec('ps -p ' + pid + ' 2>/dev/null', (psError) => {
            if (!psError) {
              console.log('Valid nginx process found at PID:', pid);
              resolve(true);
              return;
            }
            
            console.log('PID file exists but process not running, removing:', pidPath);
            exec('rm -f ' + pidPath + ' 2>/dev/null');
            resolve(false);
          });
        } else if (checkedPaths === pidPaths.length) {
          console.log('No valid PID file found, nginx may not be running on host');
          resolve(false);
        }
      });
    });
  });
};

router.use((req, res, next) => {
  console.log('=== Configs route middleware ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('Params:', req.params);
  next();
});

const getConfigPath = () => {
  return process.env.NGINX_CONFIG_PATH || '/etc/nginx';
};

const getLogPath = () => {
  return process.env.NGINX_LOG_PATH || '/var/log/nginx';
};

const recordHistory = (configPath, action, operator, content, comment) => {
  try {
    if (!db) {
      console.error('Database is not available for recording history');
      return;
    }
    
    const enableHistory = db.prepare('SELECT value FROM settings WHERE key = ?').get('enable_history');
    console.log('recordHistory called:', { configPath, action, operator, enableHistory });
    if (enableHistory && enableHistory.value === '1') {
      db.prepare(
        'INSERT INTO config_history (config_path, action, operator, content, comment) VALUES (?, ?, ?, ?, ?)'
      ).run(configPath, action, operator, content, comment || '');
      console.log('History record saved successfully');
    } else {
      console.log('History recording is disabled or setting not found');
    }
  } catch (error) {
    console.error('Error recording history:', error);
  }
};

router.get('/', requirePermission('config:read'), async (req, res) => {
  const { serverId } = req.query;
  console.log(`[Configs API] GET /configs - serverId: ${serverId || 'null'}`);
  
  const server = getServer(serverId);

  if (server) {
    console.log(`[Configs API] 使用远程服务器 - ID: ${server.id}, 名称: ${server.name}, 主机: ${server.host}:${server.port}`);
    
    try {
      const configPath = server.nginx_config_path || '/etc/nginx';
      console.log(`[Configs API] 配置文件路径: ${configPath}`);
      const configs = [];

      const commands = [
        `find ${configPath} -maxdepth 1 -type f \\( -name "*.conf" -o -name "*.conf.disabled" -o -name "*.stream" -o -name "*.stream.disabled" \\) 2>/dev/null`,
        `find ${configPath}/conf.d -maxdepth 1 -type f \\( -name "*.conf" -o -name "*.conf.disabled" -o -name "*.stream" -o -name "*.stream.disabled" \\) 2>/dev/null`
      ];

      for (const cmd of commands) {
        try {
          console.log(`[Configs API] 执行命令: ${cmd}`);
          const { output } = await executeRemoteCommand(server, cmd);
          if (!output) {
            console.log(`[Configs API] 命令无输出: ${cmd}`);
            continue;
          }
          const lines = output.trim().split('\n').filter(line => line.trim());
          console.log(`[Configs API] 找到 ${lines.length} 个配置文件`);
          
          for (const filePath of lines) {
            try {
              console.log(`[Configs API] 获取文件信息: ${filePath}`);
              const { output: statOutput } = await executeRemoteCommand(server, `stat -c "%s %Y" ${filePath}`);
              if (!statOutput) {
                console.log(`[Configs API] stat命令无输出: ${filePath}`);
                continue;
              }
              const [size, timestamp] = statOutput.trim().split(' ');
              
              const fileName = path.basename(filePath);
              const isMainConfig = fileName === 'nginx.conf' || fileName === 'nginx.conf.disabled';
              
              configs.push({
                name: fileName,
                path: filePath,
                size: parseInt(size) || 0,
                lastModified: new Date(parseInt(timestamp) * 1000),
                enabled: !fileName.endsWith('.disabled'),
                type: isMainConfig ? 'main' : 'sub',
              });
            } catch (err) {
              console.log(`[Configs API] 处理文件失败: ${filePath}, 错误: ${err.message}`);
            }
          }
        } catch (err) {
          console.log(`[Configs API] 命令执行失败: ${cmd}, 错误: ${err.message}`);
        }
      }

      console.log(`[Configs API] ✓ 获取配置文件成功 - 总数: ${configs.length}`);
      res.json({ success: true, data: configs });
    } catch (error) {
      console.error(`[Configs API] ✗ 获取远程配置文件失败 - 错误: ${error.message}`);
      res.status(500).json({ success: false, message: '获取远程配置文件失败', error: error.message });
    }
  } else {
    console.log(`[Configs API] 使用本地服务器`);
    const configPath = getConfigPath();
    const configs = [];

    console.log(`[Configs API] 读取配置路径: ${configPath}`);

    try {
      if (!fs.existsSync(configPath)) {
        console.log(`[Configs API] 配置路径不存在: ${configPath}`);
        return res.json({ success: true, data: [] });
      }

      const files = fs.readdirSync(configPath);
      console.log(`[Configs API] 找到 ${files.length} 个文件`);
      
      files.forEach(file => {
        const filePath = path.join(configPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && (file.endsWith('.conf') || file.endsWith('.conf.disabled') || file.endsWith('.stream') || file.endsWith('.stream.disabled'))) {
          const isMainConfig = file === 'nginx.conf' || file === 'nginx.conf.disabled';
          configs.push({
            name: file,
            path: filePath,
            size: stats.size,
            lastModified: stats.mtime,
            enabled: !file.endsWith('.disabled'),
            type: isMainConfig ? 'main' : 'sub',
          });
        }
      });

      const confDir = path.join(configPath, 'conf.d');
      if (fs.existsSync(confDir)) {
        const confFiles = fs.readdirSync(confDir);
        confFiles.forEach(file => {
          const filePath = path.join(confDir, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile() && (file.endsWith('.conf') || file.endsWith('.conf.disabled') || file.endsWith('.stream') || file.endsWith('.stream.disabled'))) {
            configs.push({
              name: file,
              path: filePath,
              size: stats.size,
              lastModified: stats.mtime,
              enabled: !file.endsWith('.disabled'),
              type: 'sub',
            });
          }
        });
      }
    } catch (error) {
      console.error('Error reading configs:', error);
      res.status(500).json({ success: false, message: '读取配置文件失败', error: error.message });
      return;
    }

    res.json({ success: true, data: configs });
  }
});

router.get('/content', requirePermission('config:read'), async (req, res) => {
  const { path: configPath, serverId } = req.query;
  
  if (!configPath) {
    return res.status(400).json({ success: false, message: '缺少路径参数' });
  }

  const server = getServer(serverId);

  if (server) {
    try {
      const { output } = await executeRemoteCommand(server, `cat ${configPath}`);
      res.json({ success: true, data: { content: output || '' } });
    } catch (error) {
      console.error('Remote config read error:', error);
      res.status(500).json({ success: false, message: '读取远程配置文件失败', error: error.message });
    }
  } else {
    console.log('Reading config file:', configPath);
    
    try {
      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ success: false, message: '配置文件不存在' });
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      res.json({ success: true, data: { content } });
    } catch (error) {
      res.status(500).json({ success: false, message: '读取配置文件失败', error: error.message });
    }
  }
});

router.get('/:path(*)', requirePermission('config:read'), (req, res) => {
  let configPath = decodeURIComponent(req.params.path);
  
  if (!configPath.startsWith('/')) {
    configPath = '/' + configPath;
  }
  
  try {
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ success: false, message: '配置文件不存在' });
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    res.json({ success: true, data: { content } });
  } catch (error) {
    res.status(500).json({ success: false, message: '读取配置文件失败', error: error.message });
  }
});

router.post('/', requirePermission('config:write'), async (req, res) => {
  const { path: configPath, content, comment, serverId } = req.body;

  if (!configPath || !content) {
    return res.status(400).json({ success: false, message: '缺少必要字段' });
  }

  const server = getServer(serverId);

  if (server) {
    try {
      const dir = path.dirname(configPath);
      await executeRemoteCommand(server, `mkdir -p ${dir}`);
      await executeRemoteCommand(server, `cat > ${configPath} << 'EOF'\n${content}\nEOF`);
      res.status(201).json({
        success: true,
        data: {
          name: path.basename(configPath),
          path: configPath,
          size: content.length,
          lastModified: new Date(),
          enabled: true,
        }
      });
    } catch (error) {
      console.error('Remote config create error:', error);
      res.status(500).json({ success: false, message: '创建远程配置文件失败', error: error.message });
    }
  } else {
    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(configPath, content, 'utf-8');
      recordHistory(configPath, 'create', req.user.username, content, comment);

      const stats = fs.statSync(configPath);
      res.status(201).json({
        success: true,
        data: {
          name: path.basename(configPath),
          path: configPath,
          size: stats.size,
          lastModified: stats.mtime,
          enabled: true,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: '创建配置文件失败', error: error.message });
    }
  }
});

router.put('/:path(*)', requirePermission('config:write'), async (req, res) => {
  let configPath = decodeURIComponent(req.params.path);
  
  if (!configPath.startsWith('/')) {
    configPath = '/' + configPath;
  }
  
  const { content, comment, serverId } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: '缺少内容字段' });
  }

  const server = getServer(serverId);

  if (server) {
    try {
      await executeRemoteCommand(server, `cat > ${configPath} << 'EOF'\n${content}\nEOF`);
      res.json({
        success: true,
        data: {
          name: path.basename(configPath),
          path: configPath,
          size: content.length,
          lastModified: new Date(),
          enabled: true,
        }
      });
    } catch (error) {
      console.error('Remote config update error:', error);
      res.status(500).json({ success: false, message: '更新远程配置文件失败', error: error.message });
    }
  } else {
    try {
      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ success: false, message: '配置文件不存在' });
      }

      const oldContent = fs.readFileSync(configPath, 'utf-8');
      fs.writeFileSync(configPath, content, 'utf-8');
      recordHistory(configPath, 'update', req.user.username, oldContent, comment);

      const stats = fs.statSync(configPath);
      res.json({
        success: true,
        data: {
          name: path.basename(configPath),
          path: configPath,
          size: stats.size,
          lastModified: stats.mtime,
          enabled: true,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: '更新配置文件失败', error: error.message });
    }
  }
});

router.delete('/:path(*)', requirePermission('config:delete'), async (req, res) => {
  let configPath = decodeURIComponent(req.params.path);
  
  if (!configPath.startsWith('/')) {
    configPath = '/' + configPath;
  }

  const { serverId } = req.query;
  const server = getServer(serverId);

  if (server) {
    try {
      await executeRemoteCommand(server, `rm -f ${configPath}`);
      res.json({ success: true, data: { message: '删除成功' } });
    } catch (error) {
      console.error('Remote config delete error:', error);
      res.status(500).json({ success: false, message: '删除远程配置文件失败', error: error.message });
    }
  } else {
    console.log('Delete config:', configPath);

    try {
      if (!fs.existsSync(configPath)) {
        console.log('Config file not found:', configPath);
        return res.status(404).json({ success: false, message: '配置文件不存在' });
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      fs.unlinkSync(configPath);
      recordHistory(configPath, 'delete', req.user.username, content, '删除配置文件');

      console.log('Config deleted successfully:', configPath);
      res.json({ success: true, data: { message: '删除成功' } });
    } catch (error) {
      console.error('Error deleting config:', error);
      res.status(500).json({ success: false, message: '删除配置文件失败', error: error.message });
    }
  }
});

router.post('/validate', requirePermission('config:write'), async (req, res) => {
  const { content, serverId } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, message: '缺少内容字段' });
  }

  const server = getServer(serverId);

  if (server) {
    try {
      const configPath = server.nginx_config_path || '/etc/nginx';
      const tempConfigPath = `${configPath}/.temp_validate.conf`;
      
      console.log(`[Config Validate] Remote server: ${server.name}, Config path: ${configPath}`);
      
      try {
        const base64Content = Buffer.from(content).toString('base64');
        await executeRemoteCommand(server, `echo ${base64Content} | base64 -d | tee ${tempConfigPath} > /dev/null`);
        
        const { output, error } = await executeRemoteCommand(server, `nginx -t -c ${tempConfigPath} 2>&1`);
        
        await executeRemoteCommand(server, `rm -f ${tempConfigPath}`);
        
        const combinedOutput = (output || '') + (error || '');
        console.log(`[Config Validate] Nginx test output: ${combinedOutput}`);
        
        if (combinedOutput.includes('successful') || combinedOutput.includes('syntax is ok')) {
          return res.json({ success: true, data: { valid: true } });
        }

        res.json({ success: true, data: { valid: false, error: combinedOutput || '配置验证失败' } });
      } catch (error) {
        try {
          await executeRemoteCommand(server, `rm -f ${tempConfigPath}`);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        throw error;
      }
    } catch (error) {
      console.error('Remote config validate error:', error);
      res.status(500).json({ success: false, message: '验证失败', error: error.message });
    }
  } else {
    const configPath = getConfigPath();
    const tempConfigPath = path.join(configPath, '.temp_validate.conf');
    const tempIncludePath = path.join(configPath, '.temp_include.conf');
    
    try {
      const hasEvents = content.includes('events');
      const hasHttp = content.includes('http');
      const hasUpstream = content.includes('upstream');
      const hasServer = content.includes('server');
      
      console.log(`[Config Validate] Local server, hasEvents: ${hasEvents}, hasHttp: ${hasHttp}, hasUpstream: ${hasUpstream}, hasServer: ${hasServer}`);
      
      let configToValidate;
      if (hasEvents && hasHttp) {
        configToValidate = content;
      } else if (hasUpstream || hasServer) {
        fs.writeFileSync(tempIncludePath, content, 'utf-8');
        const baseConfig = `events {}
http {
    include ${tempIncludePath};
}`;
        configToValidate = baseConfig;
      } else if (hasHttp) {
        configToValidate = content;
      } else {
        fs.writeFileSync(tempIncludePath, content, 'utf-8');
        const baseConfig = `events {}
http {
    include ${tempIncludePath};
}`;
        configToValidate = baseConfig;
      }
      
      fs.writeFileSync(tempConfigPath, configToValidate, 'utf-8');

      exec(`nginx -t -c ${tempConfigPath} 2>&1`, (error, stdout, stderr) => {
        if (fs.existsSync(tempIncludePath)) {
          fs.unlinkSync(tempIncludePath);
        }
        if (fs.existsSync(tempConfigPath)) {
          fs.unlinkSync(tempConfigPath);
        }

        const output = stdout + stderr;
        console.log(`[Config Validate] Nginx test output: ${output}`);
        
        if (error) {
          return res.json({ success: true, data: { valid: false, error: output } });
        }

        if (output.includes('successful') || output.includes('syntax is ok')) {
          return res.json({ success: true, data: { valid: true } });
        }

        res.json({ success: true, data: { valid: false, error: output || '配置验证失败' } });
      });
    } catch (error) {
      console.error('Local config validate error:', error);
      if (fs.existsSync(tempIncludePath)) {
        fs.unlinkSync(tempIncludePath);
      }
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
      res.status(500).json({ success: false, message: '验证失败', error: error.message });
    }
  }
});

router.post('/apply', requirePermission('config:apply'), async (req, res) => {
  const { serverId } = req.body;
  const server = getServer(serverId);

  if (server) {
    try {
      const configPath = server.nginx_config_path || '/etc/nginx';
      
      console.log(`Applying nginx configuration to server ${server.name}...`);
      
      console.log('Step 1: Validating nginx configuration on remote server...');
      const { output, error } = await executeRemoteCommand(server, `nginx -t -c ${configPath}/nginx.conf 2>&1`);
      
      const outputStr = output || '';
      const errorStr = error || '';
      
      if (errorStr && !outputStr.includes('successful') && !outputStr.includes('syntax is ok')) {
        console.error('Nginx configuration test failed:', errorStr);
        return res.status(500).json({ 
          success: false,
          message: '配置验证失败，无法应用', 
          error: errorStr || outputStr 
        });
      }

      console.log('Step 2: Configuration test passed, attempting to reload nginx on remote server...');
      
      try {
        await executeRemoteCommand(server, 'nginx -s reload');
        console.log('Nginx reloaded successfully on remote server');
        res.json({ success: true, data: { message: '配置应用成功' } });
      } catch (reloadError) {
        console.error('Failed to reload nginx on remote server:', reloadError);
        
        if (reloadError.message.includes('invalid PID number') || 
            reloadError.message.includes('No such file or directory') || 
            reloadError.message.includes('process ID not found') || 
            reloadError.message.includes('not running')) {
          
          console.log('Step 3: Nginx reload failed, checking if nginx is running on remote server...');
          
          try {
            const { output: pgrepOutput } = await executeRemoteCommand(server, 'pgrep -x nginx');
            
            if (!pgrepOutput || !pgrepOutput.trim()) {
              console.log('Step 4: Nginx is not running on remote server, attempting to start...');
              await executeRemoteCommand(server, 'nginx');
              console.log('Nginx started successfully on remote server');
              res.json({ success: true, data: { message: 'nginx启动成功' } });
            } else {
              console.log('Step 4: Nginx is running on remote server but reload failed');
              console.log('Running PIDs:', pgrepOutput.trim());
              return res.status(500).json({ 
                success: false,
                message: 'nginx重载失败，请检查日志', 
                error: reloadError.message || 'nginx正在运行但重载失败' 
              });
            }
          } catch (pgrepError) {
            console.log('Step 4: Nginx is not running on remote server, attempting to start...');
            await executeRemoteCommand(server, 'nginx');
            console.log('Nginx started successfully on remote server');
            res.json({ success: true, data: { message: 'nginx启动成功' } });
          }
        } else {
          return res.status(500).json({ 
            success: false,
            message: '应用配置失败', 
            error: reloadError.message || '未知错误' 
          });
        }
      }
    } catch (error) {
      console.error('Error applying config on remote server:', error);
      res.status(500).json({ success: false, message: '应用配置失败', error: error.message });
    }
  } else {
    try {
      console.log('Applying nginx configuration to host...');
      
      const configPath = '/etc/nginx';
      
      console.log('Step 1: Validating nginx configuration on host...');
      exec(`nginx -t -c ${configPath}/nginx.conf`, (testError, testStdout, testStderr) => {
        if (testError) {
          console.error('Nginx configuration test failed:', testStderr);
          return res.status(500).json({ 
            success: false,
            message: '配置验证失败，无法应用', 
            error: testStderr || testError.message 
          });
        }

        console.log('Step 2: Configuration test passed, attempting to reload nginx on host...');
        
        exec('nginx -s reload', (error, stdout, stderr) => {
          if (error) {
            console.error('Failed to reload nginx on host:', error);
            console.error('stderr:', stderr);
            
            if (error.code === 1 || stderr.includes('invalid PID number') || stderr.includes('No such file or directory') || stderr.includes('process ID not found') || stderr.includes('not running')) {
              console.log('Step 3: Nginx reload failed, checking if nginx is running on host...');
              
              exec('pgrep -x nginx', (pgrepError, pgrepStdout) => {
                if (pgrepError || !pgrepStdout || !pgrepStdout.trim()) {
                  console.log('Step 4: Nginx is not running on host, attempting to start...');
                  exec('nginx', (startError, startStdout, startStderr) => {
                    if (startError) {
                      console.error('Failed to start nginx on host:', startStderr);
                      return res.status(500).json({ 
                        success: false,
                        message: 'nginx启动失败', 
                        error: startStderr || startError.message 
                      });
                    }
                    console.log('Nginx started successfully on host');
                    res.json({ success: true, data: { message: 'nginx启动成功' } });
                  });
                } else {
                  console.log('Step 4: Nginx is running on host but reload failed');
                  console.log('Running PIDs:', pgrepStdout.trim());
                  return res.status(500).json({ 
                    success: false,
                    message: 'nginx重载失败，请检查日志', 
                    error: stderr || error.message || 'nginx正在运行但重载失败' 
                  });
                }
              });
            } else {
              return res.status(500).json({ 
                success: false,
                message: '应用配置失败', 
                error: stderr || error.message || '未知错误' 
              });
            }
          }

          console.log('Nginx reloaded successfully on host');
          res.json({ success: true, data: { message: '配置应用成功' } });
        });
      });
    } catch (error) {
      console.error('Error applying config:', error);
      res.status(500).json({ success: false, message: '应用配置失败', error: error.message });
    }
  }
});

router.post('/:path(*)/disable', requirePermission('config:write'), async (req, res) => {
  let configPath = decodeURIComponent(req.params.path);
  
  if (!configPath.startsWith('/')) {
    configPath = '/' + configPath;
  }

  const { serverId } = req.body;
  const server = getServer(serverId);

  if (server) {
    try {
      console.log('Disabling remote config:', configPath);

      if (!configPath.endsWith('.conf') && !configPath.endsWith('.stream')) {
        return res.status(400).json({ success: false, message: '只能禁用 .conf 或 .stream 文件' });
      }

      const disabledPath = configPath + '.disabled';
      
      await executeRemoteCommand(server, `mv ${configPath} ${disabledPath}`);
      
      console.log('Remote config disabled successfully:', disabledPath);
      res.json({
        success: true,
        data: {
          name: path.basename(disabledPath),
          path: disabledPath,
          size: 0,
          lastModified: new Date(),
          enabled: false,
        }
      });
    } catch (error) {
      console.error('Error disabling remote config:', error);
      res.status(500).json({ success: false, message: '禁用远程配置文件失败', error: error.message });
    }
  } else {
    console.log('=== Disable route called ===');
    console.log('Original path param:', req.params.path);
    console.log('Decoded path:', configPath);
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);

    try {
      if (!fs.existsSync(configPath)) {
        console.log('Config file not found:', configPath);
        return res.status(404).json({ success: false, message: '配置文件不存在' });
      }

      if (!configPath.endsWith('.conf') && !configPath.endsWith('.stream')) {
        console.log('Invalid file extension:', configPath);
        return res.status(400).json({ success: false, message: '只能禁用 .conf 或 .stream 文件' });
      }

      const disabledPath = configPath + '.disabled';
      if (fs.existsSync(disabledPath)) {
        console.log('Config already disabled:', disabledPath);
        return res.status(400).json({ success: false, message: '配置文件已被禁用' });
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      fs.renameSync(configPath, disabledPath);
      recordHistory(configPath, 'disable', req.user.username, content, '禁用配置文件');

      const stats = fs.statSync(disabledPath);
      console.log('Config disabled successfully:', disabledPath);
      res.json({
        success: true,
        data: {
          name: path.basename(disabledPath),
          path: disabledPath,
          size: stats.size,
          lastModified: stats.mtime,
          enabled: false,
        }
      });
    } catch (error) {
      console.error('Error disabling config:', error);
      res.status(500).json({ success: false, message: '禁用配置文件失败', error: error.message });
    }
  }
});

router.post('/:path(*)/enable', requirePermission('config:write'), async (req, res) => {
  let configPath = decodeURIComponent(req.params.path);
  
  if (!configPath.startsWith('/')) {
    configPath = '/' + configPath;
  }

  const { serverId } = req.body;
  const server = getServer(serverId);

  if (server) {
    try {
      console.log('Enabling remote config:', configPath);

      if (!configPath.endsWith('.conf.disabled') && !configPath.endsWith('.stream.disabled')) {
        return res.status(400).json({ success: false, message: '只能启用 .conf.disabled 或 .stream.disabled 文件' });
      }

      const enabledPath = configPath.replace('.disabled', '');
      
      await executeRemoteCommand(server, `mv ${configPath} ${enabledPath}`);
      
      console.log('Remote config enabled successfully:', enabledPath);
      res.json({
        success: true,
        data: {
          name: path.basename(enabledPath),
          path: enabledPath,
          size: 0,
          lastModified: new Date(),
          enabled: true,
        }
      });
    } catch (error) {
      console.error('Error enabling remote config:', error);
      res.status(500).json({ success: false, message: '启用远程配置文件失败', error: error.message });
    }
  } else {
    console.log('Enable config:', configPath);

    try {
      if (!fs.existsSync(configPath)) {
        console.log('Config file not found:', configPath);
        return res.status(404).json({ success: false, message: '配置文件不存在' });
      }

      if (!configPath.endsWith('.conf.disabled') && !configPath.endsWith('.stream.disabled')) {
        console.log('Invalid file extension:', configPath);
        return res.status(400).json({ success: false, message: '只能启用 .conf.disabled 或 .stream.disabled 文件' });
      }

      const enabledPath = configPath.replace('.disabled', '');
      if (fs.existsSync(enabledPath)) {
        console.log('Enabled config already exists:', enabledPath);
        return res.status(400).json({ success: false, message: '已存在同名的启用配置文件' });
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      fs.renameSync(configPath, enabledPath);
      recordHistory(configPath, 'enable', req.user.username, content, '启用配置文件');

      const stats = fs.statSync(enabledPath);
      console.log('Config enabled successfully:', enabledPath);
      res.json({
        success: true,
        data: {
          name: path.basename(enabledPath),
          path: enabledPath,
          size: stats.size,
          lastModified: stats.mtime,
          enabled: true,
        }
      });
    } catch (error) {
      console.error('Error enabling config:', error);
      res.status(500).json({ success: false, message: '启用配置文件失败', error: error.message });
    }
  }
});

module.exports = router;

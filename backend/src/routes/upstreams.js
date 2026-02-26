const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const glob = require('glob');
const { Client } = require('ssh2');

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
  if (!serverId) return null;
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  if (server && server.is_default) {
    return null;
  }
  return server;
};

const getConfigPath = () => {
  return process.env.NGINX_CONFIG_PATH || '/etc/nginx';
};

const parseUpstreams = async (server = null) => {
  const configPath = server ? (server.nginx_config_path || '/etc/nginx') : getConfigPath();
  const upstreams = [];

  try {
    const nginxConfPath = path.join(configPath, 'nginx.conf');
    console.log('Checking nginx.conf path:', nginxConfPath);
    
    let mainContent;
    if (server) {
      try {
        const { output } = await executeRemoteCommand(server, `cat ${nginxConfPath}`);
        mainContent = output;
      } catch (error) {
        console.log('Failed to read remote nginx.conf:', error.message);
        return upstreams;
      }
    } else {
      if (!fs.existsSync(nginxConfPath)) {
        console.log('nginx.conf does not exist:', nginxConfPath);
        return upstreams;
      }
      mainContent = fs.readFileSync(nginxConfPath, 'utf-8');
    }
    
    console.log('nginx.conf content length:', mainContent.length);
    
    const includePattern = /include\s+([^\s;]+);?/g;
    let match;
    const includedFiles = [];
    
    while ((match = includePattern.exec(mainContent)) !== null) {
      let includePath = match[1];
      if (!path.isAbsolute(includePath)) {
        includePath = path.join(configPath, includePath);
      }
      console.log('Found include pattern:', includePath);
      
      if (includePath.includes('*')) {
        console.log('Expanding wildcard pattern:', includePath);
        let expandedFiles;
        if (server) {
          try {
            const { output } = await executeRemoteCommand(server, `find ${includePath.substring(0, includePath.lastIndexOf('/'))} -maxdepth 1 -type f -name "${includePath.substring(includePath.lastIndexOf('/') + 1)}" 2>/dev/null`);
            expandedFiles = output.trim().split('\n').filter(f => f);
          } catch (error) {
            console.log('Failed to expand wildcard on remote:', error.message);
            expandedFiles = [];
          }
        } else {
          expandedFiles = glob.sync(includePath);
        }
        console.log('Expanded files:', expandedFiles);
        includedFiles.push(...expandedFiles);
      } else {
        includedFiles.push(includePath);
      }
    }

    const filesToCheck = [nginxConfPath, ...includedFiles];
    console.log('Files to check:', filesToCheck);
    
    for (const filePath of filesToCheck) {
      let content;
      
      if (server) {
        try {
          const { output } = await executeRemoteCommand(server, `cat ${filePath}`);
          content = output;
        } catch (error) {
          console.log('Failed to read remote file:', filePath, error.message);
          continue;
        }
      } else {
        if (!fs.existsSync(filePath)) {
          console.log('File does not exist, skipping:', filePath);
          continue;
        }
        content = fs.readFileSync(filePath, 'utf-8');
      }
      
      console.log('Parsing file:', filePath, 'content length:', content.length);
      
      const upstreamPattern = /upstream\s+([^\s{]+)\s*\{([^}]+)\}/g;
      let upstreamMatch;
      let matchCount = 0;

      while ((upstreamMatch = upstreamPattern.exec(content)) !== null) {
        matchCount++;
        const upstreamName = upstreamMatch[1].replace(/['"]/g, '');
        const upstreamBlock = upstreamMatch[2];
        console.log('Found upstream #' + matchCount + ':', upstreamName);
        console.log('Upstream block preview:', upstreamBlock.substring(0, 200));
        
        const servers = [];
        
        const lines = upstreamBlock.split('\n');
        
        const serverPattern = /server\s+([^\s;]+)(?:\s+([^;]*))?;?/;
        let serverCount = 0;
        
        let lbMethod = 'round_robin';
        let keepalive = null;

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          const isComment = trimmedLine.startsWith('#');
          
          if (!isComment) {
            const lbMethodPattern = /(least_conn|least_time|ip_hash|hash|random)/;
            const lbMethodMatch = line.match(lbMethodPattern);
            if (lbMethodMatch) {
              lbMethod = lbMethodMatch[1];
            }
            
            const keepalivePattern = /keepalive\s+(\d+)/;
            const keepaliveMatch = line.match(keepalivePattern);
            if (keepaliveMatch) {
              keepalive = parseInt(keepaliveMatch[1]);
            }
          }
          
          const serverMatch = line.match(serverPattern);
          
          if (serverMatch) {
            serverCount++;
            const serverAddr = serverMatch[1];
            const serverParams = serverMatch[2] || '';
            console.log('  Server #' + serverCount + ':', serverAddr, 'params:', serverParams, 'commented:', isComment);
            
            const params = {};
            const paramPattern = /(\w+)=([^\s]+)/g;
            let paramMatch;
            
            while ((paramMatch = paramPattern.exec(serverParams)) !== null) {
              params[paramMatch[1]] = paramMatch[2];
            }
            
            const hasBackup = serverParams.includes('backup');
            const hasDown = serverParams.includes('down');

            servers.push({
              address: serverAddr,
              weight: params.weight ? parseInt(params.weight) : 1,
              max_fails: params.max_fails ? parseInt(params.max_fails) : null,
              fail_timeout: params.fail_timeout || null,
              backup: hasBackup,
              down: isComment || hasDown,
              max_conns: params.max_conns ? parseInt(params.max_conns) : null,
            });
          }
        }

        console.log('  Load balancing method:', lbMethod);
        console.log('  Keepalive:', keepalive);

        upstreams.push({
          name: upstreamName,
          file: filePath,
          loadBalancingMethod: lbMethod,
          keepalive,
          servers,
          serverCount: servers.length,
          activeServers: servers.filter(s => !s.down && !s.backup).length,
          backupServers: servers.filter(s => s.backup).length,
          downServers: servers.filter(s => s.down).length,
        });
        
        console.log('  Parsed upstream:', upstreamName, 'total servers:', servers.length);
      }
      
      if (matchCount === 0) {
        console.log('No upstreams found in file:', filePath);
        console.log('File content preview:', content.substring(0, 500));
      }
    }
    
    console.log('Total upstreams found:', upstreams.length);
  } catch (error) {
    console.error('Error parsing upstreams:', error);
  }

  return upstreams;
};

router.get('/', requirePermission('config:read'), (req, res) => {
  try {
    const upstreams = parseUpstreams();
    res.json({ success: true, data: upstreams });
  } catch (error) {
    console.error('Error getting upstreams:', error);
    res.status(500).json({ success: false, message: '获取 upstream 列表失败', error: error.message });
  }
});

router.get('/stats', requirePermission('config:read'), async (req, res) => {
  try {
    const { serverId } = req.query;
    const server = getServer(serverId);
    
    const upstreams = await parseUpstreams(server);
    
    const stats = upstreams.map(upstream => ({
      name: upstream.name,
      file: upstream.file,
      totalServers: upstream.serverCount,
      activeServers: upstream.activeServers,
      backupServers: upstream.backupServers,
      downServers: upstream.downServers,
      loadBalancingMethod: upstream.loadBalancingMethod,
      keepalive: upstream.keepalive,
      servers: upstream.servers.map(server => ({
        address: server.address,
        weight: server.weight,
        status: server.down ? 'down' : (server.backup ? 'backup' : 'active'),
        max_fails: server.max_fails,
        fail_timeout: server.fail_timeout,
        max_conns: server.max_conns,
      })),
    }));

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting upstream stats:', error);
    res.status(500).json({ success: false, message: '获取 upstream 统计失败', error: error.message });
  }
});

module.exports = router;

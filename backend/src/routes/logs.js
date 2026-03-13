const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { getServer, executeRemoteCommand } = require('../utils/ssh');

const router = express.Router();

router.use(authMiddleware);

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
      
      if (!output) {
        console.log('No output from log files command');
        logFiles = [];
      } else {
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
      }
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

  console.log(`[Logs API] GET /logs/access - serverId: ${serverId || 'null'}, file: ${logFile}, lines: ${lines}, keyword: ${keyword || 'none'}`);

  try {
    let content = '';
    let totalLines = 0;
    let allLogLines = [];
    let stats = { success: 0, error: 0, redirect: 0, statusCodes: {}, methods: {} };
    const apiStartTime = Date.now();

    if (server) {
      console.log(`[Logs API] 使用远程服务器 - ID: ${server.id}, 名称: ${server.name}, 主机: ${server.host}:${server.port}`);
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const accessLogPath = `${logPath}/${logFile}`;
      console.log(`[Logs API] 远程日志路径: ${accessLogPath}`);
      
      const readStartTime = Date.now();
      const linesToRead = keyword && keyword.trim() ? Math.min(10000, lines * 2) : Math.min(5000, lines * 2);
      console.log(`[Logs API] 开始读取日志 - 行数: ${linesToRead}`);
      
      const { output } = await executeRemoteCommand(server, `test -f ${accessLogPath} && tail -n ${linesToRead} ${accessLogPath}`);
      content = output || '';
      allLogLines = content ? content.trim().split('\n').filter(line => line.trim()) : [];
      
      const readElapsedTime = Date.now() - readStartTime;
      console.log(`[Logs API] ✓ 日志读取完成 - 耗时: ${readElapsedTime}ms, 行数: ${allLogLines.length}`);
      
      const countStartTime = Date.now();
      const { output: countOutput } = await executeRemoteCommand(server, `wc -l ${accessLogPath} 2>/dev/null || echo "0"`);
      totalLines = parseInt(countOutput.trim()) || 0;
      const countElapsedTime = Date.now() - countStartTime;
      console.log(`[Logs API] ✓ 日志总数统计完成 - 耗时: ${countElapsedTime}ms, 总行数: ${totalLines}`);
      
      const parseStartTime = Date.now();
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
      
      const parseElapsedTime = Date.now() - parseStartTime;
      console.log(`[Logs API] ✓ 日志解析完成 - 耗时: ${parseElapsedTime}ms`);
    } else {
      console.log(`[Logs API] 使用本地服务器`);
      const logPath = getLogPath();
      const accessLogPath = path.join(logPath, logFile);

      if (!fs.existsSync(accessLogPath)) {
        console.log(`[Logs API] 日志文件不存在: ${accessLogPath}`);
        return res.json({ logs: '', total: 0, filteredTotal: 0, stats });
      }

      const readStartTime = Date.now();
      const fileContent = fs.readFileSync(accessLogPath, 'utf-8');
      totalLines = fileContent.split('\n').filter(line => line.trim()).length;
      allLogLines = await readLogLines(accessLogPath, 10000, false);
      
      const readElapsedTime = Date.now() - readStartTime;
      console.log(`[Logs API] ✓ 日志读取完成 - 耗时: ${readElapsedTime}ms, 总行数: ${totalLines}, 读取行数: ${allLogLines.length}`);
      
      const parseStartTime = Date.now();
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
      
      const parseElapsedTime = Date.now() - parseStartTime;
      console.log(`[Logs API] ✓ 日志解析完成 - 耗时: ${parseElapsedTime}ms`);
    }

    const logLines = allLogLines;

    let filteredLogs = logLines;
    if (keyword && keyword.trim()) {
      const keywords = keyword.trim().toLowerCase().split(/\s+/);
      filteredLogs = logLines.filter(line => {
        const lowerLine = line.toLowerCase();
        return keywords.every(kw => lowerLine.includes(kw));
      });
    }

    const lastLines = filteredLogs.slice(-lines);
    
    const totalElapsedTime = Date.now() - apiStartTime;
    console.log(`[Logs API] ✓ 访问日志获取完成 - 总耗时: ${totalElapsedTime}ms, 返回行数: ${lastLines.length}`);
    
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
    console.error(`[Logs API] ✗ 访问日志获取失败 - 错误: ${error.message}`);
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

  console.log(`[Logs API] GET /logs/error - serverId: ${serverId || 'null'}, file: ${logFile}, lines: ${lines}, keyword: ${keyword || 'none'}`);

  try {
    let content = '';
    let totalLines = 0;
    let stats = { total: 0, error: 0, warn: 0, info: 0 };
    const apiStartTime = Date.now();

    if (server) {
      console.log(`[Logs API] 使用远程服务器 - ID: ${server.id}, 名称: ${server.name}, 主机: ${server.host}:${server.port}`);
      const logPath = server.nginx_log_path || '/var/log/nginx';
      const errorLogPath = `${logPath}/${logFile}`;
      console.log(`[Logs API] 远程日志路径: ${errorLogPath}`);
      
      const readStartTime = Date.now();
      const linesToRead = Math.min(5000, lines * 2);
      console.log(`[Logs API] 开始读取日志 - 行数: ${linesToRead}`);
      
      const { output } = await executeRemoteCommand(server, `test -f ${errorLogPath} && tail -n ${linesToRead} ${errorLogPath}`);
      content = output || '';
      
      const readElapsedTime = Date.now() - readStartTime;
      console.log(`[Logs API] ✓ 日志读取完成 - 耗时: ${readElapsedTime}ms, 内容长度: ${content.length} bytes`);
      
      const countStartTime = Date.now();
      const { output: countOutput } = await executeRemoteCommand(server, `wc -l ${errorLogPath} 2>/dev/null || echo "0"`);
      totalLines = parseInt(countOutput.trim()) || 0;
      const countElapsedTime = Date.now() - countStartTime;
      console.log(`[Logs API] ✓ 日志总数统计完成 - 耗时: ${countElapsedTime}ms, 总行数: ${totalLines}`);
      
      const parseStartTime = Date.now();
      const logLines = content.split('\n').filter(line => line.trim());
      
      logLines.forEach(line => {
        const match = line.match(/\[(error|warn|info|debug)\]/);
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
      
      const parseElapsedTime = Date.now() - parseStartTime;
      console.log(`[Logs API] ✓ 日志解析完成 - 耗时: ${parseElapsedTime}ms`);
    } else {
      console.log(`[Logs API] 使用本地服务器`);
      const logPath = getLogPath();
      const errorLogPath = path.join(logPath, logFile);

      if (!fs.existsSync(errorLogPath)) {
        console.log(`[Logs API] 日志文件不存在: ${errorLogPath}`);
        return res.json({ success: true, data: { logs: '', total: 0, filteredTotal: 0, stats } });
      }

      const readStartTime = Date.now();
      const linesToRead = Math.min(5000, lines * 2);
      console.log(`[Logs API] 开始读取日志 - 行数: ${linesToRead}`);
      
      const fileContent = fs.readFileSync(errorLogPath, 'utf-8');
      totalLines = fileContent.split('\n').filter(line => line.trim()).length;
      const allLogLines = await readLogLines(errorLogPath, linesToRead, false);
      
      const readElapsedTime = Date.now() - readStartTime;
      console.log(`[Logs API] ✓ 日志读取完成 - 耗时: ${readElapsedTime}ms, 总行数: ${totalLines}, 读取行数: ${allLogLines.length}`);
      
      const parseStartTime = Date.now();
      allLogLines.forEach(line => {
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
      
      const parseElapsedTime = Date.now() - parseStartTime;
      console.log(`[Logs API] ✓ 日志解析完成 - 耗时: ${parseElapsedTime}ms`);
    }

    const logLines = content ? content.split('\n').filter(line => line.trim()) : [];

    let filteredLogs = logLines;
    if (keyword && keyword.trim()) {
      const keywords = keyword.trim().toLowerCase().split(/\s+/);
      filteredLogs = logLines.filter(line => {
        const lowerLine = line.toLowerCase();
        return keywords.every(kw => lowerLine.includes(kw));
      });
    }

    const lastLines = filteredLogs.slice(-lines);
    
    const totalElapsedTime = Date.now() - apiStartTime;
    console.log(`[Logs API] ✓ 错误日志获取完成 - 总耗时: ${totalElapsedTime}ms, 返回行数: ${lastLines.length}`);
    
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
    console.error(`[Logs API] ✗ 错误日志获取失败 - 错误: ${error.message}`);
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

router.get('/access-stats', requirePermission('log:read'), async (req, res) => {
  const { serverId } = req.query;
  const server = getServer(serverId);

  console.log(`[Logs API] GET /logs/access-stats - serverId: ${serverId || 'null'}`);

  try {
    let totalRequests = 0;
    let stats = { success: 0, error: 0, redirect: 0, statusCodes: {}, methods: {} };
    const apiStartTime = Date.now();

    if (server) {
      console.log(`[Logs API] 使用远程服务器 - ID: ${server.id}, 名称: ${server.name}, 主机: ${server.host}:${server.port}`);
      const logPath = server.nginx_log_path || '/var/log/nginx';
      
      const findStartTime = Date.now();
      const { output } = await executeRemoteCommand(server, `find ${logPath} -maxdepth 1 -type f -name "*access.log"`);
      const findElapsedTime = Date.now() - findStartTime;
      console.log(`[Logs API] ✓ 查找access日志文件完成 - 耗时: ${findElapsedTime}ms`);

      if (!output) {
        console.log('[Logs API] 未找到access日志文件');
        return res.json({
          success: true,
          data: {
            total: 0,
            stats: { success: 0, error: 0, redirect: 0, statusCodes: {}, methods: {} }
          }
        });
      }

      const logFiles = output.trim().split('\n').filter(line => line.trim());
      console.log(`[Logs API] 找到 ${logFiles.length} 个access日志文件`);

      const statsStartTime = Date.now();
      
      const { output: totalOutput } = await executeRemoteCommand(server, `cat ${logPath}/*access.log 2>/dev/null | wc -l || echo "0"`);
      totalRequests = parseInt(totalOutput.trim()) || 0;
      console.log(`[Logs API] ✓ 总行数统计完成 - 总请求数: ${totalRequests}`);

      for (const logFile of logFiles) {
        try {
          const { output: sampleOutput } = await executeRemoteCommand(server, `tail -n 1000 ${logFile} 2>/dev/null || echo ""`);
          const sampleLines = sampleOutput.split('\n').filter(line => line.trim());

          sampleLines.forEach(line => {
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
        } catch (error) {
          console.error(`[Logs API] 处理文件 ${logFile} 失败:`, error.message);
        }
      }

      const statsElapsedTime = Date.now() - statsStartTime;
      console.log(`[Logs API] ✓ 统计完成 - 耗时: ${statsElapsedTime}ms, 总请求数: ${totalRequests}`);
    } else {
      console.log(`[Logs API] 使用本地服务器`);
      const logPath = getLogPath();

      const findStartTime = Date.now();
      const files = fs.readdirSync(logPath);
      const accessLogFiles = files.filter(file => file.endsWith('access.log'));
      const findElapsedTime = Date.now() - findStartTime;
      console.log(`[Logs API] ✓ 查找access日志文件完成 - 耗时: ${findElapsedTime}ms, 找到 ${accessLogFiles.length} 个文件`);

      const statsStartTime = Date.now();
      
      const { execSync } = require('child_process');
      try {
        const totalOutput = execSync(`cat ${logPath}/*access.log 2>/dev/null | wc -l || echo "0"`, { encoding: 'utf-8' });
        totalRequests = parseInt(totalOutput.trim()) || 0;
        console.log(`[Logs API] ✓ 总行数统计完成 - 总请求数: ${totalRequests}`);
      } catch (error) {
        console.error(`[Logs API] 统计总行数失败:`, error.message);
      }

      for (const fileName of accessLogFiles) {
        const filePath = path.join(logPath, fileName);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());

          const sampleLines = lines.slice(-1000);
          sampleLines.forEach(line => {
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
        } catch (error) {
          console.error(`[Logs API] 处理文件 ${filePath} 失败:`, error.message);
        }
      }

      const statsElapsedTime = Date.now() - statsStartTime;
      console.log(`[Logs API] ✓ 统计完成 - 耗时: ${statsElapsedTime}ms, 总请求数: ${totalRequests}`);
    }

    const totalElapsedTime = Date.now() - apiStartTime;
    console.log(`[Logs API] ✓ 访问日志统计完成 - 总耗时: ${totalElapsedTime}ms`);

    res.json({
      success: true,
      data: {
        total: totalRequests,
        stats
      }
    });
  } catch (error) {
    console.error(`[Logs API] ✗ 访问日志统计失败 - 错误: ${error.message}`);
    res.json({
      success: true,
      data: {
        total: 0,
        stats: { success: 0, error: 0, redirect: 0, statusCodes: {}, methods: {} }
      }
    });
  }
});

router.get('/traffic', requirePermission('log:read'), async (req, res) => {
  const { serverId } = req.query;
  const server = getServer(serverId);
  
  const hoursToAnalyze = parseInt(req.query.hours) || 24;
  const now = new Date();
  const startTime = new Date(now.getTime() - hoursToAnalyze * 60 * 60 * 1000);

  console.log(`[Traffic API] GET /logs/traffic - serverId: ${serverId || 'null'}, hours: ${hoursToAnalyze}`);
  console.log(`[Traffic API] 分析时间范围: ${startTime.toISOString()} 到 ${now.toISOString()}`);

  try {
    let totalBytes = 0;
    let requestCount = 0;
    const apiStartTime = Date.now();

    if (server) {
      console.log(`[Traffic API] 使用远程服务器 - ID: ${server.id}, 名称: ${server.name}, 主机: ${server.host}:${server.port}`);
      const logPath = server.nginx_log_path || '/var/log/nginx';
      
      const findStartTime = Date.now();
      const { output } = await executeRemoteCommand(server, `find ${logPath} -maxdepth 1 -type f -name "*access.log"`);
      const findElapsedTime = Date.now() - findStartTime;
      console.log(`[Traffic API] ✓ 查找access日志文件完成 - 耗时: ${findElapsedTime}ms`);

      if (!output) {
        console.log('[Traffic API] 未找到access日志文件');
        return res.json({
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

      const logFiles = output.trim().split('\n').filter(line => line.trim());
      console.log(`[Traffic API] 找到 ${logFiles.length} 个access日志文件`);

      const statsStartTime = Date.now();
      const maxLines = Math.min(50000, hoursToAnalyze * 2000);
      console.log(`[Traffic API] 开始读取日志 - 每个文件最大行数: ${maxLines}`);

      const { output: allContent } = await executeRemoteCommand(server, `cat ${logPath}/*access.log 2>/dev/null | tail -n ${maxLines * logFiles.length} || echo ""`);
      const logLines = allContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      logLines.forEach((line) => {
            const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+)(?: "([^"]*)"(?: "([^"]*)")?)?/;
            const match = line.match(regex);
            
            if (match) {
              const timeStr = match[2];
              const time = parseLogDateTime(timeStr);
              
              if (time && time >= startTime) {
                requestCount++;
                
                const bytes = parseInt(match[7]);
                if (!isNaN(bytes)) {
                  totalBytes += bytes;
                }
              }
            }
          });

      const statsElapsedTime = Date.now() - statsStartTime;
      console.log(`[Traffic API] ✓ 日志解析完成 - 耗时: ${statsElapsedTime}ms`);
    } else {
      console.log(`[Traffic API] 使用本地服务器`);
      const logPath = getLogPath();
      
      const findStartTime = Date.now();
      const files = fs.readdirSync(logPath);
      const accessLogFiles = files.filter(file => file.endsWith('access.log'));
      const findElapsedTime = Date.now() - findStartTime;
      console.log(`[Traffic API] ✓ 查找access日志文件完成 - 耗时: ${findElapsedTime}ms, 找到 ${accessLogFiles.length} 个文件`);

      const statsStartTime = Date.now();
      const maxLines = Math.min(50000, hoursToAnalyze * 2000);
      console.log(`[Traffic API] 开始读取日志 - 每个文件最大行数: ${maxLines}`);

      const { execSync } = require('child_process');
      let allContent = '';
      try {
        allContent = execSync(`cat ${logPath}/*access.log 2>/dev/null | tail -n ${maxLines * accessLogFiles.length} || echo ""`, { encoding: 'utf-8' });
      } catch (error) {
        console.error(`[Traffic API] 读取日志失败:`, error.message);
      }

      const logLines = allContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      logLines.forEach((line) => {
            const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+)(?: "([^"]*)"(?: "([^"]*)")?)?/;
            const match = line.match(regex);
            
            if (match) {
              const timeStr = match[2];
              const time = parseLogDateTime(timeStr);
              
              if (time && time >= startTime) {
                requestCount++;
                
                const bytes = parseInt(match[7]);
                if (!isNaN(bytes)) {
                  totalBytes += bytes;
                }
              }
            }
          });

      const statsElapsedTime = Date.now() - statsStartTime;
      console.log(`[Traffic API] ✓ 日志解析完成 - 耗时: ${statsElapsedTime}ms`);
    }

    const avgBytes = requestCount > 0 ? Math.round(totalBytes / requestCount) : 0;
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    const totalElapsedTime = Date.now() - apiStartTime;
    console.log(`[Traffic API] ✓ 流量统计完成 - 总耗时: ${totalElapsedTime}ms, 请求数: ${requestCount}, 总流量: ${totalMB}MB`);

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
    const elapsedTime = Date.now();
    console.error(`[Traffic API] ✗ 流量统计失败 - 耗时: ${elapsedTime}ms, 错误: ${error.message}`);
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
  const match = timeStr.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})(?: ([+-]\d{4}))?/);
  if (!match) return null;

  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  const [, day, monthStr, year, hour, minute, second, timezone] = match;
  const month = months[monthStr];
  if (month === undefined) return null;

  const date = new Date(year, month, day, hour, minute, second);
  
  if (timezone) {
    const tzMatch = timezone.match(/([+-])(\d{2})(\d{2})/);
    if (tzMatch) {
      const sign = tzMatch[1] === '+' ? -1 : 1;
      const tzHours = parseInt(tzMatch[2]);
      const tzMinutes = parseInt(tzMatch[3]);
      date.setHours(date.getHours() + sign * tzHours);
      date.setMinutes(date.getMinutes() + sign * tzMinutes);
    }
  }
  
  return date;
}

module.exports = router;

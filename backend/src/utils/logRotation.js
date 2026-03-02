const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const LOG_ROTATION_CONFIG = {
  maxSize: '100M',
  maxAge: '30d',
  rotate: 10,
  compress: true,
  dateformat: '-%Y%m%d',
};

const createLogrotateConfig = (logPath, config = LOG_ROTATION_CONFIG) => {
  const logDir = path.dirname(logPath);
  const logName = path.basename(logPath);
  
  const configContent = `
${logPath} {
    daily
    rotate ${config.rotate}
    compress
    delaycompress
    missingok
    notifempty
    size ${config.maxSize}
    maxage ${config.maxAge}
    dateext
    dateformat ${config.dateformat}
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 $(cat /var/run/nginx.pid)
        fi
    endscript
}
`;

  return configContent;
};

const setupLogrotate = async (logPath, config = LOG_ROTATION_CONFIG) => {
  try {
    const logDir = path.dirname(logPath);
    const configDir = '/etc/logrotate.d';
    
    const configContent = createLogrotateConfig(logPath, config);
    const configFileName = `nginx-admin-${path.basename(logPath)}`;
    const configFilePath = path.join(configDir, configFileName);
    
    const { stdout, stderr } = await execAsync(`sudo bash -c 'echo "${configContent}" > ${configFilePath}'`);
    
    if (stderr) {
      console.error('Error setting up logrotate:', stderr);
    }
    
    return { success: true, configPath: configFilePath };
  } catch (error) {
    console.error('Failed to setup logrotate:', error);
    return { success: false, error: error.message };
  }
};

const rotateLog = async (logPath) => {
  try {
    if (!fs.existsSync(logPath)) {
      return { success: false, error: 'Log file does not exist' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${logPath}.${timestamp}`;
    
    fs.renameSync(logPath, rotatedPath);
    
    fs.writeFileSync(logPath, '');
    
    return { success: true, rotatedPath, timestamp };
  } catch (error) {
    console.error('Failed to rotate log:', error);
    return { success: false, error: error.message };
  }
};

const compressLog = async (logPath) => {
  try {
    if (!fs.existsSync(logPath)) {
      return { success: false, error: 'Log file does not exist' };
    }

    const compressedPath = `${logPath}.gz`;
    
    await execAsync(`gzip -c "${logPath}" > "${compressedPath}"`);
    
    const stats = fs.statSync(compressedPath);
    const originalStats = fs.statSync(logPath);
    const compressionRatio = ((1 - stats.size / originalStats.size) * 100).toFixed(2);
    
    return { 
      success: true, 
      compressedPath, 
      originalSize: originalStats.size,
      compressedSize: stats.size,
      compressionRatio 
    };
  } catch (error) {
    console.error('Failed to compress log:', error);
    return { success: false, error: error.message };
  }
};

const getRotatedLogs = async (logPath) => {
  try {
    const logDir = path.dirname(logPath);
    const logName = path.basename(logPath);
    const files = fs.readdirSync(logDir);
    
    const rotatedLogs = files
      .filter(file => file.startsWith(logName) && file !== logName)
      .map(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          isCompressed: file.endsWith('.gz'),
        };
      })
      .sort((a, b) => b.modified - a.modified);
    
    return { success: true, logs: rotatedLogs };
  } catch (error) {
    console.error('Failed to get rotated logs:', error);
    return { success: false, error: error.message };
  }
};

const cleanupOldLogs = async (logPath, maxAgeDays = 30) => {
  try {
    const { success, logs } = await getRotatedLogs(logPath);
    
    if (!success) {
      return { success: false, error: 'Failed to get rotated logs' };
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    const deletedLogs = [];
    
    for (const log of logs) {
      if (log.modified < cutoffDate) {
        fs.unlinkSync(log.path);
        deletedLogs.push(log);
      }
    }
    
    return { success: true, deletedCount: deletedLogs.length, deletedLogs };
  } catch (error) {
    console.error('Failed to cleanup old logs:', error);
    return { success: false, error: error.message };
  }
};

const getLogSize = (logPath) => {
  try {
    if (!fs.existsSync(logPath)) {
      return { success: false, size: 0 };
    }
    
    const stats = fs.statSync(logPath);
    return { success: true, size: stats.size, sizeMB: (stats.size / (1024 * 1024)).toFixed(2) };
  } catch (error) {
    console.error('Failed to get log size:', error);
    return { success: false, size: 0, error: error.message };
  }
};

const shouldRotate = (logPath, maxSizeMB = 100) => {
  const { success, size } = getLogSize(logPath);
  
  if (!success) {
    return false;
  }
  
  const sizeMB = size / (1024 * 1024);
  return sizeMB >= maxSizeMB;
};

const reloadNginx = async () => {
  try {
    const { stdout, stderr } = await execAsync('sudo nginx -s reload');
    
    if (stderr) {
      console.error('Error reloading nginx:', stderr);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to reload nginx:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  createLogrotateConfig,
  setupLogrotate,
  rotateLog,
  compressLog,
  getRotatedLogs,
  cleanupOldLogs,
  getLogSize,
  shouldRotate,
  reloadNginx,
  LOG_ROTATION_CONFIG,
};

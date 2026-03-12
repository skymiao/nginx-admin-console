require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { initDatabase } = require('./database');
const { createServersTable, insertDefaultServer } = require('./migrations/createServersTable');
const { migrate: addLastLoginAt } = require('./migrations/addLastLoginAt');
const { migrate: createStatsTable } = require('./migrations/createStatsTable');
const { migrate: addNginxStatusUrl } = require('./migrations/addNginxStatusUrl');
const { addSudoSupport } = require('./migrations/addSudoSupport');
const { updateRolePermissions } = require('./migrations/updateRolePermissions');
const { updateDefaultServerStatusUrl } = require('./migrations/updateDefaultServerStatusUrl');
const { updateRolePermissions: updateRolePermissions2 } = require('./migrations/updateRolePermissions2');
const addIndexes = require('./migrations/addIndexes');
const { addIsLocalColumn } = require('./migrations/addIsLocalField');
const { createServerLogFormatsTable, insertDefaultFormats } = require('./migrations/createServerLogFormats');
const { migrate: addSettingPermissions } = require('./migrations/addSettingPermissions');
const { migrate: fixLogFormatsDuplicates } = require('./migrations/fixLogFormatsDuplicates');
const addPerformanceIndexes = require('./migrations/addPerformanceIndexes');
const { migrate: addLogFormatIdToServers } = require('./migrations/addLogFormatIdToServers');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { getCorsConfig } = require('./utils/corsConfig');
const { closeAllPools } = require('./utils/sshPool');

const app = express();
const PORT = process.env.PORT || 5000;

initDatabase();
createServersTable();
insertDefaultServer();
addLastLoginAt();
createStatsTable();
addNginxStatusUrl();
addSudoSupport();
updateRolePermissions();
updateDefaultServerStatusUrl();
updateRolePermissions2();
addIndexes();
addIsLocalColumn();
createServerLogFormatsTable();
insertDefaultFormats();
fixLogFormatsDuplicates();
addSettingPermissions();
addPerformanceIndexes();
addLogFormatIdToServers();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' },
}));

app.use(cors(getCorsConfig()));

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024,
  level: 6,
}));

app.use('/api', apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
console.log('Registering /api/configs route...');
app.use('/api/configs', (req, res, next) => {
  console.log('=== /api/configs request received ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Full path:', req.path);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  console.log('Headers:', req.headers);
  next();
}, require('./routes/configs'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/log-statistics', require('./routes/log-statistics'));
// app.use('/api/log-rotation', require('./routes/log-rotation'));
app.use('/api/history', require('./routes/history'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/log-formats', require('./routes/log-formats'));
app.use('/api/nginx', require('./routes/nginx'));
app.use('/api/upstreams', require('./routes/upstreams'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/servers', require('./routes/servers-crud'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api', require('./routes/api-info'));

app.get('/health', (req, res) => {
  const timestamp = new Date().toISOString();
  res.status(200).json({ 
    success: true, 
    data: { 
      status: 'ok', 
      timestamp: timestamp 
    } 
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use(errorHandler);

const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    await closeAllPools();
    console.log('All SSH pools closed');
  } catch (error) {
    console.error('Error closing SSH pools:', error);
  }
  
  console.log('Graceful shutdown completed');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Nginx Config Path: ${process.env.NGINX_CONFIG_PATH}`);
  console.log(`Nginx Log Path: ${process.env.NGINX_LOG_PATH}`);
});

module.exports = app;

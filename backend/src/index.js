require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDatabase } = require('./database');
const { createServersTable, insertDefaultServer } = require('./migrations/createServersTable');
const { migrate: addLastLoginAt } = require('./migrations/addLastLoginAt');
const { migrate: createStatsTable } = require('./migrations/createStatsTable');
const { migrate: addNginxStatusUrl } = require('./migrations/addNginxStatusUrl');
const { addSudoSupport } = require('./migrations/addSudoSupport');
const { updateRolePermissions } = require('./migrations/updateRolePermissions');
const { updateDefaultServerStatusUrl } = require('./migrations/updateDefaultServerStatusUrl');
const { updateRolePermissions: updateRolePermissions2 } = require('./migrations/updateRolePermissions2');

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

app.use(helmet());
app.use(cors());
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
app.use('/api/history', require('./routes/history'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/nginx', require('./routes/nginx'));
app.use('/api/upstreams', require('./routes/upstreams'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/servers', require('./routes/servers-crud'));
app.use('/api/stats', require('./routes/stats'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: '服务器内部错误', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Nginx Config Path: ${process.env.NGINX_CONFIG_PATH}`);
  console.log(`Nginx Log Path: ${process.env.NGINX_LOG_PATH}`);
});

module.exports = app;

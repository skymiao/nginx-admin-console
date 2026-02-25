const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || '/tmp/nginx-admin.db';

console.log('Database path:', dbPath);

const dbDir = path.dirname(dbPath);
console.log('Database directory:', dbDir);

try {
  if (!fs.existsSync(dbDir)) {
    console.log('Creating database directory:', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log('Database directory exists or created successfully');
} catch (error) {
  console.error('Error creating database directory:', error);
  throw error;
}

let db;
try {
  console.log('Opening database...');
  db = new Database(dbPath);
  console.log('Database opened successfully');
} catch (error) {
  console.error('Error opening database:', error);
  throw error;
}

db.pragma('journal_mode = WAL');

const initDatabase = () => {
  console.log('Initializing database...');
  
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        status INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        permissions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS config_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_path TEXT NOT NULL,
        action TEXT NOT NULL,
        operator TEXT NOT NULL,
        content TEXT,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS nginx_stats_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        active_connections INTEGER DEFAULT 0,
        accepts INTEGER DEFAULT 0,
        handled INTEGER DEFAULT 0,
        requests INTEGER DEFAULT 0,
        reading INTEGER DEFAULT 0,
        writing INTEGER DEFAULT 0,
        waiting INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_config_history_path ON config_history(config_path);
      CREATE INDEX IF NOT EXISTS idx_config_history_created ON config_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_nginx_stats_history_server ON nginx_stats_history(server_id);
      CREATE INDEX IF NOT EXISTS idx_nginx_stats_history_timestamp ON nginx_stats_history(timestamp);
    `);
    console.log('Database tables created successfully');

    const defaultRoles = [
      {
        name: 'admin',
        description: '管理员',
        permissions: JSON.stringify([
          'config:read', 'config:write', 'config:delete', 'config:apply',
          'upstream:read', 'upstream:manage',
          'log:read', 'log:statistics',
          'history:read', 'history:restore', 'stats:read',
          'user:manage', 'role:manage',
          'server:read', 'server:manage',
          'system:manage',
          'setting:read', 'setting:manage'
        ])
      },
      {
        name: 'developer',
        description: '开发者',
        permissions: JSON.stringify([
          'config:read', 'config:write', 'config:apply',
          'upstream:read', 'upstream:manage',
          'log:read', 'log:statistics',
          'history:read', 'stats:read',
          'server:read',
          'setting:read'
        ])
      },
      {
        name: 'viewer',
        description: '查看者',
        permissions: JSON.stringify([
          'config:read',
          'upstream:read',
          'log:read', 'log:statistics',
          'history:read', 'stats:read',
          'server:read',
          'setting:read'
        ])
      }
    ];

    console.log('Inserting default roles...');
    const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)');
    defaultRoles.forEach(role => {
      insertRole.run(role.name, role.description, role.permissions);
    });
    console.log('Default roles inserted successfully');

    const defaultSettings = [
      { key: 'nginx_config_path', value: process.env.NGINX_CONFIG_PATH || '/etc/nginx' },
      { key: 'nginx_log_path', value: process.env.NGINX_LOG_PATH || '/var/log/nginx' },
      { key: 'max_log_lines', value: '1000' },
      { key: 'auto_refresh_interval', value: '5' },
      { key: 'enable_history', value: '1' },
      { key: 'history_retention_days', value: '30' },
      { key: 'nginx_status_url', value: 'http://localhost/nginx_status' },
      { key: 'rate_limit_auth', value: JSON.stringify({ windowMs: 15 * 60 * 1000, max: 5 }) },
      { key: 'rate_limit_api', value: JSON.stringify({ windowMs: 15 * 60 * 1000, max: 100 }) },
      { key: 'rate_limit_strict', value: JSON.stringify({ windowMs: 60 * 60 * 1000, max: 10 }) },
    ];

    console.log('Inserting default settings...');
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    defaultSettings.forEach(setting => {
      insertSetting.run(setting.key, setting.value);
    });
    console.log('Default settings inserted successfully');

    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
    if (adminExists.count === 0) {
      console.log('Creating default admin user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      console.log('Hashed password length:', hashedPassword.length);
      console.log('Hashed password:', hashedPassword.substring(0, 50) + '...');
      db.prepare('INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)')
        .run('admin', 'admin@example.com', hashedPassword, 'admin', 1);
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = { db, initDatabase };

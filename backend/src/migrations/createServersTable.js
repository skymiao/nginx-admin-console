const { db } = require('../database');

const createServersTable = () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      username TEXT NOT NULL,
      password TEXT,
      private_key TEXT,
      description TEXT,
      nginx_config_path TEXT DEFAULT '/etc/nginx',
      nginx_log_path TEXT DEFAULT '/var/log/nginx',
      nginx_status_url TEXT DEFAULT 'http://localhost/nginx_status',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.exec(createTableSQL);
  console.log('Servers table created successfully');
};

const insertDefaultServer = () => {
  const checkDefault = db.prepare('SELECT COUNT(*) as count FROM servers WHERE is_default = 1').get();
  
  if (checkDefault.count === 0) {
    const insertSQL = `
      INSERT INTO servers (name, host, port, username, password, description, nginx_config_path, nginx_log_path, nginx_status_url, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    db.prepare(insertSQL).run(
      '本地服务器',
      'localhost',
      22,
      process.env.USER || 'root',
      null,
      '本地nginx服务器',
      '/etc/nginx',
      '/var/log/nginx',
      'http://localhost/nginx_status'
    );
    
    console.log('Default server inserted successfully');
  }
};

module.exports = {
  createServersTable,
  insertDefaultServer
};
const { db } = require('../database');

const migrate = () => {
  console.log('Running migration: Create nginx_stats_history table...');
  
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS nginx_stats_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        active_connections INTEGER NOT NULL,
        accepts INTEGER NOT NULL,
        handled INTEGER NOT NULL,
        requests INTEGER NOT NULL,
        reading INTEGER NOT NULL,
        writing INTEGER NOT NULL,
        waiting INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_nginx_stats_server ON nginx_stats_history(server_id);
      CREATE INDEX IF NOT EXISTS idx_nginx_stats_timestamp ON nginx_stats_history(timestamp);
    `);
    
    console.log('nginx_stats_history table created successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

module.exports = { migrate };

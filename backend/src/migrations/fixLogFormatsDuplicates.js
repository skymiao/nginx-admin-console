const { db } = require('../database');

const migrate = () => {
  console.log('Running migration: Fix server_log_formats table to prevent duplicates...');
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='server_log_formats'
    `).get();
    
    if (!tableExists) {
      console.log('Table server_log_formats does not exist, skipping...');
      db.exec('ROLLBACK');
      return;
    }
    
    const tableInfo = db.prepare('PRAGMA table_info(server_log_formats)').all();
    const hasServerIpColumn = tableInfo.some(column => column.name === 'server_ip');
    const hasServerIpsColumn = tableInfo.some(column => column.name === 'server_ips');
    
    if (!hasServerIpColumn && !hasServerIpsColumn) {
      console.log('Neither server_ip nor server_ips column exists, skipping...');
      db.exec('ROLLBACK');
      return;
    }
    
    if (hasServerIpsColumn) {
      console.log('Table already uses server_ips column, skipping duplicate fix...');
      db.exec('ROLLBACK');
      return;
    }
    
    const hasUniqueConstraint = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='server_log_formats'
    `).get();
    
    if (hasUniqueConstraint && hasUniqueConstraint.sql.includes('UNIQUE (server_ip, format_name)')) {
      console.log('Unique constraint already exists, skipping...');
      db.exec('ROLLBACK');
      return;
    }
    
    console.log('Creating new table with unique constraint...');
    
    db.exec(`
      CREATE TABLE server_log_formats_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE,
        server_ip TEXT NOT NULL,
        format_name TEXT NOT NULL,
        format_pattern TEXT NOT NULL,
        field_mapping TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
        UNIQUE (server_ip, format_name)
      );
    `);
    
    console.log('Copying data to new table...');
    
    db.exec(`
      INSERT INTO server_log_formats_new 
      SELECT * FROM server_log_formats
      WHERE id IN (
        SELECT MIN(id) FROM server_log_formats 
        GROUP BY server_ip, format_name
      )
    `);
    
    const copiedCount = db.prepare('SELECT COUNT(*) as count FROM server_log_formats_new').get();
    console.log(`Copied ${copiedCount.count} records to new table`);
    
    console.log('Dropping old table...');
    db.exec('DROP TABLE server_log_formats');
    
    console.log('Renaming new table...');
    db.exec('ALTER TABLE server_log_formats_new RENAME TO server_log_formats');
    
    db.exec('CREATE INDEX IF NOT EXISTS idx_server_log_formats_server_id ON server_log_formats(server_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_server_log_formats_server_ip ON server_log_formats(server_ip)');
    
    db.exec('COMMIT');
    
    console.log('Migration completed successfully');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error fixing server_log_formats table:', error);
    throw error;
  }
};

module.exports = { migrate };

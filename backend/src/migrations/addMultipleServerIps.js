const { db } = require('../database');

const migrate = () => {
  console.log('Running migration: Support multiple server IPs for log formats...');
  
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
    const hasServerIpsColumn = tableInfo.some(column => column.name === 'server_ips');
    
    if (hasServerIpsColumn) {
      console.log('Column server_ips already exists, skipping...');
      db.exec('ROLLBACK');
      return;
    }
    
    console.log('Adding server_ips column...');
    db.prepare('ALTER TABLE server_log_formats ADD COLUMN server_ips TEXT').run();
    
    console.log('Migrating existing data...');
    const formats = db.prepare('SELECT id, server_ip FROM server_log_formats').all();
    
    formats.forEach(format => {
      const ips = [format.server_ip];
      db.prepare('UPDATE server_log_formats SET server_ips = ? WHERE id = ?')
        .run(JSON.stringify(ips), format.id);
    });
    
    console.log(`Migrated ${formats.length} records`);
    
    console.log('Creating new table without server_ip column...');
    db.exec(`
      CREATE TABLE server_log_formats_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE,
        server_ips TEXT NOT NULL,
        format_name TEXT NOT NULL,
        format_pattern TEXT NOT NULL,
        field_mapping TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
        UNIQUE (format_name)
      );
    `);
    
    console.log('Copying data to new table...');
    db.exec(`
      INSERT INTO server_log_formats_new 
      SELECT id, server_id, server_ips, format_name, format_pattern, field_mapping, description, is_active, created_at, updated_at
      FROM server_log_formats
    `);
    
    const copiedCount = db.prepare('SELECT COUNT(*) as count FROM server_log_formats_new').get();
    console.log(`Copied ${copiedCount.count} records to new table`);
    
    console.log('Dropping old table...');
    db.exec('DROP TABLE server_log_formats');
    
    console.log('Renaming new table...');
    db.exec('ALTER TABLE server_log_formats_new RENAME TO server_log_formats');
    
    db.exec('CREATE INDEX IF NOT EXISTS idx_server_log_formats_server_id ON server_log_formats(server_id)');
    
    db.exec('COMMIT');
    
    console.log('Migration completed successfully');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error migrating server_log_formats table:', error);
    throw error;
  }
};

module.exports = { migrate };

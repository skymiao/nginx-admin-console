const { db } = require('../database');

const migrate = () => {
  console.log('Running migration: Add log_format_id column to servers table...');
  
  try {
    const tableInfo = db.prepare('PRAGMA table_info(servers)').all();
    const hasLogFormatId = tableInfo.some(column => column.name === 'log_format_id');
    
    if (!hasLogFormatId) {
      console.log('Adding log_format_id column...');
      db.prepare('ALTER TABLE servers ADD COLUMN log_format_id INTEGER REFERENCES server_log_formats(id) ON DELETE SET NULL').run();
      console.log('log_format_id column added successfully');
    } else {
      console.log('log_format_id column already exists, skipping...');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

module.exports = { migrate };

const { db } = require('../database');

const migrate = () => {
  console.log('Running migration: Add nginx_status_url column to servers table...');
  
  try {
    const tableInfo = db.prepare('PRAGMA table_info(servers)').all();
    const hasNginxStatusUrl = tableInfo.some(column => column.name === 'nginx_status_url');
    
    if (!hasNginxStatusUrl) {
      console.log('Adding nginx_status_url column...');
      db.prepare('ALTER TABLE servers ADD COLUMN nginx_status_url TEXT DEFAULT "http://localhost/nginx_status"').run();
      console.log('nginx_status_url column added successfully');
    } else {
      console.log('nginx_status_url column already exists, skipping...');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

module.exports = { migrate };

const { db } = require('../database');

const migrate = () => {
  console.log('Running migration: Add last_login_at column to users table...');
  
  try {
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const hasLastLoginAt = tableInfo.some(column => column.name === 'last_login_at');
    
    if (!hasLastLoginAt) {
      console.log('Adding last_login_at column...');
      db.prepare('ALTER TABLE users ADD COLUMN last_login_at DATETIME').run();
      console.log('last_login_at column added successfully');
    } else {
      console.log('last_login_at column already exists, skipping...');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

module.exports = { migrate };

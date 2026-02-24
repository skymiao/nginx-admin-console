const { db } = require('../database');

const addIsLocalColumn = () => {
  try {
    db.exec("ALTER TABLE servers ADD COLUMN is_local INTEGER DEFAULT 0");
    console.log('Added is_local column to servers table');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('is_local column already exists');
    } else {
      throw error;
    }
  }
};

module.exports = { addIsLocalColumn };

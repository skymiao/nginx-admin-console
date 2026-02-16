const { db } = require('../database');

const addSudoSupport = () => {
  try {
    db.exec(`
      ALTER TABLE servers ADD COLUMN use_sudo INTEGER DEFAULT 0
    `);
    console.log('Sudo support added to servers table');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('Column use_sudo already exists');
    } else {
      console.error('Error adding sudo support:', error);
    }
  }
};

module.exports = {
  addSudoSupport
};

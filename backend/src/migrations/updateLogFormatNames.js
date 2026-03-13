const { db } = require('../database');

const updateLogFormatNames = () => {
  console.log('Running migration: Update log format names to full names...');

  const formatNameMapping = {
    'nginx_default': 'Nginx Default Log Format',
    'combined_vhost': 'Combined with Virtual Host',
    'common': 'Common Log Format',
    'json': 'JSON Format',
    'custom_app': 'Custom App Log Format'
  };

  const stmt = db.prepare(`
    UPDATE server_log_formats 
    SET format_name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE format_name = ?
  `);

  Object.entries(formatNameMapping).forEach(([oldName, newName]) => {
    try {
      const result = stmt.run(newName, oldName);
      console.log(`✓ Updated format: ${oldName} -> ${newName}, changes: ${result.changes}`);
    } catch (error) {
      console.error(`✗ Failed to update format ${oldName}:`, error.message);
    }
  });

  console.log('Log format names update completed');
};

module.exports = { updateLogFormatNames };

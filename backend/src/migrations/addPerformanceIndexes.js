const { db } = require('../database');

module.exports = () => {
  console.log('Adding performance indexes...');

  try {
    db.exec('BEGIN TRANSACTION');

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_config_history_path_created ON config_history(config_path, created_at DESC);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nginx_stats_history_server_timestamp ON nginx_stats_history(server_id, timestamp DESC);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_servers_is_default_created ON servers(is_default, created_at DESC);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_servers_created_at ON servers(created_at DESC);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_server_log_formats_is_active ON server_log_formats(is_active);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_server_log_formats_format_name ON server_log_formats(format_name);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_status_created ON users(status, created_at DESC);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at DESC);
    `);

    db.exec('COMMIT');

    console.log('Performance indexes added successfully');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error adding performance indexes:', error);
    throw error;
  }
};

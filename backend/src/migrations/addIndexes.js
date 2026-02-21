const { db } = require('../database');

module.exports = () => {
  console.log('Adding indexes...');

  try {
    db.exec('BEGIN TRANSACTION');

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_servers_host ON servers(host);
      CREATE INDEX IF NOT EXISTS idx_servers_is_default ON servers(is_default);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_config_history_config_path ON config_history(config_path);
      CREATE INDEX IF NOT EXISTS idx_config_history_action ON config_history(action);
      CREATE INDEX IF NOT EXISTS idx_config_history_operator ON config_history(operator);
      CREATE INDEX IF NOT EXISTS idx_config_history_created_at ON config_history(created_at);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nginx_stats_server ON nginx_stats_history(server_id);
      CREATE INDEX IF NOT EXISTS idx_nginx_stats_timestamp ON nginx_stats_history(timestamp);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    `);

    db.exec('COMMIT');

    console.log('Indexes added successfully');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error adding indexes:', error);
    throw error;
  }
};

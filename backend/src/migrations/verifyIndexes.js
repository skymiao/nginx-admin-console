const { db } = require('../database');

module.exports = () => {
  console.log('Verifying performance indexes...');

  try {
    const indexes = db.prepare(`
      SELECT name, tbl_name 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name LIKE 'idx_%'
      ORDER BY tbl_name, name
    `).all();

    console.log('Current indexes:');
    console.log('='.repeat(80));
    
    const tableIndexes = {};
    indexes.forEach(index => {
      if (!tableIndexes[index.tbl_name]) {
        tableIndexes[index.tbl_name] = [];
      }
      tableIndexes[index.tbl_name].push(index.name);
    });

    Object.keys(tableIndexes).sort().forEach(tableName => {
      console.log(`\n${tableName}:`);
      tableIndexes[tableName].forEach(indexName => {
        console.log(`  - ${indexName}`);
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total indexes: ${indexes.length}`);

    const expectedIndexes = [
      'idx_users_username',
      'idx_users_email',
      'idx_users_role',
      'idx_users_created_at',
      'idx_users_status_created',
      'idx_users_last_login',
      'idx_servers_host',
      'idx_servers_is_default',
      'idx_servers_is_default_created',
      'idx_servers_created_at',
      'idx_config_history_config_path',
      'idx_config_history_action',
      'idx_config_history_operator',
      'idx_config_history_created_at',
      'idx_config_history_path_created',
      'idx_nginx_stats_server',
      'idx_nginx_stats_timestamp',
      'idx_nginx_stats_history_server_timestamp',
      'idx_roles_name',
      'idx_server_log_formats_enabled',
      'idx_server_log_formats_format_name',
      'idx_settings_updated_at',
    ];

    console.log('\nExpected indexes:');
    console.log('='.repeat(80));
    expectedIndexes.forEach(indexName => {
      const exists = indexes.some(idx => idx.name === indexName);
      const status = exists ? '✓' : '✗';
      console.log(`${status} ${indexName}`);
    });

    const missingIndexes = expectedIndexes.filter(indexName => 
      !indexes.some(idx => idx.name === indexName)
    );

    if (missingIndexes.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('Missing indexes:');
      missingIndexes.forEach(indexName => {
        console.log(`  - ${indexName}`);
      });
    } else {
      console.log('\n' + '='.repeat(80));
      console.log('All expected indexes are present!');
    }

    console.log('Index verification completed');
  } catch (error) {
    console.error('Error verifying indexes:', error);
    throw error;
  }
};

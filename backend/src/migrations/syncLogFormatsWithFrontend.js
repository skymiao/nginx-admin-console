const { db } = require('../database');

const syncLogFormatsWithFrontend = () => {
  console.log('Running migration: Sync log formats with frontend definitions...');

  const formats = [
    {
      format_name: 'nginx_default',
      format_pattern: '^\\s*(\\S+)\\s*-\\s*(\\S+)\\s*\\[([^\\]]+)\\]\\s*"([^"]+)"\\s*(\\d{3})\\s*(\\d+)(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*\\(([^)]+)\\))?(?:\\s*@\\s*\\S+(?:\\s*\\S+)*)?\\s*$',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: 'Nginx默认日志格式（Combined Log Format）'
    },
    {
      format_name: 'combined_vhost',
      format_pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([A-Z]+) ([^"]+) ([^"]+)" (\\d{3}) (\\d+) "([^"]*)" "([^"]*)"$',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: '包含虚拟主机的组合日志格式'
    },
    {
      format_name: 'common',
      format_pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([^"]+)" (\\d{3}) (\\d+)$',
      field_mapping: '["ip","time","method","path","protocol","status","size"]',
      description: 'Apache通用日志格式'
    },
    {
      format_name: 'json',
      format_pattern: '^\\{.*\\}$',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: 'JSON格式日志'
    },
    {
      format_name: 'custom_app',
      format_pattern: '^(\\d{1,3}(?:\\.\\d{1,3}){3})\\s+-\\s+ruser:\\[[^\\]]*\\]\\s+-\\s+\\[([^\\]]+)\\]\\s+-\\s+request:\\[([A-Z]+)\\s+(\\S+)\\s+([^\\]]+)\\]\\s+-\\s+channel:\\[[^\\]]*\\]\\s+-\\s+reqId:\\[[^\\]]*\\]\\s+-\\s+routeName:\\[[^\\]]*\\]\\s+-\\s+jsessionId:\\[[^\\]]*\\]\\s+-\\s+logToken:\\[[^\\]]*\\]\\s+-\\s+timestamp:\\[[^\\]]*\\]\\s+-\\s+platId:\\[[^\\]]*\\]\\s+-\\s+http_status:\\[(\\d{3})\\]\\s+-\\s+body_bytes_sent:\\[(\\d+)\\]\\s+-\\s+http_referer:\\[(.*?)\\]\\s+-\\s+http_user_agent:\\[([^\\]]*)\\]',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: '自定义应用日志格式'
    }
  ];

  const stmt = db.prepare(`
    UPDATE server_log_formats 
    SET format_pattern = ?, field_mapping = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE format_name = ?
  `);

  formats.forEach(format => {
    try {
      const result = stmt.run(format.format_pattern, format.field_mapping, format.description, format.format_name);
      console.log(`✓ Updated format: ${format.format_name}, changes: ${result.changes}`);
    } catch (error) {
      console.error(`✗ Failed to update format ${format.format_name}:`, error.message);
    }
  });

  console.log('Log formats sync completed');
};

module.exports = { syncLogFormatsWithFrontend };

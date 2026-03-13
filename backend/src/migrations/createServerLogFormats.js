const { db } = require('../database');

const createServerLogFormatsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS server_log_formats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER UNIQUE,
      server_ips TEXT NOT NULL,
      format_name TEXT NOT NULL,
      format_pattern TEXT NOT NULL,
      field_mapping TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      UNIQUE (format_name)
    );
  `;
  
  db.exec(sql);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_server_log_formats_server_id ON server_log_formats(server_id)');
  
  console.log('Created server_log_formats table');
};

const insertDefaultFormats = () => {
  const formats = [
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'Nginx Default Log Format',
      format_pattern: '^\\s*(\\S+)\\s*-\\s*(\\S+)\\s*\\[([^\\]]+)\\]\\s*"([^"]+)"\\s*(\\d{3})\\s*(\\d+)(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*\\(([^)]+)\\))?(?:\\s*@\\s*\\S+(?:\\s*\\S+)*)?\\s*$',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: 'Nginx默认日志格式（Combined Log Format）'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'Combined with Virtual Host',
      format_pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([A-Z]+) ([^"]+) ([^"]+)" (\\d{3}) (\\d+) "([^"]*)" "([^"]*)"$',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: '包含虚拟主机的组合日志格式'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'Common Log Format',
      format_pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([^"]+)" (\\d{3}) (\\d+)$',
      field_mapping: '["ip","time","method","path","protocol","status","size"]',
      description: 'Apache通用日志格式'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'JSON Format',
      format_pattern: '^\\{.*\\}$',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: 'JSON格式日志'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'Custom App Log Format',
      format_pattern: '^(\\d{1,3}(?:\\.\\d{1,3}){3})\\s+-\\s+ruser:\\[[^\\]]*\\]\\s+-\\s+\\[([^\\]]+)\\]\\s+-\\s+request:\\[([A-Z]+)\\s+(\\S+)\\s+([^\\]]+)\\]\\s+-\\s+channel:\\[[^\\]]*\\]\\s+-\\s+reqId:\\[[^\\]]*\\]\\s+-\\s+routeName:\\[[^\\]]*\\]\\s+-\\s+jsessionId:\\[[^\\]]*\\]\\s+-\\s+logToken:\\[[^\\]]*\\]\\s+-\\s+timestamp:\\[[^\\]]*\\]\\s+-\\s+platId:\\[[^\\]]*\\]\\s+-\\s+http_status:\\[(\\d{3})\\]\\s+-\\s+body_bytes_sent:\\[(\\d+)\\]\\s+-\\s+http_referer:\\[(.*?)\\]\\s+-\\s+http_user_agent:\\[([^\\]]*)\\]',
      field_mapping: '["ip","time","method","path","protocol","status","size","referer","userAgent"]',
      description: '自定义应用日志格式'
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO server_log_formats 
    (server_id, server_ips, format_name, format_pattern, field_mapping, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  formats.forEach(format => {
    stmt.run(format.server_id, format.server_ips, format.format_name, format.format_pattern, format.field_mapping, format.description);
  });

  console.log('Inserted default log formats');
};

module.exports = { createServerLogFormatsTable, insertDefaultFormats };

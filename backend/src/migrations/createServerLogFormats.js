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
      format_name: 'nginx_default',
      format_pattern: '^\\s*(\\S+)\\s*-\\s*(\\S+)\\s*\\[([^\\]]+)\\]\\s*"([^"]+)"\\s*(\\d{3})\\s*(\\d+)(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*\\(([^)]+)\\))?(?:\\s*@\\s*\\S+(?:\\s*\\S+)*)?\\s*$',
      field_mapping: '{"ip":1,"time":3,"method":4,"path":4,"protocol":4,"status":5,"size":6,"referer":7,"userAgent":8}',
      description: 'Nginx默认日志格式（Combined Log Format）'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'combined_vhost',
      format_pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([A-Z]+) ([^"]+) ([^"]+)" (\\d{3}) (\\d+) "([^"]*)" "([^"]*)"$',
      field_mapping: '{"ip":1,"time":2,"method":3,"path":4,"protocol":5,"status":6,"size":7,"referer":8,"userAgent":9}',
      description: '包含虚拟主机的组合日志格式'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'common',
      format_pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([^"]+)" (\\d{3}) (\\d+)$',
      field_mapping: '{"ip":1,"time":2,"method":3,"path":3,"protocol":3,"status":4,"size":5}',
      description: 'Apache通用日志格式'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'json',
      format_pattern: '^\\{.*\\}$',
      field_mapping: '{"ip":"ip","time":"time","method":"method","path":"path","protocol":"protocol","status":"status","size":"size","referer":"referer","userAgent":"userAgent"}',
      description: 'JSON格式日志'
    },
    {
      server_id: null,
      server_ips: JSON.stringify(['default']),
      format_name: 'custom_app',
      format_pattern: '^(\\d{1,3}(?:\\.\\d{1,3}){3})\\s+-\\s+ruser:\\[[^\\]]*\\]\\s+-\\s+\\[([^\\]]+)\\]\\s+-\\s+request:\\[([A-Z]+)\\s+(\\S+)\\s+([^\\]]+)\\]\\s+-\\s+channel:\\[[^\\]]*\\]\\s+-\\s+reqId:\\[[^\\]]*\\]\\s+-\\s+routeName:\\[[^\\]]*\\]\\s+-\\s+jsessionId:\\[[^\\]]*\\]\\s+-\\s+logToken:\\[[^\\]]*\\]\\s+-\\s+timestamp:\\[[^\\]]*\\]\\s+-\\s+platId:\\[[^\\]]*\\]\\s+-\\s+http_status:\\[(\\d{3})\\]\\s+-\\s+body_bytes_sent:\\[(\\d+)\\]\\s+-\\s+http_referer:\\[(.*?)\\]\\s+-\\s+http_user_agent:\\[([^\\]]*)\\]',
      field_mapping: '{"ip":1,"time":2,"method":3,"path":4,"protocol":5,"status":6,"size":7,"referer":8,"userAgent":9}',
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

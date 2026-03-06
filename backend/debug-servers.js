const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data/nginx-admin.db');
const db = new Database(dbPath);

console.log('Database path:', dbPath);
console.log('');

console.log('=== Servers in database ===');
const servers = db.prepare('SELECT * FROM servers').all();
console.log(`Total servers: ${servers.length}`);
console.log('');

servers.forEach((server, index) => {
  console.log(`Server ${index + 1}:`);
  console.log(`  ID: ${server.id}`);
  console.log(`  Name: ${server.name}`);
  console.log(`  Host: ${server.host}`);
  console.log(`  Port: ${server.port}`);
  console.log(`  Username: ${server.username}`);
  console.log(`  Password (encrypted): ${server.password ? server.password.substring(0, 50) + '...' : 'null'}`);
  console.log(`  Private Key (encrypted): ${server.private_key ? server.private_key.substring(0, 50) + '...' : 'null'}`);
  console.log(`  is_default: ${server.is_default}`);
  console.log(`  nginx_config_path: ${server.nginx_config_path}`);
  console.log(`  nginx_log_path: ${server.nginx_log_path}`);
  console.log(`  nginx_status_url: ${server.nginx_status_url}`);
  console.log(`  use_sudo: ${server.use_sudo}`);
  console.log('');
});

db.close();

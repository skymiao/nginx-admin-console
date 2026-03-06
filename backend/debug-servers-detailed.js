const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data/nginx-admin.db');
const db = new Database(dbPath);

console.log('Database path:', dbPath);
console.log('');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      console.log('Invalid encrypted format');
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.log('Decryption failed:', error.message);
    return encryptedText;
  }
};

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
  console.log(`  Password (decrypted): ${server.password ? decrypt(server.password) : 'null'}`);
  console.log(`  Private Key (encrypted): ${server.private_key ? server.private_key.substring(0, 50) + '...' : 'null'}`);
  console.log(`  Private Key (decrypted): ${server.private_key ? decrypt(server.private_key).substring(0, 50) + '...' : 'null'}`);
  console.log(`  Description: ${server.description || 'null'}`);
  console.log(`  is_default: ${server.is_default}`);
  console.log(`  nginx_config_path: ${server.nginx_config_path}`);
  console.log(`  nginx_log_path: ${server.nginx_log_path}`);
  console.log(`  nginx_status_url: ${server.nginx_status_url}`);
  console.log(`  use_sudo: ${server.use_sudo}`);
  console.log(`  created_at: ${server.created_at}`);
  console.log(`  updated_at: ${server.updated_at}`);
  console.log('');
});

db.close();
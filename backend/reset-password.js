const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || '/tmp/nginx-admin.db';

console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  console.log('Database opened successfully');

  const hashedPassword = bcrypt.hashSync('admin123', 10);
  console.log('New hashed password length:', hashedPassword.length);

  const update = db.prepare('UPDATE users SET password = ? WHERE username = ?');
  const result = update.run(hashedPassword, 'admin');
  
  console.log('Updated', result.changes, 'row(s)');
  console.log('Password reset successfully for user: admin');
  
  const user = db.prepare('SELECT username, email, role, status FROM users WHERE username = ?').get('admin');
  console.log('User info:', user);

  db.close();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

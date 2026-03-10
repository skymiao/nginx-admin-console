require('dotenv').config();
const { db } = require('./src/database');
const { encryptPassword, encryptPrivateKey, decryptPassword, decryptPrivateKey } = require('./src/utils/crypto');
const { executeWithPool } = require('./src/utils/sshPool');

(async () => {
console.log('=== 服务器认证流程测试 ===');
console.log('');

const testServer = {
  name: '测试远程服务器',
  host: '10.5.1.136',
  port: 22,
  username: 'root',
  password: 'test_password_123',
  privateKey: null,
  description: '用于测试SSH连接',
  nginx_config_path: '/etc/nginx',
  nginx_log_path: '/var/log/nginx',
  nginx_status_url: 'http://localhost/nginx_status',
  use_sudo: 0
};

console.log('1. 加密凭据');
console.log('   原始密码:', testServer.password);
const encryptedPassword = encryptPassword(testServer.password);
console.log('   加密密码:', encryptedPassword.substring(0, 50) + '...');
console.log('');

console.log('2. 解密凭据');
const decryptedPassword = decryptPassword(encryptedPassword);
console.log('   解密密码:', decryptedPassword);
console.log('   密码匹配:', testServer.password === decryptedPassword ? '✓ 成功' : '✗ 失败');
console.log('');

console.log('3. 创建服务器记录');
try {
  const insertSQL = `
    INSERT INTO servers (name, host, port, username, password, private_key, description, nginx_config_path, nginx_log_path, nginx_status_url, use_sudo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = db.prepare(insertSQL).run(
    testServer.name,
    testServer.host,
    testServer.port,
    testServer.username,
    encryptedPassword,
    testServer.privateKey,
    testServer.description,
    testServer.nginx_config_path,
    testServer.nginx_log_path,
    testServer.nginx_status_url,
    testServer.use_sudo
  );
  
  console.log('   ✓ 服务器创建成功，ID:', result.lastInsertRowid);
  testServer.id = result.lastInsertRowid;
} catch (error) {
  console.error('   ✗ 服务器创建失败:', error.message);
  process.exit(1);
}
console.log('');

console.log('4. 从数据库读取服务器记录');
try {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(testServer.id);
  console.log('   服务器信息:');
  console.log('   - ID:', server.id);
  console.log('   - 名称:', server.name);
  console.log('   - 主机:', server.host);
  console.log('   - 端口:', server.port);
  console.log('   - 用户名:', server.username);
  console.log('   - 密码 (加密):', server.password ? server.password.substring(0, 50) + '...' : 'null');
  console.log('   - 私钥 (加密):', server.private_key ? server.private_key.substring(0, 50) + '...' : 'null');
  console.log('');
  
  console.log('5. 解密数据库中的凭据');
  const dbDecryptedPassword = decryptPassword(server.password);
  console.log('   解密密码:', dbDecryptedPassword);
  console.log('   密码匹配:', testServer.password === dbDecryptedPassword ? '✓ 成功' : '✗ 失败');
  console.log('');
  
  console.log('6. 准备SSH连接');
  const serverWithCredentials = {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };
  
  console.log('   服务器凭据:');
  console.log('   - 主机:', serverWithCredentials.host);
  console.log('   - 端口:', serverWithCredentials.port);
  console.log('   - 用户名:', serverWithCredentials.username);
  console.log('   - 密码:', serverWithCredentials.password ? '已设置' : '未设置');
  console.log('   - 私钥:', serverWithCredentials.private_key ? '已设置' : '未设置');
  console.log('');
  
  console.log('7. 测试SSH连接');
  console.log('   执行命令: whoami');
  
  try {
    const { output, error } = await executeWithPool(serverWithCredentials, 'whoami');
    console.log('   ✓ SSH连接成功');
    console.log('   命令输出:', output.trim());
    console.log('   错误输出:', error ? error.trim() : '无');
  } catch (error) {
    console.error('   ✗ SSH连接失败:', error.message);
  }
  
  console.log('');
  console.log('8. 测试读取Nginx配置');
  console.log('   执行命令: ls -la /etc/nginx');
  
  try {
    const { output, error } = await executeWithPool(serverWithCredentials, 'ls -la /etc/nginx');
    console.log('   ✓ 命令执行成功');
    console.log('   输出:', output);
  } catch (error) {
    console.error('   ✗ 命令执行失败:', error.message);
  }
  
} catch (error) {
  console.error('   ✗ 读取服务器失败:', error.message);
}

console.log('');
console.log('=== 清理测试数据 ===');
try {
  db.prepare('DELETE FROM servers WHERE id = ?').run(testServer.id);
  console.log('✓ 测试服务器已删除');
} catch (error) {
  console.error('✗ 删除测试服务器失败:', error.message);
}

console.log('');
console.log('=== 测试完成 ===');
db.close();
})();

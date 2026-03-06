require('dotenv').config();
const crypto = require('crypto');
const config = require('./src/config');
const { db } = require('./src/database');
const { decryptPassword, decryptPrivateKey } = require('./src/utils/crypto');

console.log('=== 加密密钥信息 ===');
console.log('当前加密密钥:', config.encryptionKey);
console.log('加密密钥长度:', config.encryptionKey.length);
console.log('');

console.log('=== 数据库服务器信息 ===');
const servers = db.prepare('SELECT * FROM servers').all();
console.log(`总服务器数: ${servers.length}`);
console.log('');

servers.forEach((server, index) => {
  console.log(`服务器 ${index + 1}:`);
  console.log(`  ID: ${server.id}`);
  console.log(`  名称: ${server.name}`);
  console.log(`  主机: ${server.host}`);
  console.log(`  端口: ${server.port}`);
  console.log(`  用户名: ${server.username}`);
  
  if (server.password) {
    console.log(`  密码 (加密): ${server.password.substring(0, 50)}...`);
    try {
      const decryptedPassword = decryptPassword(server.password);
      if (decryptedPassword === server.password) {
        console.log(`  密码 (解密): 解密失败 - 可能使用了不同的加密密钥`);
      } else {
        console.log(`  密码 (解密): ${decryptedPassword.substring(0, 20)}...`);
      }
    } catch (error) {
      console.log(`  密码 (解密): 解密错误 - ${error.message}`);
    }
  } else {
    console.log(`  密码: null`);
  }
  
  if (server.private_key) {
    console.log(`  私钥 (加密): ${server.private_key.substring(0, 50)}...`);
    try {
      const decryptedKey = decryptPrivateKey(server.private_key);
      if (decryptedKey === server.private_key) {
        console.log(`  私钥 (解密): 解密失败 - 可能使用了不同的加密密钥`);
      } else {
        console.log(`  私钥 (解密): ${decryptedKey.substring(0, 20)}...`);
      }
    } catch (error) {
      console.log(`  私钥 (解密): 解密错误 - ${error.message}`);
    }
  } else {
    console.log(`  私钥: null`);
  }
  
  console.log('');
});

console.log('=== 问题分析 ===');
console.log('如果看到"解密失败 - 可能使用了不同的加密密钥"，说明：');
console.log('1. 服务器重启后加密密钥发生了变化');
console.log('2. 之前加密的凭据无法用新密钥解密');
console.log('3. 需要重新添加服务器或设置固定的 ENCRYPTION_KEY 环境变量');
console.log('');
console.log('=== 解决方案 ===');
console.log('1. 生成固定的加密密钥:');
console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
console.log('2. 在环境变量中设置 ENCRYPTION_KEY');
console.log('3. 重新添加服务器（使用新的加密密钥）');
console.log('4. 或者：清空服务器表，重新添加所有服务器');

db.close();
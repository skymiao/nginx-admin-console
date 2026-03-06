const config = require('./src/config');
const { db } = require('./src/database');
const { decryptPassword, decryptPrivateKey } = require('./src/utils/crypto');
const { executeWithPool } = require('./src/utils/sshPool');

console.log('=== Stats流程测试 ===');
console.log('');

const testStatsFlow = async (serverId) => {
  console.log('1. 从数据库读取服务器信息');
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  
  if (!server) {
    console.error('服务器不存在');
    return;
  }
  
  console.log('服务器信息:');
  console.log(`  ID: ${server.id}`);
  console.log(`  名称: ${server.name}`);
  console.log(`  主机: ${server.host}`);
  console.log(`  端口: ${server.port}`);
  console.log(`  用户名: ${server.username}`);
  console.log(`  密码 (加密): ${server.password ? server.password.substring(0, 20) + '...' : 'null'}`);
  console.log(`  私钥 (加密): ${server.private_key ? server.private_key.substring(0, 20) + '...' : 'null'}`);
  console.log('');
  
  console.log('2. 解密凭据');
  const serverWithCredentials = {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };
  
  console.log('解密后的凭据:');
  console.log(`  密码: ${serverWithCredentials.password ? '已解密' : 'null'}`);
  console.log(`  私钥: ${serverWithCredentials.private_key ? '已解密' : 'null'}`);
  console.log('');
  
  console.log('3. 测试SSH连接');
  try {
    const result = await executeWithPool(serverWithCredentials, 'whoami');
    console.log('✓ SSH连接成功');
    console.log(`  输出: ${result.output.trim()}`);
    console.log('');
  } catch (error) {
    console.error('✗ SSH连接失败:', error.message);
    console.log('');
    return;
  }
  
  console.log('4. 测试获取Nginx状态');
  const statusUrl = server.nginx_status_url || 'http://localhost/nginx_status';
  console.log(`  状态URL: ${statusUrl}`);
  
  try {
    const result = await executeWithPool(serverWithCredentials, `curl -s ${statusUrl}`);
    console.log('✓ 获取Nginx状态成功');
    console.log(`  输出:\n${result.output}`);
    console.log('');
  } catch (error) {
    console.error('✗ 获取Nginx状态失败:', error.message);
    console.log('');
    return;
  }
  
  console.log('5. 解析Nginx状态');
  const parseStubStatus = (output) => {
    const lines = output.trim().split('\n');
    const stats = {
      activeConnections: 0,
      accepts: 0,
      handled: 0,
      requests: 0,
      reading: 0,
      writing: 0,
      waiting: 0,
    };

    lines.forEach(line => {
      const activeMatch = line.match(/Active connections:\s*(\d+)/);
      if (activeMatch) {
        stats.activeConnections = parseInt(activeMatch[1]);
      }

      const serverMatch = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)/);
      if (serverMatch) {
        stats.accepts = parseInt(serverMatch[1]);
        stats.handled = parseInt(serverMatch[2]);
        stats.requests = parseInt(serverMatch[3]);
      }

      const connectionMatch = line.match(/Reading:\s*(\d+)\s+Writing:\s*(\d+)\s+Waiting:\s*(\d+)/);
      if (connectionMatch) {
        stats.reading = parseInt(connectionMatch[1]);
        stats.writing = parseInt(connectionMatch[2]);
        stats.waiting = parseInt(connectionMatch[3]);
      }
    });

    return stats;
  };
  
  const stats = parseStubStatus(result.output);
  console.log('解析结果:');
  console.log(`  活跃连接: ${stats.activeConnections}`);
  console.log(`  接受: ${stats.accepts}`);
  console.log(`  处理: ${stats.handled}`);
  console.log(`  请求: ${stats.requests}`);
  console.log(`  读取: ${stats.reading}`);
  console.log(`  写入: ${stats.writing}`);
  console.log(`  等待: ${stats.waiting}`);
  console.log('');
  
  console.log('✓ 测试完成');
};

(async () => {
  try {
    const serverId = process.argv[2] || 1;
    console.log(`测试服务器ID: ${serverId}`);
    console.log('');
    
    await testStatsFlow(serverId);
  } catch (error) {
    console.error('测试异常:', error);
  } finally {
    db.close();
    process.exit(0);
  }
})();
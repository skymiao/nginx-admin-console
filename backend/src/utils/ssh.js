const { db } = require('../database');
const { decryptPassword, decryptPrivateKey } = require('./crypto');
const { executeWithPool, closeAllPools } = require('./sshPool');

const executeRemoteCommand = async (server, command) => {
  const serverKey = `${server.host}:${server.port}:${server.username}`;
  console.log(`[SSH] 开始执行远程命令 - 服务器: ${serverKey}, 命令: ${command}`);
  
  console.log(`[SSH] 解密前 - 密码: ${server.password ? server.password.substring(0, 20) + '...' : '未设置'}, 私钥: ${server.private_key ? server.private_key.substring(0, 20) + '...' : '未设置'}`);
  
  const serverWithCredentials = {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };

  console.log(`[SSH] 解密后 - 密码: ${serverWithCredentials.password ? serverWithCredentials.password.substring(0, 20) + '...' : '未设置'}, 私钥: ${serverWithCredentials.private_key ? serverWithCredentials.private_key.substring(0, 20) + '...' : '未设置'}`);

  const authMethod = serverWithCredentials.private_key ? '私钥' : (serverWithCredentials.password ? '密码' : '无');
  console.log(`[SSH] 服务器认证方式: ${authMethod}`);
  console.log(`[SSH] 凭据解密完成 - 密码: ${serverWithCredentials.password ? '已解密' : '未设置'}, 私钥: ${serverWithCredentials.private_key ? '已解密' : '未设置'}`);

  const startTime = Date.now();
  
  try {
    const result = await executeWithPool(serverWithCredentials, command);
    const elapsedTime = Date.now() - startTime;
    
    console.log(`[SSH] ✓ 命令执行成功 - 服务器: ${serverKey}, 耗时: ${elapsedTime}ms, 输出长度: ${result.output?.length || 0} bytes`);
    
    if (result.error) {
      console.log(`[SSH] 命令有错误输出 - 服务器: ${serverKey}, 错误: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[SSH] ✗ 命令执行失败 - 服务器: ${serverKey}, 耗时: ${elapsedTime}ms, 错误: ${error.message}`);
    throw error;
  }
};

const getServer = (serverId) => {
  console.log(`[SSH] 获取服务器信息 - serverId: ${serverId || 'null'}`);
  
  if (!serverId || serverId === 'local' || serverId === 'null') {
    console.log(`[SSH] 使用本地文件系统 - serverId: ${serverId || 'null'}`);
    return null;
  }

  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  if (!server) {
    console.error(`[SSH] ✗ 服务器不存在 - serverId: ${serverId}`);
    return null;
  }
  
  console.log(`[SSH] 解密前 - 密码: ${server.password ? server.password.substring(0, 20) + '...' : '未设置'}, 私钥: ${server.private_key ? server.private_key.substring(0, 20) + '...' : '未设置'}`);
  
  const serverWithCredentials = {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };
  
  console.log(`[SSH] 解密后 - 密码: ${serverWithCredentials.password ? serverWithCredentials.password.substring(0, 20) + '...' : '未设置'}, 私钥: ${serverWithCredentials.private_key ? serverWithCredentials.private_key.substring(0, 20) + '...' : '未设置'}`);
  
  console.log(`[SSH] ✓ 获取服务器成功 - ID: ${server.id}, 名称: ${server.name}, 主机: ${server.host}:${server.port}`);
  return serverWithCredentials;
};

module.exports = {
  executeRemoteCommand,
  getServer,
};

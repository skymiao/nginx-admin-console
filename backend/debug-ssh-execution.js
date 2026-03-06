const config = require('./src/config');
const { db } = require('./src/database');
const { decryptPassword, decryptPrivateKey } = require('./src/utils/crypto');
const { createPool } = require('generic-pool');
const { Client } = require('ssh2');

console.log('=== SSH执行流程详细调试 ===');
console.log('');

const debugSSHExecution = async (serverId, command) => {
  console.log('步骤1: 从数据库读取服务器信息');
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  
  if (!server) {
    console.error('✗ 服务器不存在');
    return;
  }
  
  console.log('✓ 服务器信息:');
  console.log(`  ID: ${server.id}`);
  console.log(`  名称: ${server.name}`);
  console.log(`  主机: ${server.host}`);
  console.log(`  端口: ${server.port}`);
  console.log(`  用户名: ${server.username}`);
  console.log(`  密码 (加密): ${server.password ? server.password.substring(0, 20) + '...' : 'null'}`);
  console.log(`  私钥 (加密): ${server.private_key ? server.private_key.substring(0, 20) + '...' : 'null'}`);
  console.log('');
  
  console.log('步骤2: 解密凭据');
  const serverWithCredentials = {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };
  
  console.log('✓ 解密后的凭据:');
  console.log(`  密码: ${serverWithCredentials.password ? '已解密 (长度: ' + serverWithCredentials.password.length + ')' : 'null'}`);
  console.log(`  私钥: ${serverWithCredentials.private_key ? '已解密 (长度: ' + serverWithCredentials.private_key.length + ')' : 'null'}`);
  console.log('');
  
  console.log('步骤3: 创建SSH连接池');
  const key = `${server.host}:${server.port}:${server.username}`;
  console.log(`  连接池键: ${key}`);
  console.log('');
  
  const pool = createPool({
    create: () => {
      return new Promise((resolve, reject) => {
        const conn = new Client();
        
        const config = {
          host: server.host,
          port: server.port || 22,
          username: server.username,
          readyTimeout: 60000,
          connectTimeout: 60000,
          keepaliveInterval: 30000,
        };

        if (serverWithCredentials.private_key) {
          config.privateKey = serverWithCredentials.private_key;
        } else if (serverWithCredentials.password) {
          config.password = serverWithCredentials.password;
        }

        console.log(`[${new Date().toISOString()}] 创建新连接...`);
        const startTime = Date.now();

        conn.connect(config, (err) => {
          const elapsedTime = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] 连接创建耗时: ${elapsedTime}ms`);
          
          if (err) {
            console.error(`[${new Date().toISOString()}] ✗ 连接创建失败:`, err.message);
            reject(err);
          } else {
            console.log(`[${new Date().toISOString()}] ✓ 连接创建成功`);
            resolve(conn);
          }
        });

        conn.on('error', (err) => {
          console.error(`[${new Date().toISOString()}] 连接错误:`, err.message);
        });

        conn.on('close', () => {
          console.log(`[${new Date().toISOString()}] 连接已关闭`);
        });
      });
    },
    destroy: (conn) => {
      try {
        console.log(`[${new Date().toISOString()}] 销毁连接...`);
        conn.end();
        console.log(`[${new Date().toISOString()}] ✓ 连接已销毁`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 销毁连接失败:`, error.message);
      }
    },
    validate: async (conn) => {
      if (!conn || !conn._sock || conn._sock.destroyed) {
        console.log(`[${new Date().toISOString()}] 连接验证: 无效 (连接不存在或已销毁)`);
        return false;
      }

      try {
        console.log(`[${new Date().toISOString()}] 开始验证连接...`);
        const startTime = Date.now();
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            const elapsedTime = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] 连接验证超时 (${elapsedTime}ms)`);
            resolve(false);
          }, 5000);

          conn.exec('echo "ping"', (err, stream) => {
            clearTimeout(timeout);
            const elapsedTime = Date.now() - startTime;
            
            if (err) {
              console.log(`[${new Date().toISOString()}] 连接验证失败 (${elapsedTime}ms):`, err.message);
              resolve(false);
              return;
            }

            let output = '';
            stream.on('data', (data) => {
              output += data.toString();
            });

            stream.on('close', (code) => {
              const elapsedTime = Date.now() - startTime;
              if (code === 0 && output.includes('ping')) {
                console.log(`[${new Date().toISOString()}] ✓ 连接验证成功 (${elapsedTime}ms)`);
                resolve(true);
              } else {
                console.log(`[${new Date().toISOString()}] 连接验证失败 (${elapsedTime}ms): 退出码 ${code}`);
                resolve(false);
              }
            });

            stream.stderr.on('data', () => {
              clearTimeout(timeout);
              console.log(`[${new Date().toISOString()}] 连接验证失败: stderr有输出`);
              resolve(false);
            });
          });
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 连接验证异常:`, error.message);
        return false;
      }
    },
    max: 5,
    min: 1,
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 120000,
  });

  console.log('步骤4: 获取SSH连接');
  let conn;
  try {
    const startTime = Date.now();
    conn = await pool.acquire();
    const elapsedTime = Date.now() - startTime;
    console.log(`✓ 连接获取成功 (耗时: ${elapsedTime}ms)`);
    console.log('');
  } catch (error) {
    console.error('✗ 连接获取失败:', error.message);
    console.log('');
    return;
  }
  
  console.log('步骤5: 执行命令');
  console.log(`  命令: ${command}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    const result = await new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      let commandTimeout;
      
      console.log(`[${new Date().toISOString()}] 开始执行命令...`);
      
      commandTimeout = setTimeout(() => {
        const elapsedTime = Date.now() - startTime;
        console.error(`[${new Date().toISOString()}] ✗ 命令执行超时 (${elapsedTime}ms)`);
        pool.release(conn);
        reject(new Error(`命令执行超时: ${command}`));
      }, 120000);
      
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(commandTimeout);
          const elapsedTime = Date.now() - startTime;
          console.error(`[${new Date().toISOString()}] ✗ conn.exec失败 (${elapsedTime}ms):`, err.message);
          pool.release(conn);
          return reject(err);
        }

        console.log(`[${new Date().toISOString()}] ✓ conn.exec成功，开始接收数据`);

        stream.on('data', (data) => {
          output += data.toString();
          console.log(`[${new Date().toISOString()}] 收到数据 (${data.length} bytes)`);
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
          console.log(`[${new Date().toISOString()}] 收到stderr (${data.length} bytes): ${data.toString()}`);
        });

        stream.on('close', (code) => {
          clearTimeout(commandTimeout);
          const elapsedTime = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] 流关闭 (${elapsedTime}ms), 退出码: ${code}`);
          console.log(`[${new Date().toISOString()}] 总输出长度: ${output.length} bytes`);
          console.log(`[${new Date().toISOString()}] 总错误长度: ${error.length} bytes`);
          
          pool.release(conn);
          
          if (code === 0) {
            console.log(`[${new Date().toISOString()}] ✓ 命令执行成功`);
            resolve({ output, error });
          } else {
            const errorMsg = error || output || `Command failed with exit code ${code}`;
            console.error(`[${new Date().toISOString()}] ✗ 命令执行失败:`, errorMsg);
            reject(new Error(errorMsg));
          }
        });

        stream.on('error', (streamErr) => {
          clearTimeout(commandTimeout);
          const elapsedTime = Date.now() - startTime;
          console.error(`[${new Date().toISOString()}] ✗ 流错误 (${elapsedTime}ms):`, streamErr.message);
          pool.release(conn);
          reject(streamErr);
        });
      });
    });
    
    const elapsedTime = Date.now() - startTime;
    console.log('');
    console.log('✓ 命令执行完成');
    console.log(`  总耗时: ${elapsedTime}ms`);
    console.log(`  输出长度: ${result.output.length} bytes`);
    console.log(`  错误长度: ${result.error.length} bytes`);
    console.log('');
    
    console.log('步骤6: 关闭连接池');
    await pool.drain();
    await pool.clear();
    console.log('✓ 连接池已关闭');
    console.log('');
    
    return result;
  } catch (error) {
    console.error('✗ 命令执行异常:', error.message);
    console.log('');
    
    await pool.drain();
    await pool.clear();
    console.log('✓ 连接池已关闭');
    console.log('');
    
    throw error;
  }
};

(async () => {
  try {
    const serverId = process.argv[2] || 1;
    const command = process.argv[3] || 'whoami';
    
    console.log(`测试参数:`);
    console.log(`  服务器ID: ${serverId}`);
    console.log(`  命令: ${command}`);
    console.log('');
    
    await debugSSHExecution(serverId, command);
  } catch (error) {
    console.error('测试异常:', error);
  } finally {
    db.close();
    process.exit(0);
  }
})();
const { createPool } = require('generic-pool');
const { Client } = require('ssh2');

if (!createPool || typeof createPool !== 'function') {
  console.error('createPool is not available from generic-pool');
  throw new Error('generic-pool is not available. Please ensure generic-pool is installed correctly.');
}

const sshPools = new Map();

const validatePrivateKey = (privateKey) => {
  if (!privateKey) return { valid: true };
  
  const trimmedKey = privateKey.trim();
  
  if (!trimmedKey.includes('-----BEGIN') || !trimmedKey.includes('-----END')) {
    return { 
      valid: false, 
      error: '私钥格式不正确，必须包含 BEGIN 和 END 标记（如：-----BEGIN RSA PRIVATE KEY-----）' 
    };
  }
  
  if (!trimmedKey.includes('PRIVATE KEY')) {
    return { 
      valid: false, 
      error: '私钥格式不正确，必须是 PRIVATE KEY 格式' 
    };
  }
  
  return { valid: true };
};

const formatSSHError = (err, server) => {
  const key = `${server.host}:${server.port}:${server.username}`;
  
  if (err.message.includes('All configured authentication methods failed')) {
    if (server.private_key) {
      return `SSH 认证失败 (${key}): 私钥认证失败，请检查：\n1. 私钥是否正确\n2. 私钥是否已添加到服务器的 authorized_keys\n3. 私钥文件权限是否正确 (600)\n4. 用户名是否正确`;
    } else if (server.password) {
      return `SSH 认证失败 (${key}): 密码认证失败，请检查：\n1. 密码是否正确\n2. 用户名是否正确\n3. 服务器是否允许密码认证`;
    } else {
      return `SSH 认证失败 (${key}): 未提供认证凭据（密码或私钥）`;
    }
  }
  
  if (err.message.includes('ECONNREFUSED')) {
    return `SSH 连接被拒绝 (${key}): 请检查主机地址和SSH端口 (默认22)`;
  }
  
  if (err.message.includes('ETIMEDOUT') || err.message.includes('Timed out')) {
    return `SSH 连接超时 (${key}): 请检查主机地址是否可达，网络连接是否正常`;
  }
  
  if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
    return `SSH 主机未找到 (${key}): 请检查主机地址是否正确`;
  }
  
  if (err.message.includes('EHOSTUNREACH')) {
    return `SSH 主机不可达 (${key}): 请检查网络连接和防火墙设置`;
  }
  
  if (err.message.includes('Permission denied')) {
    return `SSH 权限被拒绝 (${key}): 请检查用户名和密码/密钥是否正确`;
  }
  
  return `SSH 连接失败 (${key}): ${err.message}`;
};

const getPoolKey = (server) => {
  return `${server.host}:${server.port}:${server.username}`;
};

const getOrCreatePool = (server) => {
  const key = getPoolKey(server);
  console.log(`[SSH Pool] 获取或创建连接池 - 服务器: ${key}`);
  
  if (sshPools.has(key)) {
    console.log(`[SSH Pool] ✓ 使用现有连接池 - 服务器: ${key}`);
    return sshPools.get(key);
  }
  
  console.log(`[SSH Pool] 创建新连接池 - 服务器: ${key}`);
  
  if (server.private_key) {
    const validation = validatePrivateKey(server.private_key);
    if (!validation.valid) {
      console.error(`[SSH Pool] ✗ 私钥格式验证失败 - 服务器: ${key}, 错误: ${validation.error}`);
      throw new Error(`私钥格式错误: ${validation.error}`);
    }
    console.log(`[SSH Pool] ✓ 私钥格式验证通过 - 服务器: ${key}`);
  }
  
  const poolConfig = {
    max: 5,
    min: 0,
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 180000,
  };
  
  console.log(`[SSH Pool] 连接池配置 - 服务器: ${key}, max: ${poolConfig.max}, min: ${poolConfig.min}, idleTimeoutMillis: ${poolConfig.idleTimeoutMillis}, acquireTimeoutMillis: ${poolConfig.acquireTimeoutMillis}`);
  
  const pool = createPool({
    create: () => {
      return new Promise((resolve, reject) => {
        const conn = new Client();
        
        const config = {
          host: server.host,
          port: server.port || 22,
          username: server.username,
          readyTimeout: 120000,
          connectTimeout: 120000,
          keepaliveInterval: 30000,
        };

        console.log(`[SSH Pool] 连接配置 - 服务器: ${key}, host: ${config.host}, port: ${config.port}, username: ${config.username}, readyTimeout: ${config.readyTimeout}ms, connectTimeout: ${config.connectTimeout}ms`);

        if (server.private_key) {
          config.privateKey = server.private_key;
          console.log(`[SSH Pool] 使用私钥认证 - 服务器: ${key}, 私钥长度: ${server.private_key.length} bytes`);
        } else if (server.password) {
          config.password = server.password;
          console.log(`[SSH Pool] 使用密码认证 - 服务器: ${key}, 密码长度: ${server.password.length} bytes`);
        } else {
          console.error(`[SSH Pool] ✗ 未提供认证凭据 - 服务器: ${key}`);
          reject(new Error('未提供认证凭据（密码或私钥）'));
          return;
        }

        console.log(`[SSH Pool] 开始建立SSH连接 - 服务器: ${key}, 超时: ${config.readyTimeout / 1000}s`);
        const startTime = Date.now();
        
        console.log(`[SSH Pool] 调用conn.connect - 服务器: ${key}`);
        conn.connect(config, (err) => {
          const elapsedTime = Date.now() - startTime;
          
          if (err) {
            const formattedError = formatSSHError(err, server);
            console.error(`[SSH Pool] ✗ SSH连接失败 - 服务器: ${key}, 耗时: ${elapsedTime}ms, 错误: ${formattedError}`);
            console.error(`[SSH Pool] 原始错误信息 - 服务器: ${key}, 错误: ${err.message}`);
            reject(new Error(formattedError));
          }
        });

        conn.on('error', (err) => {
          console.error(`[SSH Pool] 连接错误 - 服务器: ${key}, 错误: ${err.message}`);
          const elapsedTime = Date.now() - startTime;
          const formattedError = formatSSHError(err, server);
          reject(new Error(formattedError));
        });

        conn.on('close', () => {
          console.log(`[SSH Pool] 连接已关闭 - 服务器: ${key}`);
        });
        
        conn.on('ready', () => {
          const elapsedTime = Date.now() - startTime;
          console.log(`[SSH Pool] 连接就绪 - 服务器: ${key}, 耗时: ${elapsedTime}ms`);
          console.log(`[SSH Pool] ✓ SSH连接成功 - 服务器: ${key}, 耗时: ${elapsedTime}ms`);
          resolve(conn);
        });
        
        conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
          console.log(`[SSH Pool] 键盘交互认证 - 服务器: ${key}, name: ${name}`);
        });
      });
    },
    destroy: (conn) => {
      try {
        console.log(`[SSH Pool] 销毁连接 - 服务器: ${key}`);
        conn.end();
        console.log(`[SSH Pool] ✓ 连接已销毁 - 服务器: ${key}`);
      } catch (error) {
        console.error(`[SSH Pool] 销毁连接失败 - 服务器: ${key}, 错误: ${error.message}`);
      }
    },
    validate: (conn) => {
      try {
        const isValid = conn && conn._sock && conn._sock.writable && !conn._sock.destroyed;
        if (!isValid) {
          console.log(`[SSH Pool] 连接验证失败 - 服务器: ${key}, 原因: 连接无效或已销毁`);
        }
        return isValid;
      } catch (error) {
        console.error(`[SSH Pool] 连接验证异常 - 服务器: ${key}, 错误: ${error.message}`);
        return false;
      }
    },
    ...poolConfig,
  });

  sshPools.set(key, pool);
  console.log(`[SSH Pool] ✓ 连接池创建完成 - 服务器: ${key}`);
  return pool;
};

const executeWithPool = async (server, command) => {
  const key = getPoolKey(server);
  console.log(`[SSH Pool] 开始执行命令 - 服务器: ${key}, 命令: ${command}`);
  
  const pool = getOrCreatePool(server);
  let conn;
  let released = false;
  
  const releaseConnection = () => {
    if (!released && conn) {
      try {
        console.log(`[SSH Pool] 释放连接 - 服务器: ${key}`);
        pool.release(conn);
        released = true;
        console.log(`[SSH Pool] ✓ 连接已释放 - 服务器: ${key}`);
      } catch (releaseError) {
        console.error(`[SSH Pool] 释放连接失败 - 服务器: ${key}, 错误: ${releaseError.message}`);
      }
    }
  };
  
  try {
    console.log(`[SSH Pool] 获取连接 - 服务器: ${key}`);
    const acquireStartTime = Date.now();
    
    try {
      const poolStats = getPoolStats(server);
      console.log(`[SSH Pool] 连接池状态 - 服务器: ${key}, size: ${poolStats?.size ?? 'N/A'}, available: ${poolStats?.available ?? 'N/A'}, pending: ${poolStats?.pending ?? 'N/A'}`);
    } catch (statsError) {
      console.log(`[SSH Pool] 获取连接池状态失败 - 服务器: ${key}, 错误: ${statsError.message}`);
    }
    
    console.log(`[SSH Pool] 开始调用pool.acquire - 服务器: ${key}`);
    conn = await pool.acquire();
    const acquireElapsedTime = Date.now() - acquireStartTime;
    console.log(`[SSH Pool] ✓ 连接获取成功 - 服务器: ${key}, 耗时: ${acquireElapsedTime}ms`);
    
    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      let commandTimeout;
      let dataReceived = false;
      
      const finalCommand = server.use_sudo ? `sudo ${command}` : command;
      console.log(`[SSH Pool] 执行最终命令 - 服务器: ${key}, 命令: ${finalCommand}, 使用sudo: ${server.use_sudo ? '是' : '否'}`);
      
      commandTimeout = setTimeout(() => {
        const elapsedTime = Date.now() - acquireStartTime;
        console.error(`[SSH Pool] ✗ 命令执行超时 - 服务器: ${key}, 耗时: ${elapsedTime}ms, 命令: ${finalCommand}`);
        releaseConnection();
        reject(new Error(`命令执行超时: ${finalCommand}`));
      }, 120000);
      
      const execStartTime = Date.now();
      console.log(`[SSH Pool] 调用conn.exec - 服务器: ${key}`);
      
      conn.exec(finalCommand, (err, stream) => {
        if (err) {
          clearTimeout(commandTimeout);
          const elapsedTime = Date.now() - execStartTime;
          console.error(`[SSH Pool] ✗ conn.exec失败 - 服务器: ${key}, 耗时: ${elapsedTime}ms, 错误: ${err.message}`);
          releaseConnection();
          return reject(err);
        }

        const execElapsedTime = Date.now() - execStartTime;
        console.log(`[SSH Pool] ✓ conn.exec成功 - 服务器: ${key}, 耗时: ${execElapsedTime}ms, 开始接收数据`);

        stream.on('data', (data) => {
          if (!dataReceived) {
            dataReceived = true;
            const firstDataTime = Date.now() - execStartTime;
            console.log(`[SSH Pool] ✓ 首次接收数据 - 服务器: ${key}, 耗时: ${firstDataTime}ms`);
          }
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
          console.log(`[SSH Pool] 收到stderr数据 - 服务器: ${key}, 数据: ${data.toString()}`);
        });

        stream.on('close', (code) => {
          clearTimeout(commandTimeout);
          const totalElapsedTime = Date.now() - acquireStartTime;
          
          console.log(`[SSH Pool] 流关闭 - 服务器: ${key}, 退出码: ${code}, 总耗时: ${totalElapsedTime}ms`);
          console.log(`[SSH Pool] 输出统计 - 服务器: ${key}, stdout长度: ${output.length} bytes, stderr长度: ${error.length} bytes`);
          
          releaseConnection();
          
          if (code === 0) {
            console.log(`[SSH Pool] ✓ 命令执行成功 - 服务器: ${key}`);
            resolve({ output, error });
          } else {
            const errorMsg = error || output || `Command failed with exit code ${code}`;
            console.error(`[SSH Pool] ✗ 命令执行失败 - 服务器: ${key}, 错误: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        });

        stream.on('error', (streamErr) => {
          clearTimeout(commandTimeout);
          const elapsedTime = Date.now() - execStartTime;
          console.error(`[SSH Pool] ✗ 流错误 - 服务器: ${key}, 耗时: ${elapsedTime}ms, 错误: ${streamErr.message}`);
          releaseConnection();
          reject(streamErr);
        });
      });
    });
  } catch (err) {
    const elapsedTime = Date.now();
    console.error(`[SSH Pool] ✗ 命令执行异常 - 服务器: ${key}, 错误: ${err.message}`);
    releaseConnection();
    throw err;
  }
};

const drainPool = (server) => {
  const key = getPoolKey(server);
  const pool = sshPools.get(key);
  
  if (pool) {
    return pool.drain();
  }
  
  return Promise.resolve();
};

const clearPool = (server) => {
  const key = getPoolKey(server);
  const pool = sshPools.get(key);
  
  if (pool) {
    return pool.clear();
  }
  
  return Promise.resolve();
};

const closePool = (server) => {
  const key = getPoolKey(server);
  const pool = sshPools.get(key);
  
  if (pool) {
    return pool.drain().then(() => pool.clear());
  }
  
  return Promise.resolve();
};

const closeAllPools = async () => {
  const promises = [];
  
  for (const pool of sshPools.values()) {
    promises.push(pool.drain().then(() => pool.clear()));
  }
  
  await Promise.all(promises);
  sshPools.clear();
};

const getPoolStats = (server) => {
  const key = getPoolKey(server);
  const pool = sshPools.get(key);
  
  if (pool) {
    return {
      size: pool.size,
      available: pool.available,
      pending: pool.pending,
    };
  }
  
  return null;
};

module.exports = {
  getOrCreatePool,
  executeWithPool,
  drainPool,
  clearPool,
  closePool,
  closeAllPools,
  getPoolStats,
};

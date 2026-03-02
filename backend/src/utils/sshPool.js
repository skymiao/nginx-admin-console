const { Pool } = require('generic-pool');
const { Client } = require('ssh2');

const sshPools = new Map();

const getPoolKey = (server) => {
  return `${server.host}:${server.port}:${server.username}`;
};

const getOrCreatePool = (server) => {
  const key = getPoolKey(server);
  
  if (sshPools.has(key)) {
    return sshPools.get(key);
  }
  
  const pool = new Pool({
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

        if (server.private_key) {
          config.privateKey = server.private_key;
        } else if (server.password) {
          config.password = server.password;
        }

        conn.connect(config, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(conn);
          }
        });
      });
    },
    destroy: (conn) => {
      try {
        conn.end();
      } catch (error) {
        console.error('Error destroying SSH connection:', error);
      }
    },
    validate: (conn) => {
      return conn && conn._sock && conn._sock.writable;
    },
    max: 5,
    min: 1,
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 30000,
  });

  sshPools.set(key, pool);
  return pool;
};

const executeWithPool = async (server, command) => {
  const pool = getOrCreatePool(server);
  let conn;
  
  try {
    conn = await pool.acquire();
    
    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      
      const finalCommand = server.use_sudo ? `sudo ${command}` : command;
      
      conn.exec(finalCommand, (err, stream) => {
        if (err) {
          pool.release(conn);
          return reject(err);
        }

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
        });

        stream.on('close', (code) => {
          pool.release(conn);
          
          if (code === 0) {
            resolve({ output, error });
          } else {
            reject(new Error(`Command failed with code ${code}: ${error}`));
          }
        });
      });
    });
  } catch (err) {
    if (conn) {
      pool.release(conn);
    }
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

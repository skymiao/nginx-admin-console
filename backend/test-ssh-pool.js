require('dotenv').config();
const { createPool } = require('generic-pool');
const { Client } = require('ssh2');

console.log('=== SSH连接池测试工具 ===');
console.log('');

const testPool = async (host, port, username, password, privateKey) => {
  console.log('连接参数:');
  console.log(`  主机: ${host}`);
  console.log(`  端口: ${port}`);
  console.log(`  用户名: ${username}`);
  console.log(`  密码: ${password ? '已设置' : '未设置'}`);
  console.log(`  私钥: ${privateKey ? '已设置' : '未设置'}`);
  console.log('');

  const pool = createPool({
    create: () => {
      return new Promise((resolve, reject) => {
        const conn = new Client();
        
        const config = {
          host,
          port: port || 22,
          username,
          readyTimeout: 60000,
          connectTimeout: 60000,
          keepaliveInterval: 30000,
        };

        if (privateKey) {
          config.privateKey = privateKey;
        } else if (password) {
          config.password = password;
        }

        console.log(`[${new Date().toISOString()}] 创建新连接...`);
        const startTime = Date.now();

        conn.connect(config, (err) => {
          const elapsedTime = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] 连接创建耗时: ${elapsedTime}ms`);
          
          if (err) {
            console.error(`[${new Date().toISOString()}] 连接创建失败:`, err.message);
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
    validate: (conn) => {
      const isValid = conn && conn._sock && conn._sock.writable && !conn._sock.destroyed;
      console.log(`[${new Date().toISOString()}] 验证连接: ${isValid ? '有效' : '无效'}`);
      console.log(`  conn 存在: ${!!conn}`);
      console.log(`  _sock 存在: ${!!conn?._sock}`);
      console.log(`  _sock.writable: ${conn?._sock?.writable}`);
      console.log(`  _sock.destroyed: ${conn?._sock?.destroyed}`);
      return isValid;
    },
    max: 5,
    min: 1,
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 120000,
  });

  console.log('');
  console.log('=== 测试1: 获取连接 ===');
  let conn1;
  try {
    const startTime = Date.now();
    conn1 = await pool.acquire();
    const elapsedTime = Date.now() - startTime;
    console.log(`✓ 连接1获取成功 (耗时: ${elapsedTime}ms)`);
  } catch (error) {
    console.error('✗ 连接1获取失败:', error.message);
    return;
  }

  console.log('');
  console.log('=== 测试2: 执行命令 ===');
  try {
    const startTime = Date.now();
    const result = await new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      
      conn1.exec('whoami', (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
        });

        stream.on('close', (code) => {
          if (code === 0) {
            resolve({ output, error });
          } else {
            reject(new Error(error || output));
          }
        });
      });
    });
    
    const elapsedTime = Date.now() - startTime;
    console.log(`✓ 命令执行成功 (耗时: ${elapsedTime}ms)`);
    console.log(`  输出: ${result.output.trim()}`);
  } catch (error) {
    console.error('✗ 命令执行失败:', error.message);
  }

  console.log('');
  console.log('=== 测试3: 释放连接 ===');
  pool.release(conn1);
  console.log('✓ 连接1已释放');

  console.log('');
  console.log('=== 测试4: 等待5秒后再次获取连接 ===');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  let conn2;
  try {
    const startTime = Date.now();
    conn2 = await pool.acquire();
    const elapsedTime = Date.now() - startTime;
    console.log(`✓ 连接2获取成功 (耗时: ${elapsedTime}ms)`);
  } catch (error) {
    console.error('✗ 连接2获取失败:', error.message);
    return;
  }

  console.log('');
  console.log('=== 测试5: 再次执行命令 ===');
  try {
    const startTime = Date.now();
    const result = await new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      
      conn2.exec('whoami', (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
        });

        stream.on('close', (code) => {
          if (code === 0) {
            resolve({ output, error });
          } else {
            reject(new Error(error || output));
          }
        });
      });
    });
    
    const elapsedTime = Date.now() - startTime;
    console.log(`✓ 命令执行成功 (耗时: ${elapsedTime}ms)`);
    console.log(`  输出: ${result.output.trim()}`);
  } catch (error) {
    console.error('✗ 命令执行失败:', error.message);
  }

  console.log('');
  console.log('=== 测试6: 释放连接 ===');
  pool.release(conn2);
  console.log('✓ 连接2已释放');

  console.log('');
  console.log('=== 测试7: 检查连接池状态 ===');
  const stats = {
    size: pool.size,
    available: pool.available,
    pending: pool.pending,
  };
  console.log('连接池状态:');
  console.log(`  总连接数: ${stats.size}`);
  console.log(`  可用连接数: ${stats.available}`);
  console.log(`  等待中的连接数: ${stats.pending}`);

  console.log('');
  console.log('=== 测试8: 关闭连接池 ===');
  await pool.drain();
  await pool.clear();
  console.log('✓ 连接池已关闭');
};

(async () => {
  const testCases = [
    {
      name: '测试1: 远程主机（密码认证）',
      host: '10.5.1.136',
      port: 22,
      username: 'root',
      password: 'test_password_123',
      privateKey: null,
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(testCase.name);
    console.log('='.repeat(60));
    
    try {
      await testPool(
        testCase.host,
        testCase.port,
        testCase.username,
        testCase.password,
        testCase.privateKey
      );
    } catch (error) {
      console.error('测试异常:', error.message);
    }
    
    console.log('');
    console.log('等待3秒后进行下一个测试...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n=== 所有测试完成 ===');
  process.exit(0);
})();
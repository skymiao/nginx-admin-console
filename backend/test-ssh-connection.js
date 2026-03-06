require('dotenv').config();
const { Client } = require('ssh2');
const { validatePrivateKey, formatSSHError } = require('./src/utils/sshPool');

console.log('=== SSH连接测试工具 ===');
console.log('');

const testConnection = async (host, port, username, password, privateKey) => {
  console.log('连接参数:');
  console.log(`  主机: ${host}`);
  console.log(`  端口: ${port}`);
  console.log(`  用户名: ${username}`);
  console.log(`  密码: ${password ? '已设置' : '未设置'}`);
  console.log(`  私钥: ${privateKey ? '已设置' : '未设置'}`);
  console.log('');

  if (privateKey) {
    const validation = validatePrivateKey(privateKey);
    if (!validation.valid) {
      console.error(`私钥格式错误: ${validation.error}`);
      return { success: false, message: validation.error };
    }
  }

  return new Promise((resolve) => {
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

    console.log('开始连接...');
    const startTime = Date.now();

    conn.connect(config, (err) => {
      const elapsedTime = Date.now() - startTime;
      console.log(`连接耗时: ${elapsedTime}ms`);
      
      if (err) {
        const formattedError = formatSSHError(err, { host, port: port || 22, username });
        console.error('连接失败:', formattedError);
        conn.end();
        resolve({ success: false, message: formattedError, error: err.message });
      } else {
        console.log('✓ 连接成功');
        
        console.log('执行测试命令: whoami');
        const commandStartTime = Date.now();
        
        conn.exec('whoami', (execErr, stream) => {
          if (execErr) {
            console.error('命令执行失败:', execErr.message);
            conn.end();
            resolve({ success: false, message: `命令执行失败: ${execErr.message}` });
            return;
          }

          let output = '';
          let error = '';

          stream.on('data', (data) => {
            output += data.toString();
          });

          stream.stderr.on('data', (data) => {
            error += data.toString();
          });

          stream.on('close', (code) => {
            const commandElapsedTime = Date.now() - commandStartTime;
            console.log(`命令执行耗时: ${commandElapsedTime}ms`);
            console.log(`命令输出: ${output.trim()}`);
            
            if (code === 0) {
              console.log('✓ 测试成功');
              conn.end();
              resolve({ success: true, message: '连接测试成功', output: output.trim() });
            } else {
              console.error(`命令执行失败，退出码: ${code}`);
              if (error) {
                console.error(`错误输出: ${error}`);
              }
              conn.end();
              resolve({ success: false, message: `命令执行失败: ${error || output}` });
            }
          });
        });
      }
    });

    conn.on('timeout', () => {
      const elapsedTime = Date.now() - startTime;
      console.error(`连接超时 (${elapsedTime}ms)`);
      conn.end();
      resolve({ success: false, message: '连接超时' });
    });
  });
};

const testCases = [
  {
    name: '测试1: 本地主机（无认证）',
    host: 'localhost',
    port: 22,
    username: 'root',
    password: null,
    privateKey: null,
  },
  {
    name: '测试2: 远程主机（密码认证）',
    host: '10.5.1.136',
    port: 22,
    username: 'root',
    password: 'test_password_123',
    privateKey: null,
  },
];

(async () => {
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(testCase.name);
    console.log('='.repeat(60));
    
    try {
      const result = await testConnection(
        testCase.host,
        testCase.port,
        testCase.username,
        testCase.password,
        testCase.privateKey
      );
      
      console.log('');
      console.log('测试结果:', result.success ? '✓ 成功' : '✗ 失败');
      console.log('消息:', result.message);
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
const crypto = require('crypto');

const generateSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  
  const secret = crypto.randomBytes(32).toString('hex');
  console.warn('');
  console.warn('⚠️  警告: 使用随机生成的 JWT_SECRET');
  console.warn('⚠️  请在环境变量中设置 JWT_SECRET');
  console.warn('⚠️  生成方法: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.warn('');
  return secret;
};

const generateEncryptionKey = () => {
  if (process.env.ENCRYPTION_KEY) {
    return process.env.ENCRYPTION_KEY;
  }
  
  const key = crypto.randomBytes(32).toString('hex');
  console.warn('');
  console.warn('⚠️  警告: 使用随机生成的 ENCRYPTION_KEY');
  console.warn('⚠️  请在环境变量中设置 ENCRYPTION_KEY');
  console.warn('⚠️  生成方法: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.warn('');
  return key;
};

const config = {
  jwtSecret: generateSecret(),
  encryptionKey: generateEncryptionKey(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (config.nodeEnv === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ 错误: 生产环境必须设置 JWT_SECRET 环境变量');
  process.exit(1);
}

if (config.nodeEnv === 'production' && !process.env.ENCRYPTION_KEY) {
  console.error('❌ 错误: 生产环境必须设置 ENCRYPTION_KEY 环境变量');
  process.exit(1);
}

module.exports = config;

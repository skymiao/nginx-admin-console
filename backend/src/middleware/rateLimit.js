const rateLimit = require('express-rate-limit');
const { db } = require('../database');

const getRateLimitConfig = (type) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(`rate_limit_${type}`);
    if (setting) {
      const config = JSON.parse(setting.value);
      return config;
    }
  } catch (error) {
    console.error(`Failed to load rate limit config for ${type}:`, error);
  }
  return null;
};

const createRateLimiter = (type, defaultWindowMs = 15 * 60 * 1000, defaultMax = 100) => {
  const config = getRateLimitConfig(type);
  const windowMs = config?.windowMs || defaultWindowMs;
  const max = config?.max || defaultMax;

  const windowMinutes = Math.ceil(windowMs / (60 * 1000));
  const windowText = windowMinutes >= 60 
    ? `${Math.floor(windowMinutes / 60)} 小时 ${windowMinutes % 60} 分钟`
    : `${windowMinutes} 分钟`;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: `请求过于频繁，请在 ${windowText} 后再试`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path === '/health';
    },
    validate: {
      xForwardedForHeader: false,
    },
  });
};

const authLimiter = createRateLimiter('auth', 15 * 60 * 1000, 5);
const apiLimiter = createRateLimiter('api', 15 * 60 * 1000, 100);
const strictLimiter = createRateLimiter('strict', 60 * 60 * 1000, 10);

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
  createRateLimiter,
};

const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: '请求过于频繁，请稍后再试',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path === '/health';
    },
  });
};

const authLimiter = createRateLimiter(15 * 60 * 1000, 5);
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100);
const strictLimiter = createRateLimiter(60 * 60 * 1000, 10);

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
};

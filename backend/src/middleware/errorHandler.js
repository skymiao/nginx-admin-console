const errorHandler = (err, req, res, next) => {
  console.error('[ErrorHandler] Error occurred:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    code: err.code,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '认证令牌已过期',
    });
  }

  if (err.code && err.code.startsWith('SQLITE_')) {
    console.error('[ErrorHandler] Database error:', err.code, err.message);
    return res.status(500).json({
      success: false,
      message: '数据库错误，请稍后重试',
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: '无法连接到数据库，请检查数据库服务是否正常运行',
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误，请稍后重试',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };

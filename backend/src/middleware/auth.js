const jwt = require('jsonwebtoken');
const { db } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }

  const user = db.prepare('SELECT id, username, email, role, status FROM users WHERE id = ?').get(decoded.id);
  if (!user || user.status !== 1) {
    return res.status(401).json({ message: '用户不存在或已被禁用' });
  }

  req.user = user;
  next();
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    const role = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(req.user.role);
    if (!role) {
      return res.status(403).json({ message: '角色不存在' });
    }

    const permissions = JSON.parse(role.permissions);
    if (!permissions.includes(permission)) {
      return res.status(403).json({ message: '权限不足' });
    }

    next();
  };
};

const requireRole = (roleName) => {
  return (req, res, next) => {
    if (req.user.role !== roleName) {
      return res.status(403).json({ message: '需要管理员权限' });
    }
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  requirePermission,
  requireRole,
};

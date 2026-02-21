const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginSchema } = require('../validators/schemas');
const { authLimiter } = require('../middleware/rateLimit');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => {
  const { username, password } = req.body;

  console.log('Login attempt for username:', username);

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    console.log('User not found:', username);
    throw new UnauthorizedError('用户名或密码错误');
  }

  console.log('User found:', user.username, 'Status:', user.status);

  if (!bcrypt.compareSync(password, user.password)) {
    console.log('Password comparison failed');
    throw new UnauthorizedError('用户名或密码错误');
  }

  if (user.status !== 1) {
    console.log('User is disabled');
    throw new ForbiddenError('账户已被禁用');
  }

  const token = generateToken(user);

  const role = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(user.role);
  const permissions = role ? JSON.parse(role.permissions) : [];

  db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  console.log('Login successful for:', user.username);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions,
    },
  });
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: '退出成功' });
});

router.get('/me', authMiddleware, (req, res) => {
  const role = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(req.user.role);
  const permissions = role ? JSON.parse(role.permissions) : [];
  
  res.json({
    success: true,
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    permissions,
  });
});

module.exports = router;

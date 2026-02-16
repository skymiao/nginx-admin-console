const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log('Login attempt for username:', username);

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    console.log('User not found:', username);
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  console.log('User found:', user.username, 'Status:', user.status);

  if (!bcrypt.compareSync(password, user.password)) {
    console.log('Password comparison failed');
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  if (user.status !== 1) {
    console.log('User is disabled');
    return res.status(403).json({ message: '账户已被禁用' });
  }

  const token = generateToken(user);

  const role = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(user.role);
  const permissions = role ? JSON.parse(role.permissions) : [];

  console.log('Login successful for:', user.username);

  res.json({
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
  res.json({ message: '退出成功' });
});

router.get('/me', authMiddleware, (req, res) => {
  const role = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(req.user.role);
  const permissions = role ? JSON.parse(role.permissions) : [];
  
  res.json({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    permissions,
  });
});

module.exports = router;

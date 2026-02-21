const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserSchema, changePasswordSchema } = require('../validators/schemas');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors');

const router = express.Router();

const formatToChinaTime = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return chinaTime.toISOString().replace('T', ' ').substring(0, 19);
};

const formatUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: formatToChinaTime(user.created_at),
  updatedAt: formatToChinaTime(user.updated_at),
  lastLoginAt: formatToChinaTime(user.last_login_at),
});

router.use(authMiddleware);

router.get('/profile/me', (req, res, next) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put('/profile/me', (req, res, next) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    const existingUser = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
    if (!existingUser) {
      throw new NotFoundError('用户不存在');
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (duplicateEmail) {
        throw new ConflictError('邮箱已存在');
      }
    }

    const updates = [];
    const values = [];

    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }

    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(userId);
    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put('/profile/me/password', validate(changePasswordSchema), (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = db.prepare('SELECT id, password FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const isValidPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!isValidPassword) {
      throw new ForbiddenError('当前密码错误');
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, userId);

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    next(error);
  }
});

router.get('/', requirePermission('user:manage'), (req, res, next) => {
  try {
    const users = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users').all();
    const formattedUsers = users.map(formatUser);
    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requirePermission('user:manage'), (req, res, next) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('user:manage'), validate(createUserSchema), (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      throw new ConflictError('用户名或邮箱已存在');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, 1)'
    ).run(username, email, hashedPassword, role);

    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: '用户创建成功', data: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('user:manage'), validate(updateUserSchema), (req, res, next) => {
  try {
    const { username, email, password, role, status } = req.body;
    const userId = parseInt(req.params.id);

    const existingUser = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(userId);
    if (!existingUser) {
      throw new NotFoundError('用户不存在');
    }

    if (username && username !== existingUser.username) {
      const duplicateUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
      if (duplicateUser) {
        throw new ConflictError('用户名已存在');
      }
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (duplicateEmail) {
        throw new ConflictError('邮箱已存在');
      }
    }

    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (password) {
      updates.push('password = ?');
      values.push(bcrypt.hashSync(password, 10));
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }

    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(userId);
    res.json({ success: true, message: '用户更新成功', data: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('user:manage'), (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      throw new ForbiddenError('不能删除自己的账户');
    }

    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    if (user.username === 'admin') {
      throw new ForbiddenError('不能删除管理员账户');
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

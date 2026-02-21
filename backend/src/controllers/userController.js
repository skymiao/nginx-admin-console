const { db } = require('../database');
const bcrypt = require('bcryptjs');

class UserController {
  async getAllUsers() {
    const users = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users ORDER BY created_at DESC').all();
    return users;
  }

  async getUserById(id) {
    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(id);
    return user;
  }

  async getUserProfile(id) {
    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(id);
    return user;
  }

  async createUser(userData) {
    const { username, email, password, role } = userData;

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      throw new Error('用户名或邮箱已存在');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, 1)'
    ).run(username, email, hashedPassword, role);

    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return user;
  }

  async updateUser(id, userData) {
    const { username, email, password, role, status } = userData;

    const existingUser = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      throw new Error('用户不存在');
    }

    if (username && username !== existingUser.username) {
      const duplicateUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (duplicateUser) {
        throw new Error('用户名已存在');
      }
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (duplicateEmail) {
        throw new Error('邮箱已存在');
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
      throw new Error('没有要更新的字段');
    }

    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(id);
    return user;
  }

  async updateUserProfile(id, userData) {
    const { email } = userData;

    const existingUser = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      throw new Error('用户不存在');
    }

    if (email && email !== existingUser.email) {
      const duplicateEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (duplicateEmail) {
        throw new Error('邮箱已存在');
      }
    }

    const updates = [];
    const values = [];

    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      throw new Error('没有要更新的字段');
    }

    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, username, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(id);
    return user;
  }

  async changePassword(id, passwordData) {
    const { currentPassword, newPassword } = passwordData;

    const user = db.prepare('SELECT id, password FROM users WHERE id = ?').get(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    const isValidPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('当前密码错误');
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, id);

    return true;
  }

  async deleteUser(id) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.username === 'admin') {
      throw new Error('不能删除管理员账户');
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return true;
  }

  async updateLastLogin(id) {
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    return true;
  }
}

module.exports = new UserController();

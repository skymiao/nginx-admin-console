const express = require('express');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('role:manage'), (req, res) => {
  const roles = db.prepare('SELECT * FROM roles').all();
  roles.forEach(role => {
    role.permissions = JSON.parse(role.permissions);
  });
  res.json({ success: true, data: roles });
});

router.get('/permissions', requirePermission('role:manage'), (req, res) => {
  const permissions = [
    { id: 'config:read', name: '查看配置', category: '配置管理' },
    { id: 'config:write', name: '编辑配置', category: '配置管理' },
    { id: 'config:delete', name: '删除配置', category: '配置管理' },
    { id: 'config:apply', name: '应用配置', category: '配置管理' },
    { id: 'upstream:read', name: '查看Upstream', category: 'Upstream管理' },
    { id: 'upstream:manage', name: '管理Upstream', category: 'Upstream管理' },
    { id: 'log:read', name: '查看日志', category: '日志管理' },
    { id: 'log:statistics', name: '日志统计', category: '日志管理' },
    { id: 'history:read', name: '查看历史', category: '历史管理' },
    { id: 'history:restore', name: '恢复历史', category: '历史管理' },
    { id: 'stats:read', name: '查看统计', category: '性能统计' },
    { id: 'user:manage', name: '用户管理', category: '用户管理' },
    { id: 'role:manage', name: '角色管理', category: '用户管理' },
    { id: 'server:read', name: '查看服务器', category: '服务器管理' },
    { id: 'server:manage', name: '管理服务器', category: '服务器管理' },
    { id: 'system:manage', name: '系统设置', category: '系统管理' },
  ];
  res.json({ success: true, data: permissions });
});

router.get('/:id', requirePermission('role:manage'), (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) {
    return res.status(404).json({ success: false, message: '角色不存在' });
  }
  role.permissions = JSON.parse(role.permissions);
  res.json({ success: true, data: role });
});

router.post('/', requirePermission('role:manage'), (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name || !description || !permissions) {
    return res.status(400).json({ success: false, message: '缺少必要字段' });
  }

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: '权限必须是数组' });
  }

  const existingRole = db.prepare('SELECT id FROM roles WHERE name = ?').get(name);
  if (existingRole) {
    return res.status(400).json({ success: false, message: '角色已存在' });
  }

  const result = db.prepare(
    'INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)'
  ).run(name, description, JSON.stringify(permissions));

  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(result.lastInsertRowid);
  role.permissions = JSON.parse(role.permissions);
  res.status(201).json({ success: true, message: '角色创建成功', data: role });
});

router.put('/:id', requirePermission('role:manage'), (req, res) => {
  const { name, description, permissions } = req.body;
  const roleId = parseInt(req.params.id);

  const existingRole = db.prepare('SELECT id, name FROM roles WHERE id = ?').get(roleId);
  if (!existingRole) {
    return res.status(404).json({ success: false, message: '角色不存在' });
  }

  if (existingRole.name === 'admin') {
    return res.status(403).json({ success: false, message: '不能修改管理员角色' });
  }

  if (name && name !== existingRole.name) {
    const duplicateRole = db.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').get(name, roleId);
    if (duplicateRole) {
      return res.status(400).json({ success: false, message: '角色名已存在' });
    }
  }

  const updates = [];
  const values = [];

  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description) {
    updates.push('description = ?');
    values.push(description);
  }
  if (permissions) {
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: '权限必须是数组' });
    }
    updates.push('permissions = ?');
    values.push(JSON.stringify(permissions));
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: '没有要更新的字段' });
  }

  values.push(roleId);
  db.prepare(`UPDATE roles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
  role.permissions = JSON.parse(role.permissions);
  res.json({ success: true, message: '角色更新成功', data: role });
});

router.delete('/:id', requirePermission('role:manage'), (req, res) => {
  const roleId = parseInt(req.params.id);

  const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(roleId);
  if (!role) {
    return res.status(404).json({ success: false, message: '角色不存在' });
  }

  if (role.name === 'admin') {
    return res.status(403).json({ success: false, message: '不能删除管理员角色' });
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role.name);
  if (userCount.count > 0) {
    return res.status(400).json({ success: false, message: '该角色下还有用户，无法删除' });
  }

  db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;

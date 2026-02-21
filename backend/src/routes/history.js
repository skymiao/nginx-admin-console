const express = require('express');
const fs = require('fs-extra');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

const formatToChinaTime = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return chinaTime.toISOString().replace('T', ' ').substring(0, 19);
};

router.use(authMiddleware);

router.get('/', requirePermission('config:read'), (req, res) => {
  const history = db.prepare('SELECT * FROM config_history ORDER BY created_at DESC').all();
  const formattedHistory = history.map(record => ({
    id: record.id,
    configPath: record.config_path,
    action: record.action,
    operator: record.operator,
    content: record.content,
    comment: record.comment,
    createdAt: formatToChinaTime(record.created_at)
  }));
  res.json({ success: true, data: formattedHistory });
});

router.get('/:id', requirePermission('config:read'), (req, res) => {
  const record = db.prepare('SELECT * FROM config_history WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, message: '历史记录不存在' });
  }
  const formattedRecord = {
    id: record.id,
    configPath: record.config_path,
    action: record.action,
    operator: record.operator,
    content: record.content,
    comment: record.comment,
    createdAt: formatToChinaTime(record.created_at)
  };
  res.json({ success: true, data: formattedRecord });
});

router.post('/:id/restore', requirePermission('config:write'), (req, res) => {
  const record = db.prepare('SELECT * FROM config_history WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, message: '历史记录不存在' });
  }

  try {
    fs.writeFileSync(record.config_path, record.content, 'utf8');

    db.prepare(`
      INSERT INTO config_history (config_path, action, operator, content, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      record.config_path,
      'restore',
      req.user.username,
      record.content,
      `从历史记录恢复 (ID: ${record.id})`
    );

    res.json({ success: true, message: '恢复成功' });
  } catch (error) {
    console.error('Failed to restore config:', error);
    res.status(500).json({ success: false, message: '恢复失败', error: error.message });
  }
});

module.exports = router;

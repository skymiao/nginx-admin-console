const express = require('express');
const { db } = require('../database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', requirePermission('setting:read'), (req, res) => {
  try {
    let query = 'SELECT * FROM server_log_formats ORDER BY created_at DESC';
    const formats = db.prepare(query).all();
    
    const result = formats.map(format => ({
      ...format,
      server_ips: format.server_ips ? JSON.parse(format.server_ips) : [],
      field_mapping: format.field_mapping ? JSON.parse(format.field_mapping) : []
    }));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[LogFormats] Error listing formats:', error);
    res.status(500).json({
      success: false,
      message: '获取日志格式失败',
      error: error.message
    });
  }
});

router.get('/:id', requirePermission('setting:read'), (req, res) => {
  try {
    const format = db.prepare('SELECT * FROM server_log_formats WHERE id = ?').get(req.params.id);
    
    if (!format) {
      return res.status(404).json({
        success: false,
        message: '日志格式不存在'
      });
    }
    
    const result = {
      ...format,
      server_ips: format.server_ips ? JSON.parse(format.server_ips) : []
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[LogFormats] Error getting format:', error);
    res.status(500).json({
      success: false,
      message: '获取日志格式失败',
      error: error.message
    });
  }
});

router.post('/', requirePermission('setting:manage'), (req, res) => {
  try {
    const { server_id, server_ips, format_name, format_pattern, field_mapping, description, is_active } = req.body;
    
    if (!server_ips || !Array.isArray(server_ips) || server_ips.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请至少选择一个服务器IP'
      });
    }
    
    if (!format_name || !format_pattern || !field_mapping) {
      return res.status(400).json({
        success: false,
        message: '缺少必要字段'
      });
    }
    
    const result = db.prepare(`
      INSERT INTO server_log_formats (server_id, server_ips, format_name, format_pattern, field_mapping, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      server_id || null,
      JSON.stringify(server_ips),
      format_name,
      format_pattern,
      field_mapping,
      description || null,
      is_active !== undefined ? (is_active ?1 : 0) : 1
    );
    
    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        ...req.body
      },
      message: '创建成功'
    });
  } catch (error) {
    console.error('[LogFormats] Error creating format:', error);
    res.status(500).json({
      success: false,
      message: '创建日志格式失败',
      error: error.message
    });
  }
});

router.put('/:id', requirePermission('setting:manage'), (req, res) => {
  try {
    const { server_id, server_ips, format_name, format_pattern, field_mapping, description, is_active } = req.body;
    
    const existing = db.prepare('SELECT id FROM server_log_formats WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '日志格式不存在'
      });
    }
    
    if (!server_ips || !Array.isArray(server_ips) || server_ips.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请至少选择一个服务器IP'
      });
    }
    
    db.prepare(`
      UPDATE server_log_formats 
      SET server_id = ?, server_ips = ?, format_name = ?, format_pattern = ?, 
          field_mapping = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      server_id || null,
      JSON.stringify(server_ips),
      format_name,
      format_pattern,
      field_mapping,
      description || null,
      is_active !== undefined ? (is_active ?1 : 0) : 1,
      req.params.id
    );
    
    res.json({
      success: true,
      data: {
        id: parseInt(req.params.id),
        ...req.body
      },
      message: '更新成功'
    });
  } catch (error) {
    console.error('[LogFormats] Error updating format:', error);
    res.status(500).json({
      success: false,
      message: '更新日志格式失败',
      error: error.message
    });
  }
});

router.delete('/:id', requirePermission('setting:manage'), (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM server_log_formats WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '日志格式不存在'
      });
    }
    
    db.prepare('DELETE FROM server_log_formats WHERE id = ?').run(req.params.id);
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('[LogFormats] Error deleting format:', error);
    res.status(500).json({
      success: false,
      message: '删除日志格式失败',
      error: error.message
    });
  }
});

router.post('/test', requirePermission('setting:read'), (req, res) => {
  try {
    const { format_pattern, field_mapping, sample_log } = req.body;
    
    if (!format_pattern || !field_mapping || !sample_log) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    const regex = new RegExp(format_pattern);
    const match = sample_log.match(regex);
    
    if (!match) {
      return res.json({
        success: false,
        message: '日志行不匹配该格式',
        data: {
          matched: false
        }
      });
    }
    
    const mapping = JSON.parse(field_mapping);
    const result = {};
    
    for (const [field, index] of Object.entries(mapping)) {
      result[field] = match[index];
    }
    
    res.json({
      success: true,
      data: {
        matched: true,
        fields: result
      },
      message: '格式匹配成功'
    });
  } catch (error) {
    console.error('[LogFormats] Error testing format:', error);
    res.json({
      success: false,
      message: '格式测试失败',
      error: error.message
    });
  }
});

module.exports = router;

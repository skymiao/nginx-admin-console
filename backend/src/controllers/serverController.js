const { db } = require('../database');

class ServerController {
  async getAllServers() {
    const servers = db.prepare('SELECT * FROM servers ORDER BY created_at DESC').all();
    return servers;
  }

  async getServerById(id) {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
    return server;
  }

  async createServer(serverData) {
    const { name, host, port, username, password, privateKey, useSudo, nginxConfigPath, nginxLogPath, nginxStatusUrl } = serverData;

    const result = db.prepare(`
      INSERT INTO servers (name, host, port, username, password, private_key, use_sudo, nginx_config_path, nginx_log_path, nginx_status_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(name, host, port, username, password, privateKey, useSudo ? 1 : 0, nginxConfigPath, nginxLogPath, nginxStatusUrl);

    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(result.lastInsertRowid);
    return server;
  }

  async updateServer(id, serverData) {
    const { name, host, port, username, password, privateKey, useSudo, nginxConfigPath, nginxLogPath, nginxStatusUrl, status } = serverData;

    const existingServer = db.prepare('SELECT id FROM servers WHERE id = ?').get(id);
    if (!existingServer) {
      throw new Error('服务器不存在');
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (host) {
      updates.push('host = ?');
      values.push(host);
    }
    if (port) {
      updates.push('port = ?');
      values.push(port);
    }
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (password !== undefined) {
      updates.push('password = ?');
      values.push(password);
    }
    if (privateKey !== undefined) {
      updates.push('private_key = ?');
      values.push(privateKey);
    }
    if (useSudo !== undefined) {
      updates.push('use_sudo = ?');
      values.push(useSudo ? 1 : 0);
    }
    if (nginxConfigPath) {
      updates.push('nginx_config_path = ?');
      values.push(nginxConfigPath);
    }
    if (nginxLogPath) {
      updates.push('nginx_log_path = ?');
      values.push(nginxLogPath);
    }
    if (nginxStatusUrl !== undefined) {
      updates.push('nginx_status_url = ?');
      values.push(nginxStatusUrl);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new Error('没有要更新的字段');
    }

    values.push(id);
    db.prepare(`UPDATE servers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
    return server;
  }

  async deleteServer(id) {
    const server = db.prepare('SELECT name FROM servers WHERE id = ?').get(id);
    if (!server) {
      throw new Error('服务器不存在');
    }

    db.prepare('DELETE FROM servers WHERE id = ?').run(id);
    return true;
  }

  async testConnection(serverData) {
    const { executeRemoteCommand } = require('../utils/ssh');
    try {
      const { output } = await executeRemoteCommand(serverData, 'echo "connection test"');
      return { success: true, message: '连接成功', output };
    } catch (error) {
      return { success: false, message: '连接失败', error: error.message };
    }
  }
}

module.exports = new ServerController();

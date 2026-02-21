const { executeRemoteCommand } = require('../utils/ssh');

class ServerService {
  async getAllServers() {
    const { db } = require('../database');
    const servers = db.prepare('SELECT * FROM servers ORDER BY created_at DESC').all();
    return servers;
  }

  async getServerById(id) {
    const { db } = require('../database');
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
    return server;
  }

  async testConnection(serverData) {
    try {
      const { output } = await executeRemoteCommand(serverData, 'echo "connection test"');
      return { success: true, message: '连接成功', output };
    } catch (error) {
      return { success: false, message: '连接失败', error: error.message };
    }
  }

  async reloadNginx(serverId) {
    const server = await this.getServerById(serverId);
    if (!server) {
      throw new Error('服务器不存在');
    }

    const command = server.use_sudo ? 'sudo nginx -s reload' : 'nginx -s reload';
    await executeRemoteCommand(server, command);

    return { success: true, message: 'Nginx 重载成功' };
  }

  async validateNginx(serverId) {
    const server = await this.getServerById(serverId);
    if (!server) {
      throw new Error('服务器不存在');
    }

    const command = server.use_sudo ? 'sudo nginx -t' : 'nginx -t';
    await executeRemoteCommand(server, command);

    return { success: true, message: 'Nginx 配置验证通过' };
  }

  async getNginxStatus(serverId) {
    const server = await this.getServerById(serverId);
    if (!server) {
      throw new Error('服务器不存在');
    }

    if (!server.nginx_status_url) {
      throw new Error('未配置 Nginx 状态 URL');
    }

    const axios = require('axios');
    const response = await axios.get(server.nginx_status_url, {
      timeout: 5000,
    });

    const data = response.data;
    return {
      activeConnections: data.active || 0,
      accepts: data.accepts || 0,
      handled: data.handled || 0,
      requests: data.requests || 0,
      reading: data.reading || 0,
      writing: data.writing || 0,
      waiting: data.waiting || 0,
    };
  }
}

module.exports = new ServerService();

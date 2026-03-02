const { db } = require('../database');
const { decryptPassword, decryptPrivateKey } = require('./crypto');
const { executeWithPool, closeAllPools } = require('./sshPool');

const executeRemoteCommand = async (server, command) => {
  const serverWithCredentials = {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };

  return executeWithPool(serverWithCredentials, command);
};

const getServer = (serverId) => {
  if (!serverId || serverId === 'local') {
    const defaultServer = db.prepare('SELECT * FROM servers WHERE is_default = 1').get();
    if (!defaultServer) return null;
    
    return {
      ...defaultServer,
      password: defaultServer.password ? decryptPassword(defaultServer.password) : null,
      private_key: defaultServer.private_key ? decryptPrivateKey(defaultServer.private_key) : null,
    };
  }

  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  if (!server) return null;
  
  return {
    ...server,
    password: server.password ? decryptPassword(server.password) : null,
    private_key: server.private_key ? decryptPrivateKey(server.private_key) : null,
  };
};

module.exports = {
  executeRemoteCommand,
  getServer,
};

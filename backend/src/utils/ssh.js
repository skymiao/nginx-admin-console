const { Client } = require('ssh2');
const { db } = require('../database');
const { decryptPassword, decryptPrivateKey } = require('./crypto');

const executeRemoteCommand = (server, command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    let output = '';
    let error = '';
    let commandTimeout;

    const finalCommand = server.use_sudo ? `sudo ${command}` : command;

    conn.on('ready', () => {
      conn.exec(finalCommand, (err, stream) => {
        if (err) {
          if (commandTimeout) {
            clearTimeout(commandTimeout);
          }
          conn.end();
          return reject(err);
        }

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          error += data.toString();
        });

        stream.on('close', (code) => {
          if (commandTimeout) {
            clearTimeout(commandTimeout);
          }
          conn.end();
          if (code === 0) {
            resolve({ output, error });
          } else {
            reject(new Error(`Command failed with code ${code}: ${error}`));
          }
        });
      });
    });

    conn.on('error', (err) => {
      if (commandTimeout) {
        clearTimeout(commandTimeout);
      }
      reject(err);
    });

    const config = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 60000,
      connectTimeout: 60000,
      keepaliveInterval: 30000,
    };

    const password = server.password ? decryptPassword(server.password) : null;
    const privateKey = server.private_key ? decryptPrivateKey(server.private_key) : null;

    if (privateKey) {
      config.privateKey = privateKey;
    } else if (password) {
      config.password = password;
    }

    commandTimeout = setTimeout(() => {
      conn.end();
      reject(new Error('Command execution timeout'));
    }, 120000);

    conn.connect(config);
  });
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

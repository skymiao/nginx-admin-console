const { Client } = require('ssh2');
const { db } = require('../database');

const executeRemoteCommand = (server, command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    let output = '';
    let error = '';

    const finalCommand = server.use_sudo ? `sudo ${command}` : command;

    conn.on('ready', () => {
      conn.exec(finalCommand, (err, stream) => {
        if (err) {
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
      reject(err);
    });

    const config = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
    };

    if (server.private_key) {
      config.privateKey = server.private_key;
    } else {
      config.password = server.password;
    }

    conn.connect(config);
  });
};

const getServer = (serverId) => {
  if (!serverId || serverId === 'local') {
    const defaultServer = db.prepare('SELECT * FROM servers WHERE is_default = 1').get();
    return defaultServer || null;
  }

  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
  return server;
};

module.exports = {
  executeRemoteCommand,
  getServer,
};

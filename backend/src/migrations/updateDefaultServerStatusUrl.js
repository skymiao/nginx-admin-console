const { db } = require('../database');

const updateDefaultServerStatusUrl = () => {
  try {
    const defaultServer = db.prepare('SELECT * FROM servers WHERE is_default = 1').get();
    
    if (defaultServer && !defaultServer.nginx_status_url) {
      db.prepare('UPDATE servers SET nginx_status_url = ? WHERE is_default = 1')
        .run('http://localhost/nginx_status');
      console.log('Default server nginx_status_url updated');
    } else if (defaultServer) {
      console.log('Default server already has nginx_status_url:', defaultServer.nginx_status_url);
    } else {
      console.log('No default server found');
    }
  } catch (error) {
    console.error('Error updating default server nginx_status_url:', error);
  }
};

module.exports = {
  updateDefaultServerStatusUrl
};

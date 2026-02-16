const { db } = require('../database');

const updateRolePermissions = () => {
  try {
    const roles = db.prepare('SELECT * FROM roles').all();
    
    roles.forEach(role => {
      let permissions = JSON.parse(role.permissions);
      
      const newPermissions = {
        admin: [
          'config:read', 'config:write', 'config:delete', 'config:apply',
          'upstream:read', 'upstream:manage',
          'log:read', 'history:read', 'history:restore', 'stats:read',
          'user:manage', 'role:manage',
          'server:read', 'server:manage',
          'system:manage'
        ],
        developer: [
          'config:read', 'config:write', 'config:apply',
          'upstream:read', 'upstream:manage',
          'log:read', 'history:read', 'stats:read',
          'server:read'
        ],
        viewer: [
          'config:read',
          'upstream:read',
          'log:read', 'history:read', 'stats:read',
          'server:read'
        ]
      };

      if (newPermissions[role.name]) {
        db.prepare('UPDATE roles SET permissions = ? WHERE name = ?')
          .run(JSON.stringify(newPermissions[role.name]), role.name);
        console.log(`Updated permissions for role: ${role.name}`);
      }
    });

    console.log('Role permissions updated successfully');
  } catch (error) {
    console.error('Error updating role permissions:', error);
  }
};

module.exports = {
  updateRolePermissions
};

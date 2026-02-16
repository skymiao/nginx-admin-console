const { db } = require('../database');

const updateRolePermissions = () => {
  try {
    console.log('开始更新角色权限...');

    const allPermissions = [
      'config:read',
      'config:write',
      'config:delete',
      'config:apply',
      'upstream:read',
      'upstream:manage',
      'log:read',
      'log:statistics',
      'history:read',
      'history:restore',
      'stats:read',
      'user:manage',
      'role:manage',
      'server:read',
      'server:manage',
      'system:manage',
    ];

    const adminRole = db.prepare('SELECT * FROM roles WHERE name = ?').get('admin');
    if (adminRole) {
      const currentPermissions = JSON.parse(adminRole.permissions);
      const missingPermissions = allPermissions.filter(p => !currentPermissions.includes(p));
      
      if (missingPermissions.length > 0) {
        const updatedPermissions = [...currentPermissions, ...missingPermissions];
        db.prepare('UPDATE roles SET permissions = ? WHERE name = ?')
          .run(JSON.stringify(updatedPermissions), 'admin');
        console.log('管理员角色权限已更新，新增权限:', missingPermissions);
      } else {
        console.log('管理员角色权限已是最新');
      }
    } else {
      console.log('未找到管理员角色');
    }

    const developerRole = db.prepare('SELECT * FROM roles WHERE name = ?').get('developer');
    if (developerRole) {
      const developerPermissions = [
        'config:read',
        'config:write',
        'config:apply',
        'upstream:read',
        'upstream:manage',
        'log:read',
        'log:statistics',
        'history:read',
        'history:restore',
        'stats:read',
        'server:read',
      ];
      
      const currentPermissions = JSON.parse(developerRole.permissions);
      const updatedPermissions = [...new Set([...currentPermissions, ...developerPermissions])];
      
      db.prepare('UPDATE roles SET permissions = ? WHERE name = ?')
        .run(JSON.stringify(updatedPermissions), 'developer');
      console.log('开发者角色权限已更新');
    }

    const viewerRole = db.prepare('SELECT * FROM roles WHERE name = ?').get('viewer');
    if (viewerRole) {
      const viewerPermissions = [
        'config:read',
        'upstream:read',
        'log:read',
        'log:statistics',
        'history:read',
        'stats:read',
        'server:read',
      ];
      
      const currentPermissions = JSON.parse(viewerRole.permissions);
      const updatedPermissions = [...new Set([...currentPermissions, ...viewerPermissions])];
      
      db.prepare('UPDATE roles SET permissions = ? WHERE name = ?')
        .run(JSON.stringify(updatedPermissions), 'viewer');
      console.log('查看者角色权限已更新');
    }

    console.log('角色权限更新完成');
  } catch (error) {
    console.error('更新角色权限失败:', error);
  }
};

module.exports = { updateRolePermissions };

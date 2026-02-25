const { db } = require('../database');

const migrate = () => {
  console.log('Running migration: Add setting permissions to roles...');
  
  try {
    const roles = db.prepare('SELECT * FROM roles').all();
    
    roles.forEach(role => {
      const permissions = JSON.parse(role.permissions);
      
      const permissionsToAdd = [];
      if (!permissions.includes('setting:read')) {
        permissionsToAdd.push('setting:read');
      }
      if (!permissions.includes('setting:manage')) {
        permissionsToAdd.push('setting:manage');
      }
      
      if (permissionsToAdd.length > 0) {
        const updatedPermissions = [...permissions, ...permissionsToAdd];
        db.prepare('UPDATE roles SET permissions = ? WHERE id = ?')
          .run(JSON.stringify(updatedPermissions), role.id);
        
        console.log(`Updated permissions for role ${role.name}:`, permissionsToAdd);
      }
    });
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error adding setting permissions:', error);
    throw error;
  }
};

module.exports = { migrate };

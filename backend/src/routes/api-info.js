const express = require('express');
const router = express.Router();

const apiEndpoints = [
  {
    category: '认证',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: '用户登录',
        requiresAuth: false,
        rateLimit: '5次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        description: '用户登出',
        requiresAuth: true,
        rateLimit: '无限制'
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        description: '获取当前用户信息',
        requiresAuth: true,
        rateLimit: '无限制'
      }
    ]
  },
  {
    category: '用户管理',
    endpoints: [
      {
        method: 'GET',
        path: '/api/users',
        description: '获取用户列表',
        requiresAuth: true,
        permission: 'user:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/users/:id',
        description: '获取用户详情',
        requiresAuth: true,
        permission: 'user:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/users',
        description: '创建用户',
        requiresAuth: true,
        permission: 'user:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'PUT',
        path: '/api/users/:id',
        description: '更新用户',
        requiresAuth: true,
        permission: 'user:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'DELETE',
        path: '/api/users/:id',
        description: '删除用户',
        requiresAuth: true,
        permission: 'user:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/users/profile/me',
        description: '获取当前用户资料',
        requiresAuth: true,
        rateLimit: '无限制'
      },
      {
        method: 'PUT',
        path: '/api/users/profile/me',
        description: '更新当前用户资料',
        requiresAuth: true,
        rateLimit: '无限制'
      },
      {
        method: 'PUT',
        path: '/api/users/profile/me/password',
        description: '修改当前用户密码',
        requiresAuth: true,
        rateLimit: '无限制'
      }
    ]
  },
  {
    category: '角色管理',
    endpoints: [
      {
        method: 'GET',
        path: '/api/roles',
        description: '获取角色列表',
        requiresAuth: true,
        permission: 'role:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/roles/permissions',
        description: '获取所有权限',
        requiresAuth: true,
        permission: 'role:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/roles/:id',
        description: '获取角色详情',
        requiresAuth: true,
        permission: 'role:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/roles',
        description: '创建角色',
        requiresAuth: true,
        permission: 'role:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'PUT',
        path: '/api/roles/:id',
        description: '更新角色',
        requiresAuth: true,
        permission: 'role:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'DELETE',
        path: '/api/roles/:id',
        description: '删除角色',
        requiresAuth: true,
        permission: 'role:manage',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '配置文件管理',
    endpoints: [
      {
        method: 'GET',
        path: '/api/configs',
        description: '获取配置文件列表',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/configs/content',
        description: '获取配置文件内容',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/configs/:path(*)',
        description: '获取指定配置文件',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/configs',
        description: '创建配置文件',
        requiresAuth: true,
        permission: 'config:write',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'PUT',
        path: '/api/configs/:path(*)',
        description: '更新配置文件',
        requiresAuth: true,
        permission: 'config:write',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'DELETE',
        path: '/api/configs/:path(*)',
        description: '删除配置文件',
        requiresAuth: true,
        permission: 'config:delete',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/configs/validate',
        description: '验证配置文件',
        requiresAuth: true,
        permission: 'config:write',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/configs/apply',
        description: '应用配置文件',
        requiresAuth: true,
        permission: 'config:apply',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/configs/:path(*)/disable',
        description: '禁用配置文件',
        requiresAuth: true,
        permission: 'config:write',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/configs/:path(*)/enable',
        description: '启用配置文件',
        requiresAuth: true,
        permission: 'config:write',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '日志管理',
    endpoints: [
      {
        method: 'GET',
        path: '/api/logs/files',
        description: '获取日志文件列表',
        requiresAuth: true,
        permission: 'log:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/logs/access',
        description: '获取访问日志',
        requiresAuth: true,
        permission: 'log:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/logs/error',
        description: '获取错误日志',
        requiresAuth: true,
        permission: 'log:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/logs/trend',
        description: '获取日志趋势',
        requiresAuth: true,
        permission: 'log:read',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '日志统计',
    endpoints: [
      {
        method: 'GET',
        path: '/api/log-statistics/statistics',
        description: '获取日志统计',
        requiresAuth: true,
        permission: 'log:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/log-statistics/trends',
        description: '获取日志趋势',
        requiresAuth: true,
        permission: 'log:read',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '历史记录',
    endpoints: [
      {
        method: 'GET',
        path: '/api/history',
        description: '获取历史记录列表',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/history/:id',
        description: '获取历史记录详情',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/history/:id/restore',
        description: '恢复历史记录',
        requiresAuth: true,
        permission: 'config:write',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '系统设置',
    endpoints: [
      {
        method: 'GET',
        path: '/api/settings',
        description: '获取系统设置',
        requiresAuth: true,
        permission: 'system:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'PUT',
        path: '/api/settings',
        description: '更新系统设置',
        requiresAuth: true,
        permission: 'system:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/settings/test',
        description: '测试设置',
        requiresAuth: true,
        permission: 'system:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/settings/info',
        description: '获取系统信息',
        requiresAuth: true,
        permission: 'system:manage',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: 'Nginx管理',
    endpoints: [
      {
        method: 'POST',
        path: '/api/nginx/reload',
        description: '重载Nginx配置',
        requiresAuth: true,
        permission: 'config:apply',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/nginx/validate',
        description: '验证Nginx配置',
        requiresAuth: true,
        permission: 'config:write',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/nginx/status',
        description: '获取Nginx状态',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: 'Upstream管理',
    endpoints: [
      {
        method: 'GET',
        path: '/api/upstreams',
        description: '获取Upstream列表',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/upstreams/stats',
        description: '获取Upstream统计',
        requiresAuth: true,
        permission: 'config:read',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '服务器管理',
    endpoints: [
      {
        method: 'GET',
        path: '/api/servers',
        description: '获取服务器列表',
        requiresAuth: true,
        permission: 'server:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/servers/:id',
        description: '获取服务器详情',
        requiresAuth: true,
        permission: 'server:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/servers',
        description: '添加服务器',
        requiresAuth: true,
        permission: 'server:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'PUT',
        path: '/api/servers/:id',
        description: '更新服务器',
        requiresAuth: true,
        permission: 'server:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'DELETE',
        path: '/api/servers/:id',
        description: '删除服务器',
        requiresAuth: true,
        permission: 'server:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/servers/test-connection',
        description: '测试服务器连接',
        requiresAuth: true,
        permission: 'server:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/servers/execute-command',
        description: '执行服务器命令',
        requiresAuth: true,
        permission: 'server:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/servers/reload-nginx',
        description: '重载服务器Nginx',
        requiresAuth: true,
        permission: 'server:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/servers/nginx-status',
        description: '获取服务器Nginx状态',
        requiresAuth: true,
        permission: 'server:read',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '性能统计',
    endpoints: [
      {
        method: 'GET',
        path: '/api/stats',
        description: '获取性能统计',
        requiresAuth: true,
        permission: 'server:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/stats/history',
        description: '获取历史统计',
        requiresAuth: true,
        permission: 'server:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/stats/record',
        description: '记录统计数据',
        requiresAuth: true,
        permission: 'server:manage',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '日志格式管理',
    endpoints: [
      {
        method: 'GET',
        path: '/api/log-formats',
        description: '获取日志格式列表',
        requiresAuth: true,
        permission: 'setting:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'GET',
        path: '/api/log-formats/:id',
        description: '获取日志格式详情',
        requiresAuth: true,
        permission: 'setting:read',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/log-formats',
        description: '创建日志格式',
        requiresAuth: true,
        permission: 'setting:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'PUT',
        path: '/api/log-formats/:id',
        description: '更新日志格式',
        requiresAuth: true,
        permission: 'setting:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'DELETE',
        path: '/api/log-formats/:id',
        description: '删除日志格式',
        requiresAuth: true,
        permission: 'setting:manage',
        rateLimit: '100次/15分钟'
      },
      {
        method: 'POST',
        path: '/api/log-formats/test',
        description: '测试日志格式',
        requiresAuth: true,
        permission: 'setting:read',
        rateLimit: '100次/15分钟'
      }
    ]
  },
  {
    category: '系统',
    endpoints: [
      {
        method: 'GET',
        path: '/health',
        description: '系统健康检查',
        requiresAuth: false,
        rateLimit: '无限制'
      }
    ]
  }
];

router.get('/endpoints', (req, res) => {
  res.json({
    success: true,
    data: apiEndpoints
  });
});

module.exports = router;

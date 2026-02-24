# Nginx 管理控制台

一个基于 React 和 Node.js 的 Nginx 配置管理控制台，支持分布式管理多台 Nginx 服务器，提供配置文件管理、日志查看、Upstream 监控、性能统计、日志统计、用户权限管理等功能。

## 功能特性

### 核心功能
- **配置文件管理**: 查看、编辑、创建、删除、启用/禁用 Nginx 配置文件
  - 支持本地和远程服务器管理
  - 支持 .conf 和 .stream 配置文件
  - 配置验证和应用功能
  - Monaco Editor 代码编辑器

- **日志查看**: 实时查看访问日志和错误日志
  - 支持本地和远程服务器管理
  - 支持按配置文件过滤
  - 关键字搜索功能（IP、请求路径等）
  - 高性能日志解析
  - 最新日志置顶显示
  - 长日志条目折叠功能
  - 日志格式模板系统（支持自定义格式）
  - 自定义列功能（从日志中提取自定义字段）
  - 双视图模式（列视图/原始视图）
  - 自动统计日志条目总数
  - 支持多种预设日志格式（Nginx Default、Combined、Common、JSON、Custom App）
  - 日志格式正则表达式自动匹配
  - 优化的 UI 布局和交互体验

- **日志统计**: 基于访问日志的统计分析
  - 总请求数、独立访客数、总流量统计
  - 成功率、错误率分析
  - 状态码分布（200、4xx、5xx）
  - 请求方法分布（GET、POST、PUT、DELETE等）
  - 热门路径 Top 10
  - 热门 IP Top 10
  - 访问趋势分析（按天统计）
  - 支持多时间范围查询

- **Upstream 管理**: 监控和管理 Nginx Upstream 配置
  - 实时显示后端服务器状态
  - 健康状态监控
  - 点击配置文件直接跳转编辑
  - 支持远程服务器管理
  - 负载均衡算法选择（轮询、最少连接、IP哈希、随机）
  - 备份服务器管理

- **性能统计**: Nginx stub_status 实时监控
  - 活跃连接数
  - 总请求数、已处理数、已接受数
  - 正在读取、写入、等待的连接数
  - 请求速率统计
  - 历史数据记录和趋势分析
  - 支持多服务器监控
  - 可配置 nginx_status_url

- **服务器管理**: 分布式管理多台 Nginx 服务器
  - 添加、编辑、删除服务器
  - SSH 连接测试
  - 支持密码和私钥认证
  - 本地服务器默认配置
  - 支持 sudo 权限委派
  - 可配置 nginx 配置路径、日志路径、状态地址

### 系统管理
- **仪表盘**: 系统概览和关键指标展示
  - 24小时请求趋势图
  - 状态码分布统计
  - 请求方法分布（GET、POST、PUT、DELETE等）
  - 系统概览统计（总请求数、成功率、错误率等）
  - 支持多服务器切换查看
  - 实时数据更新

- **历史记录**: 配置文件变更历史记录，支持回滚
  - 东八时区时间显示
  - 操作记录和内容恢复

- **用户管理**: 用户账号管理，支持创建、编辑、删除用户
  - 创建时间记录
  - 最后登录时间跟踪
  - 用户状态管理

- **角色权限**: 基于角色的权限管理系统
  - 细粒度权限控制
  - 支持自定义角色
  - 菜单根据权限动态显示
  - 完整的权限体系

- **系统设置**: 配置 Nginx 路径、日志路径、nginx_status_url 等系统参数

### UI/UX 设计
- 基于 UI UX Pro Max 设计系统
- 响应式布局，支持移动端
- 深色/浅色主题切换
- 统计卡片展示关键指标
- 实时数据刷新
- 流畅的动画效果

## 技术栈

### 前端
- React 18
- Ant Design 5.x
- React Router 6
- Axios
- Monaco Editor
- React Hooks
- TypeScript (部分模块)
- React Query (服务端状态管理)

### 后端
- Node.js 16+
- Express
- SQLite (better-sqlite3)
- JWT 认证
- bcryptjs
- SSH2 (远程服务器管理)
- Glob (文件匹配)
- Zod (输入验证)
- Express Rate Limit (速率限制)

### 部署
- Docker & Docker Compose
- Nginx 反向代理
- 数据持久化

## 性能优化

### 已完成的优化

#### 后端优化
- **数据库索引**: 为所有表添加索引，查询性能提升 70-90%
- **输入验证**: 使用 Zod 进行完整的输入验证
- **错误处理**: 统一的错误处理中间件和自定义错误类
- **速率限制**: 防止 API 滥用，保护服务器资源
  - **登录接口**: 15分钟内最多 5 次请求
  - **通用 API**: 15分钟内最多 100 次请求
  - **严格限制**: 1小时内最多 10 次请求
  - **健康检查**: 不受速率限制
- **安全增强**: Helmet 安全头、CORS 配置、响应压缩
- **控制器层**: 分离业务逻辑，提升代码可维护性
- **服务层**: 封装业务逻辑，便于复用和测试
- **API 响应格式统一**: 统一所有 API 响应格式为 `{ success: true, data: ... }`
- **日志路由优化**: 统一日志 API 响应格式，修复日志查看功能
- **统计路由优化**: 统一统计 API 响应格式，修复性能统计功能
- **Nginx 路由优化**: 统一 Nginx API 响应格式，提升稳定性
- **数据库表优化**: 添加 nginx_stats_history 表，支持性能统计历史记录

#### 前端优化
- **TypeScript 类型定义**: 完整的类型定义，提升代码质量
- **可复用 UI 组件**: 创建 5 个通用组件，减少重复代码
- **代码分割和懒加载**: 首屏加载时间减少 50-60%
- **React Query 集成**: 服务端状态管理，自动缓存和重新验证
- **组件性能优化**: 使用 React.memo、useMemo、useCallback
- **API 数据访问修复**: 修复所有页面空白问题，统一使用 `response.data?.data` 访问数据
- **配置文件编辑修复**: 修复配置文件编辑弹框没有内容展示的问题
- **日志查看修复**: 修复日志列表和日志详情无法加载的问题
- **UI/UX 优化**: 基于 ui-ux-pro-max 技能进行全面优化
- **分页功能修复**: 修复前端分页功能，支持自定义每页显示数量
- **错误日志修复**: 修复错误日志空白页问题，添加空状态处理
- **配置验证修复**: 修复配置文件验证功能，正确显示验证结果
- **性能统计修复**: 修复性能统计功能，添加数据库表和错误处理

### 性能提升数据

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 数据库查询时间 | 100-300ms | 10-50ms | 70-90% |
| 首屏加载时间 | 3-5s | 1-2s | 50-60% |
| Bundle 大小 | 2-3MB | 500KB-1MB | 60-70% |
| 页面空白问题 | 有 | 无 | ✅ |
| 配置文件编辑 | 无内容 | 正常显示 | ✅ |
| 日志查看功能 | 无法加载 | 正常显示 | ✅ |
| 前端分页功能 | 失效 | 正常工作 | ✅ |
| 错误日志查看 | 空白页 | 正常显示 | ✅ |
| 配置文件验证 | undefined | 正确显示 | ✅ |
| 性能统计功能 | 加载失败 | 正常显示 | ✅ |

详细的优化报告请查看：
- [优化完成报告](./OPTIMIZATION_COMPLETED.md)
- [优化实施报告](./OPTIMIZATION_REPORT.md)
- [分页功能修复](./PAGINATION_FIX.md)
- [错误日志修复](./ERROR_LOG_FIX.md)
- [配置验证修复](./CONFIG_VALIDATE_FIX.md)
- [性能统计修复](./STATS_FIX.md)
- [API 速率限制](./API_RATE_LIMIT.md)

## 快速开始

### 前置要求

- Node.js >= 16
- npm 或 yarn
- Nginx (用于实际管理)
- Docker (可选，用于容器化部署)

### 安装依赖

#### 前端
```bash
cd frontend
npm install
```

#### 后端
```bash
cd backend
npm install
```

### 配置环境变量

后端需要创建 `.env` 文件：

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this-in-production
NGINX_CONFIG_PATH=/etc/nginx
NGINX_LOG_PATH=/var/log/nginx
DB_PATH=/tmp/nginx-admin.db
```

### 启动服务

#### 使用 Docker Compose（推荐）
```bash
docker-compose up -d
```

#### 手动启动

启动后端：
```bash
cd backend
npm start
```

启动前端：
```bash
cd frontend
npm start
```

### 默认账号

- 用户名: `admin`
- 密码: `admin123`

**注意**: 首次登录后请立即修改默认密码！

## 项目结构

```
nginx-admin-console/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/       # 公共组件
│   │   │   └── Layout.js      # 布局组件
│   │   ├── pages/           # 页面组件
│   │   │   ├── ConfigFiles.js      # 配置文件管理
│   │   │   ├── Logs.js            # 日志查看
│   │   │   ├── LogStatistics.js   # 日志统计
│   │   │   ├── Upstreams.js       # Upstream 管理
│   │   │   ├── Servers.js         # 服务器管理
│   │   │   ├── Stats.js           # 性能统计
│   │   │   ├── Users.js           # 用户管理
│   │   │   ├── Roles.js           # 角色管理
│   │   │   ├── History.js         # 历史记录
│   │   │   ├── Settings.js        # 系统设置
│   │   │   ├── Dashboard.js       # 仪表盘
│   │   │   └── Login.js          # 登录页面
│   │   ├── services/        # API 服务
│   │   │   └── api.js           # API 统一管理
│   │   ├── utils/           # 工具函数
│   │   │   ├── auth.js          # 认证工具
│   │   │   └── theme.js         # 主题配置
│   │   ├── App.js           # 应用入口
│   │   └── index.js         # React 入口
│   ├── package.json
│   └── public/
└── backend/                  # 后端项目
    ├── src/
    │   ├── routes/          # 路由
    │   │   ├── configs.js        # 配置文件路由
    │   │   ├── logs.js           # 日志路由
    │   │   ├── log-statistics.js # 日志统计路由
    │   │   ├── upstreams.js     # Upstream 路由
    │   │   ├── servers.js       # 服务器路由
    │   │   ├── servers-crud.js  # 服务器 CRUD 路由
    │   │   ├── users.js         # 用户路由
    │   │   ├── roles.js         # 角色路由
    │   │   ├── history.js       # 历史记录路由
    │   │   ├── settings.js      # 系统设置路由
    │   │   ├── nginx.js         # Nginx 操作路由
    │   │   ├── stats.js         # 性能统计路由
    │   │   └── auth.js          # 认证路由
    │   ├── middleware/      # 中间件
    │   │   └── auth.js          # JWT 认证中间件
    │   ├── migrations/      # 数据库迁移
    │   │   ├── createUsersTable.js
    │   │   ├── createRolesTable.js
    │   │   ├── createServersTable.js
    │   │   ├── createHistoryTable.js
    │   │   ├── createStatsTable.js
    │   │   ├── addLastLoginAt.js
    │   │   ├── addNginxStatusUrl.js
    │   │   ├── addSudoSupport.js
    │   │   ├── updateRolePermissions.js
    │   │   └── updateDefaultServerStatusUrl.js
    │   ├── utils/           # 工具函数
    │   │   └── ssh.js           # SSH 工具
    │   ├── database.js      # 数据库初始化
    │   └── index.js        # 应用入口
    ├── data/                 # 数据持久化目录
    ├── package.json
    └── .env                # 环境变量
```

## API 文档

### 认证
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 用户管理
- `GET /api/users` - 获取用户列表
- `GET /api/users/:id` - 获取用户详情
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 角色管理
- `GET /api/roles` - 获取角色列表
- `GET /api/roles/:id` - 获取角色详情
- `GET /api/roles/permissions` - 获取权限列表
- `POST /api/roles` - 创建角色
- `PUT /api/roles/:id` - 更新角色
- `DELETE /api/roles/:id` - 删除角色

### 服务器管理
- `GET /api/servers` - 获取服务器列表
- `GET /api/servers/:id` - 获取服务器详情
- `POST /api/servers` - 创建服务器
- `PUT /api/servers/:id` - 更新服务器
- `DELETE /api/servers/:id` - 删除服务器
- `POST /api/servers/test-connection` - 测试 SSH 连接
- `POST /api/servers/reload-nginx` - 重载远程 Nginx
- `GET /api/servers/nginx-status` - 获取远程 Nginx 状态

### 配置文件管理
- `GET /api/configs` - 获取配置文件列表（支持 serverId 参数）
- `GET /api/configs/content` - 获取配置文件内容（支持 serverId 参数）
- `POST /api/configs` - 创建配置文件（支持 serverId 参数）
- `PUT /api/configs/:path` - 更新配置文件（支持 serverId 参数）
- `DELETE /api/configs/:path` - 删除配置文件（支持 serverId 参数）
- `POST /api/configs/validate` - 验证配置（支持 serverId 参数）
- `POST /api/configs/apply` - 应用配置（支持 serverId 参数）
- `POST /api/configs/:path/disable` - 禁用配置文件（支持 serverId 参数）
- `POST /api/configs/:path/enable` - 启用配置文件（支持 serverId 参数）

### Upstream 管理
- `GET /api/upstreams` - 获取 Upstream 列表（支持 serverId 参数）
- `GET /api/upstreams/stats` - 获取 Upstream 统计信息（支持 serverId 参数）

### 日志查看
- `GET /api/logs/files` - 获取日志文件列表
- `GET /api/logs/access` - 获取访问日志（支持 lines、file、keyword、serverId 参数）
- `GET /api/logs/error` - 获取错误日志（支持 lines、file、keyword、serverId 参数）

### 日志统计
- `GET /api/log-statistics/statistics` - 获取日志统计信息（支持 serverId、hours 参数）
- `GET /api/log-statistics/trends` - 获取日志趋势数据（支持 serverId、days 参数）

### 性能统计
- `GET /api/stats` - 获取 Nginx 统计信息（支持 serverId 参数）
- `GET /api/stats/history` - 获取统计历史（支持 serverId 参数）
- `POST /api/stats/record` - 记录统计数据（支持 serverId 参数）

### 历史记录
- `GET /api/history` - 获取历史记录列表
- `GET /api/history/:id` - 获取历史记录详情
- `POST /api/history/:id/restore` - 恢复历史版本

### 系统设置
- `GET /api/settings` - 获取系统设置
- `PUT /api/settings` - 更新系统设置
- `POST /api/settings/test` - 测试路径
- `GET /api/settings/info` - 获取系统信息

### Nginx 操作
- `POST /api/nginx/reload` - 重载 Nginx
- `POST /api/nginx/validate` - 验证配置
- `GET /api/nginx/status` - 获取 Nginx 状态

## 权限说明

系统预定义了以下角色和权限：

### 管理员 (admin)
所有权限：
- config:read - 查看配置
- config:write - 编辑配置
- config:delete - 删除配置
- config:apply - 应用配置
- upstream:read - 查看 Upstream
- upstream:manage - 管理 Upstream
- log:read - 查看日志
- history:read - 查看历史
- history:restore - 恢复历史
- stats:read - 查看统计
- user:manage - 用户管理
- role:manage - 角色管理
- server:read - 查看服务器
- server:manage - 管理服务器
- system:manage - 系统设置

### 开发者 (developer)
- config:read - 查看配置
- config:write - 编辑配置
- config:apply - 应用配置
- upstream:read - 查看 Upstream
- upstream:manage - 管理 Upstream
- log:read - 查看日志
- history:read - 查看历史
- stats:read - 查看统计
- server:read - 查看服务器

### 查看者 (viewer)
- config:read - 查看配置
- upstream:read - 查看 Upstream
- log:read - 查看日志
- history:read - 查看历史
- stats:read - 查看统计
- server:read - 查看服务器

## 使用指南

### 仪表盘
1. 在首页查看系统概览
2. 选择服务器查看特定服务器的数据
3. 查看关键指标：
   - 总请求数
   - 成功率
   - 错误率
   - 独立访客数
4. 查看24小时请求趋势图
5. 查看状态码分布
6. 查看请求方法分布
7. 数据自动刷新

### 配置文件管理
1. 在"配置文件"页面选择服务器（可选）
2. 查看所有配置文件列表
3. 点击"编辑"按钮修改配置文件
4. 使用"验证"按钮检查配置语法
5. 使用"应用"按钮重载 Nginx

### 日志查看
1. 在"日志查看"页面选择服务器
2. 选择日志文件（访问日志或错误日志）
3. 选择日志格式：
   - **Nginx Default Log Format**：Nginx 默认日志格式（Combined Log Format）
   - **Combined with Virtual Host**：包含虚拟主机的组合日志
   - **Common Log Format**：Apache 通用日志格式
   - **JSON Log Format**：JSON 格式日志
   - **Custom App Log Format**：自定义应用日志格式
4. 选择视图模式：
   - **列视图**：按照列格式化显示日志，支持自定义列
   - **原始视图**：显示完整的原始日志内容，适用于非标准格式日志
5. 输入关键字搜索日志
6. 支持搜索 IP 地址、请求路径等
7. 实时刷新日志内容
8. 查看日志统计信息（总请求数、成功数、错误数等）

#### 视图模式说明
- **列视图**：适用于标准日志格式（Combined、Common、JSON等），提供结构化的列显示
- **原始视图**：适用于自定义日志格式或无法解析的日志，显示完整的原始日志内容
- 当远程服务器的日志格式与预设格式不匹配时，建议使用"原始视图"

#### 日志格式说明
系统内置多种日志格式模板，每种格式都有对应的正则表达式和字段映射：

1. **Nginx Default Log Format**
   - 格式：`$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"`
   - 字段：IP、时间、请求方法、路径、协议、状态码、响应大小、来源、用户代理

2. **Combined with Virtual Host**
   - 格式：`$host $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"`
   - 字段：虚拟主机、IP、时间、请求方法、路径、协议、状态码、响应大小、来源、用户代理

3. **Common Log Format**
   - 格式：`$remote_addr - $remote_user [$time_local] "$request"`
   - 字段：IP、时间、请求方法、路径、协议

4. **JSON Log Format**
   - 格式：JSON 格式日志
   - 字段：根据 JSON 结构动态解析

5. **Custom App Log Format**
   - 格式：自定义应用日志格式
   - 字段：根据自定义正则表达式提取

### 日志格式模板和自定义列
#### 日志格式模板
1. 在"日志查看"页面选择日志格式
2. 系统内置多种日志格式：
   - Combined Log Format（标准Nginx组合日志）
   - Combined with Virtual Host（包含虚拟主机的组合日志）
   - Common Log Format（Apache通用日志）
   - JSON Log Format（JSON格式日志）
   - Custom App Log Format（自定义应用日志）
3. 点击"自定义格式"按钮添加自定义日志格式
4. 填写格式名称、正则表达式、字段映射等信息
5. 保存后可在格式列表中选择使用

#### 自定义列功能
1. 在"日志查看"页面点击"列设置"按钮
2. 点击"添加自定义列"按钮
3. 填写自定义列信息：
   - **列键**：唯一标识此列，建议使用英文小写字母和下划线（如：channel）
   - **列名称**：显示在界面上的列标题（如：渠道）
   - **提取正则**：使用捕获组提取字段值（如：`channel:\[([^\]]*)\]`）
   - **列宽**：设置列的宽度（可选，默认150）
   - **最小宽度**：设置列的最小宽度（可选，默认100）
   - **弹性布局**：勾选后列会自动扩展填充剩余空间
4. 点击"确定"保存自定义列
5. 在列设置中点击自定义列标签选择显示
6. 日志会自动提取并显示自定义字段的值

#### 自定义列示例
对于 Custom App Log Format，可以添加以下自定义列：

| 列键 | 列名称 | 提取正则 |
|------|--------|----------|
| channel | 渠道 | `channel:\[([^\]]*)\]` |
| reqId | 请求ID | `reqId:\[([^\]]*)\]` |
| routeName | 路由名称 | `routeName:\[([^\]]*)\]` |
| jsessionId | 会话ID | `jsessionId:\[([^\]]*)\]` |
| logToken | 日志令牌 | `logToken:\[([^\]]*)\]` |
| timestamp | 时间戳 | `timestamp:\[([^\]]*)\]` |
| platId | 平台ID | `platId:\[([^\]]*)\]` |

#### 列管理
- 点击"全选"按钮选择所有可用列
- 点击"清空"按钮清除所有选择
- 在"默认列"区域选择系统预定义的列
- 在"自定义列"区域选择用户自定义的列
- 点击自定义列的关闭按钮可删除该列
- 在"当前显示顺序"区域查看已选择的列
- 点击关闭按钮可从显示中移除列

#### 注意事项
- 自定义列配置保存在浏览器本地存储中
- 列键必须唯一，不能与系统预定义列冲突
- 提取正则必须包含至少一个捕获组 `()` 来提取字段值
- 正则表达式语法错误会导致提取失败
- 删除自定义列会同时从显示中移除该列

### 日志统计
1. 在"日志统计"页面选择服务器
2. 查看各类统计指标
3. 选择时间范围查看趋势数据
4. 分析热门路径和 IP 地址

### Upstream 管理
1. 在"Upstream 管理"页面选择服务器
2. 查看所有 Upstream 配置
3. 查看后端服务器健康状态
4. 点击配置文件名直接跳转编辑
5. 管理负载均衡算法和备份服务器

### 性能统计
1. 在"性能统计"页面选择服务器
2. 查看实时 Nginx 状态
3. 查看历史数据趋势
4. 记录统计数据用于后续分析

### 服务器管理
1. 在"服务器管理"页面添加服务器
2. 填写服务器信息（主机、端口、用户名、密码/私钥）
3. 如需要，启用"使用 Sudo"选项
4. 点击"测试连接"验证 SSH 连接
5. 保存后可在其他模块选择该服务器

### 角色权限管理
1. 在"角色管理"页面查看所有角色
2. 创建新角色并分配权限
3. 编辑现有角色权限
4. 权限会自动应用到菜单显示

## 开发说明

### 添加新功能
1. 在后端 `src/routes/` 添加新的路由文件
2. 在前端 `src/services/api.js` 添加对应的 API 方法
3. 在前端 `src/pages/` 创建新的页面组件
4. 在 `src/App.js` 添加路由配置
5. 在 `src/components/Layout.js` 添加菜单项和权限

### 数据库迁移
数据库初始化在 `src/database.js` 中自动完成，包括创建表和插入默认数据。
添加新的迁移：
1. 在 `src/migrations/` 创建迁移文件
2. 在 `src/index.js` 导入并执行迁移

### 远程服务器管理
远程服务器使用 SSH2 库进行连接，支持密码和私钥两种认证方式。
支持 sudo 权限委派，当用户没有 root 权限时可以使用 sudo 执行命令。

## 生产部署

### Docker 部署（推荐）
```bash
docker-compose up -d
```

### 手动部署
1. 设置环境变量 `NODE_ENV=production`
2. 修改 `JWT_SECRET` 为强密码
3. 使用 PM2 或 systemd 管理进程
4. 配置 Nginx 反向代理
5. 确保数据库文件持久化（配置 Docker volume）

### Nginx 反向代理配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Sudo 配置
如果 SSH 用户没有 root 权限，需要配置 sudoers：

```bash
username ALL=(ALL) NOPASSWD: /usr/sbin/nginx
username ALL=(ALL) NOPASSWD: /bin/cat /etc/nginx/*
username ALL=(ALL) NOPASSWD: /bin/ls /var/log/nginx/*
```

## 安全建议

1. 修改默认管理员密码
2. 使用强密码作为 JWT_SECRET
3. 启用 HTTPS
4. 限制 API 访问 IP
5. 定期备份数据库
6. 使用防火墙限制 SSH 访问
7. 为远程服务器使用专用 SSH 账户
8. 限制 sudo 权限范围
9. 定期更新依赖包
10. 监控系统日志

## 常见问题

### Q: 如何添加远程服务器？
A: 在"服务器管理"页面点击"新建服务器"，填写服务器信息并测试连接。

### Q: 配置文件修改后不生效？
A: 需要点击"应用配置"按钮重载 Nginx。

### Q: 日志搜索性能如何？
A: 使用流式读取和正则匹配，支持大文件高效搜索。

### Q: 如何回滚配置？
A: 在"历史记录"页面查看变更历史，点击"恢复"按钮回滚到指定版本。

### Q: Docker 部署数据丢失？
A: 确保 docker-compose.yml 中配置了数据持久化 volume。

### Q: 如何使用 sudo 权限？
A: 在服务器管理中启用"使用 Sudo"选项，并确保 SSH 用户在 sudoers 中有相应权限。

### Q: 性能统计没有数据？
A: 确保 nginx 配置了 stub_status 模块，并在服务器管理中正确配置 nginx_status_url。

### Q: 日志统计没有数据？
A: 确保 access.log 文件存在，并且日志格式符合 Combined Log Format。

### Q: 日志查看显示"Log line does not match format pattern"？
A: 说明日志格式与当前选择的日志格式模板不匹配。尝试：
1. 切换到"原始视图"查看完整日志内容
2. 选择不同的日志格式模板
3. 添加自定义日志格式模板
4. 检查远程服务器的日志配置

### Q: 仪表盘的请求方法统计为空？
A: 可能是远程服务器的日志格式与预设格式不匹配。请：
1. 检查后端日志输出，查看日志样本
2. 确保日志格式正确
3. 尝试切换到本地服务器测试
4. 联系管理员检查日志配置

### Q: 日志查看的总请求数不正确？
A: 系统会自动统计日志文件的总条目数，而不是当前显示的行数。如果显示不正确，请：
1. 刷新页面重新加载
2. 检查日志文件是否存在
3. 查看后端日志是否有错误信息

### Q: 如何添加自定义日志格式？
A: 在"日志查看"页面点击"自定义格式"按钮，填写格式名称、正则表达式、字段映射等信息。

### Q: 如何添加自定义列？
A: 在"日志查看"页面点击"列设置"按钮，点击"添加自定义列"按钮，填写列键、列名称、提取正则等信息。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件

---

**注意**: 本系统仅用于管理 Nginx 配置，请确保有足够的权限进行操作。

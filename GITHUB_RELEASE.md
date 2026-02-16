# Nginx Admin Console - v1.0.0

## 📖 简介

Nginx 管理控制台是一个基于 Web 的 Nginx 配置管理和监控系统，支持分布式管理多台 Nginx 服务器。通过直观的可视化界面，您可以轻松管理 Nginx 配置文件、实时查看日志、监控性能指标，并实现细粒度的权限控制。

## ✨ 主要特性

### 🎯 核心功能

- **📁 配置文件管理**
  - 查看、编辑、创建、删除 Nginx 配置文件
  - 支持 Monaco Editor 代码编辑器，提供语法高亮和自动补全
  - 配置验证和应用功能
  - 支持本地和远程服务器管理
  - 启用/禁用配置文件

- **📊 日志查看与分析**
  - 实时查看访问日志和错误日志
  - 支持多种日志格式（Nginx Default、Combined、Common、JSON、Custom）
  - 关键字搜索功能（IP、请求路径等）
  - 双视图模式（列视图/原始视图）
  - 自定义列功能，从日志中提取自定义字段
  - 日志统计分析（请求数、状态码分布、热门路径等）

- **📈 性能监控**
  - Nginx stub_status 实时监控
  - 活跃连接数、请求统计
  - 连接状态分析（读取、写入、等待）
  - 历史数据记录和趋势分析
  - 支持多服务器监控

- **⚙️ Upstream 管理**
  - 实时显示后端服务器状态
  - 健康状态监控
  - 支持多种负载均衡算法（轮询、最少连接、IP哈希、随机）
  - 备份服务器管理
  - 点击配置文件直接跳转编辑

- **🖥️ 服务器管理**
  - 分布式管理多台 Nginx 服务器
  - SSH 连接测试
  - 支持密码和私钥认证
  - 支持 sudo 权限委派
  - 可配置 Nginx 路径、日志路径、状态地址

- **👥 用户权限管理**
  - 基于角色的权限管理系统（RBAC）
  - 细粒度权限控制
  - 预定义角色（管理员、开发者、查看者）
  - 菜单根据权限动态显示
  - 用户账号管理

- **📜 历史记录**
  - 配置文件变更历史记录
  - 支持回滚到历史版本
  - 操作记录和内容恢复
  - 东八时区时间显示

- **🎨 用户体验**
  - 深色/浅色主题切换
  - 响应式布局，支持移动端
  - 实时数据刷新
  - 流畅的动画效果
  - 基于 Ant Design 的现代化 UI

## 🛠️ 技术栈

### 前端
- React 18
- Ant Design 5.x
- React Router 6
- Axios
- Monaco Editor
- React Hooks

### 后端
- Node.js 16+
- Express.js
- SQLite (better-sqlite3)
- JWT 认证
- bcryptjs
- SSH2 (远程服务器管理)
- Glob (文件匹配)

### 部署
- Docker & Docker Compose
- Nginx 反向代理
- 数据持久化

## 🚀 快速开始

### 前置要求

- Node.js >= 16
- npm 或 yarn
- Nginx (用于实际管理)
- Docker (可选，用于容器化部署)

### 使用 Docker Compose（推荐）

```bash
# 克隆仓库
git clone https://github.com/yourusername/nginx-admin-console.git
cd nginx-admin-console

# 启动服务
docker-compose up -d

# 访问应用
# 前端: http://localhost
# 后端 API: http://localhost:5000
```

### 手动安装

#### 1. 安装后端依赖

```bash
cd backend
npm install
```

#### 2. 配置环境变量

创建 `backend/.env` 文件：

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this-in-production
NGINX_CONFIG_PATH=/etc/nginx
NGINX_LOG_PATH=/var/log/nginx
DB_PATH=/tmp/nginx-admin.db
```

#### 3. 启动后端

```bash
npm start
```

#### 4. 安装前端依赖

```bash
cd frontend
npm install
```

#### 5. 启动前端

```bash
npm start
```

#### 6. 访问应用

打开浏览器访问：http://localhost:3000

## 🔐 默认账号

- **用户名**: `admin`
- **密码**: `admin123`

⚠️ **重要**: 首次登录后请立即修改默认密码！

## 📸 功能截图

### 仪表盘
- 系统概览和关键指标展示
- 24 小时请求趋势图
- 状态码分布统计
- 请求方法分布

### 配置文件管理
- Monaco Editor 代码编辑器
- 配置验证和应用
- 支持多服务器切换

### 日志查看
- 实时日志流
- 多种日志格式支持
- 关键字搜索和过滤

### 性能监控
- Nginx 实时状态
- 历史趋势分析
- 多服务器监控

## 📚 文档

详细文档请查看：[产品设计文档.md](./产品设计文档.md)

### 主要文档章节

- [产品概述](./产品设计文档.md#1-产品概述)
- [技术架构](./产品设计文档.md#2-技术架构)
- [功能模块设计](./产品设计文档.md#3-功能模块设计)
- [API 文档](./产品设计文档.md#5-api-设计)
- [部署指南](./产品设计文档.md#7-部署架构)
- [安全建议](./产品设计文档.md#6-安全设计)

## 🔧 配置说明

### Nginx Status 配置

为了使用性能统计功能，需要在 Nginx 中配置 `stub_status`：

```nginx
server {
    listen 80;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

详细配置说明请参考：[NGINX_STATUS_CONFIG.md](./NGINX_STATUS_CONFIG.md)

### Sudo 配置

如果 SSH 用户没有 root 权限，需要配置 sudoers：

```bash
sudo visudo

# 添加以下配置
username ALL=(ALL) NOPASSWD: /usr/sbin/nginx
username ALL=(ALL) NOPASSWD: /bin/cat /etc/nginx/*
username ALL=(ALL) NOPASSWD: /bin/ls /var/log/nginx/*
username ALL=(ALL) NOPASSWD: /usr/bin/curl
```

## 🌟 权限说明

系统预定义了以下角色：

### 管理员 (admin)
- 所有权限
- 系统管理
- 用户和角色管理

### 开发者 (developer)
- 配置读写和应用
- Upstream 管理
- 日志查看
- 历史查看
- 统计查看
- 服务器查看

### 查看者 (viewer)
- 配置查看
- Upstream 查看
- 日志查看
- 历史查看
- 统计查看
- 服务器查看

## 🔒 安全建议

1. **修改默认密码** - 首次登录后立即修改 admin 密码
2. **保护 JWT_SECRET** - 使用强随机字符串作为 JWT_SECRET
3. **启用 HTTPS** - 生产环境必须使用 HTTPS
4. **限制访问** - 使用防火墙限制 API 访问
5. **定期备份** - 定期备份数据库和配置文件
6. **监控和审计** - 记录所有操作日志，监控异常访问

## 🐛 已知问题

暂无

## 📝 更新日志

### v1.0.0 (2024-01-01)

#### 新增功能
- ✨ 配置文件管理（查看、编辑、创建、删除）
- ✨ 日志查看（访问日志、错误日志）
- ✨ 日志统计分析
- ✨ Upstream 管理
- ✨ 性能统计（Nginx stub_status）
- ✨ 服务器管理（本地和远程）
- ✨ 用户权限管理（RBAC）
- ✨ 历史记录和回滚
- ✨ 系统设置
- ✨ 深色/浅色主题切换
- ✨ 响应式布局

#### 技术特性
- 🎯 React 18 + Ant Design 5
- 🎯 Node.js + Express + SQLite
- 🎯 JWT 认证
- 🎯 SSH2 远程服务器管理
- 🎯 Monaco Editor 代码编辑
- 🎯 Docker 容器化部署

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件

## 👥 作者

- Nginx Admin Console Team

## 🙏 致谢

感谢所有贡献者和开源项目的支持！

## 📮 联系方式

- 问题反馈：[GitHub Issues](https://github.com/yourusername/nginx-admin-console/issues)
- 功能建议：[GitHub Discussions](https://github.com/yourusername/nginx-admin-console/discussions)

---

⭐ 如果这个项目对您有帮助，请给我们一个 Star！

Made with ❤️ by Nginx Admin Console Team

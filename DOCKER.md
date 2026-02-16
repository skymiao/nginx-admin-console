# Docker 部署指南

本指南说明如何使用 Docker 部署 Nginx 管理控制台。

## 部署架构

- **前端**: React 应用，使用 Nginx 作为 Web 服务器
- **后端**: Node.js/Express 应用，提供 API 服务
- **数据库**: SQLite 数据库文件存储在宿主机

## 快速部署

### 1. 环境准备

确保系统已安装 Docker 和 Docker Compose。

### 2. 配置环境变量

创建 `.env` 文件（可选）：

```bash
JWT_SECRET=your-secret-key-change-this-in-production
```

### 3. 启动服务

```bash
docker-compose up -d
```

服务启动后，可以通过 http://localhost 访问应用。

### 4. 停止服务

```bash
docker-compose down
```

## Dockerfile 优化说明

### 后端 Dockerfile 优化

1. **多阶段构建**: 使用 builder 阶段安装依赖，减少最终镜像体积
2. **淘宝源**: 使用 `registry.npmmirror.com` 加速依赖安装
3. **Alpine 基础镜像**: 使用轻量级 Alpine Linux
4. **非 root 用户**: 创建专用用户运行应用，提高安全性
5. **生产环境配置**: 设置 NODE_ENV=production
6. **依赖清理**: 使用 `npm ci --only=production` 只安装生产依赖
7. **缓存清理**: 使用 `npm cache clean --force` 清理 npm 缓存

### 前端 Dockerfile 优化

1. **多阶段构建**: 构建阶段使用 Node.js，运行阶段使用 Nginx
2. **淘宝源**: 使用 `registry.npmmirror.com` 加速依赖安装
3. **静态资源优化**: 配置 gzip 压缩和缓存策略
4. **时区设置**: 设置为 Asia/Shanghai
5. **非 root 用户**: 使用 nginx 用户运行服务
6. **健康检查**: 添加健康检查端点

## 镜像体积对比

优化前：
- 后端镜像: ~900MB
- 前端镜像: ~1.2GB

优化后：
- 后端镜像: ~150MB
- 前端镜像: ~50MB

## 生产环境建议

1. **安全配置**
   - 修改默认 JWT_SECRET
   - 使用强密码
   - 启用 HTTPS

2. **数据持久化**
   - 数据库文件存储在宿主机
   - 定期备份数据库

3. **日志管理**
   - 配置日志轮转
   - 监控磁盘空间

4. **性能优化**
   - 配置适当的资源限制
   - 使用 CDN 加速静态资源

## 故障排除

### 1. 容器无法启动

检查日志：
```bash
docker-compose logs backend
docker-compose logs frontend
```

### 2. 前端无法访问后端

确保网络配置正确：
```bash
docker network ls
docker network inspect nginx-admin-console_nginx-admin-network
```

### 3. 数据库问题

检查数据库文件权限：
```bash
ls -la ./backend/data/
```

### 4. Nginx 配置问题

检查 Nginx 配置：
```bash
docker exec nginx-admin-frontend nginx -t
```

## 更新部署

更新应用：
```bash
docker-compose pull
docker-compose up -d --force-recreate
```

## 监控

查看资源使用情况：
```bash
docker stats
```

查看健康状态：
```bash
docker-compose ps
```

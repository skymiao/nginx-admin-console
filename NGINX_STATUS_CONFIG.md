# Nginx 状态统计配置说明

## 功能说明

nginx-admin-console 现在支持通过配置 `nginx_status_url` 来获取 Nginx 服务器的性能统计信息。该功能基于 Nginx 的 `stub_status` 模块实现。

## 配置步骤

### 1. 启用 Nginx stub_status 模块

在 Nginx 配置文件中添加以下配置：

```nginx
server {
    listen 127.0.0.1:80;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

### 2. 重新加载 Nginx 配置

```bash
nginx -t
nginx -s reload
```

### 3. 测试 stub_status 是否正常工作

```bash
curl http://localhost/nginx_status
```

正常情况下，您应该看到类似以下的输出：

```
Active connections: 2
server accepts handled requests
 10 10 20
Reading: 0 Writing: 1 Waiting: 1
```

## 配置 nginx_status_url

### 方式一：在系统设置中配置（适用于本地服务器）

1. 登录 nginx-admin-console
2. 进入"系统设置"页面
3. 在"Nginx 状态地址"字段中输入您的 stub_status 地址
4. 点击"保存设置"

默认值：`http://localhost/nginx_status`

### 方式二：在服务器管理中配置（适用于远程服务器）

1. 登录 nginx-admin-console
2. 进入"服务器管理"页面
3. 点击"添加服务器"或编辑现有服务器
4. 在"Nginx 状态地址"字段中输入该服务器的 stub_status 地址
5. 点击"保存"

默认值：`http://localhost/nginx_status`

## 支持的配置格式

- 本地访问：`http://localhost/nginx_status`
- IP地址：`http://192.168.1.100/nginx_status`
- 域名：`http://nginx.example.com/status`
- 自定义端口：`http://localhost:8080/nginx_status`
- HTTPS：`https://nginx.example.com/status`

## 性能统计指标说明

访问"性能统计"页面可以查看以下指标：

### 核心指标
- **活跃连接**：当前活跃的连接数
- **总请求数**：自启动以来的总处理请求数
- **已处理**：已成功处理的请求数
- **已接受**：已接受的连接数

### 连接状态
- **正在读取**：正在读取请求头的连接数
- **正在写入**：正在写回响应的连接数
- **等待中**：空闲等待的连接数

### 请求速率
- **当前周期**：当前周期的请求增量
- **平均速率**：历史平均请求速率
- **峰值速率**：历史峰值请求速率

## 安全建议

1. **限制访问**：使用 `allow` 和 `deny` 指令限制访问 stub_status 的 IP 地址
2. **不记录日志**：使用 `access_log off` 避免记录状态请求的日志
3. **使用本地访问**：建议只监听 127.0.0.1，通过 SSH 隧道或内部网络访问
4. **使用 HTTPS**：如果必须通过公网访问，请使用 HTTPS

## 常见问题

### Q: 无法访问 nginx_status 页面

A: 请检查以下几点：
1. Nginx 配置是否正确
2. 是否已重新加载 Nginx 配置
3. 防火墙是否阻止了访问
4. stub_status 模块是否已编译到 Nginx 中

### Q: 远程服务器无法获取统计信息

A: 请检查以下几点：
1. 远程服务器的 nginx_status_url 是否正确配置
2. SSH 连接是否正常
3. 远程服务器是否可以访问 stub_status 地址
4. 防火墙规则是否允许访问

### Q: 如何检查 stub_status 模块是否可用？

A: 运行以下命令检查：
```bash
nginx -V 2>&1 | grep -o with-http_stub_status_module
```

如果输出包含 `with-http_stub_status_module`，则表示模块已启用。

## 示例配置文件

完整的 Nginx 配置示例请参考项目根目录下的 `nginx_status.conf.example` 文件。

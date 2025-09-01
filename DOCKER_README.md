# Docker 部署说明

## 快速开始

### 1. 构建并运行生产环境

```bash
# 使用 docker-compose
docker-compose up -d

# 或者使用 Docker 命令
docker build -t file-processing .
docker run -d -p 3020:3020 --name file-processing-app file-processing
```

### 2. 开发环境

```bash
# 启动开发环境（包含热重载）
docker-compose --profile dev up -d
```

### 3. 查看日志

```bash
# 查看应用日志
docker-compose logs -f file-processing

# 查看开发环境日志
docker-compose logs -f file-processing-dev
```

### 4. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除容器和镜像
docker-compose down --rmi all
```

## 环境变量

可以通过环境变量配置应用：

- `NODE_ENV`: 运行环境 (production/development)
- `PORT`: 服务端口 (默认: 3020)

## 数据持久化

应用会自动创建以下目录用于数据持久化：

- `./uploads`: 上传的文件
- `./extracted_images`: 提取的图片

这些目录通过 Docker volumes 映射到容器内。

## 健康检查

应用包含健康检查端点：

- 端点: `http://localhost:3020/health`
- 检查间隔: 30秒
- 超时时间: 3秒
- 重试次数: 3次

## 系统依赖

Docker 镜像包含以下系统依赖：

- `poppler-utils`: PDF 处理
- `tesseract`: OCR 文字识别
- `imagemagick`: 图像处理
- `ghostscript`: PostScript 处理

## 故障排除

### 1. 端口冲突

如果端口 3020 被占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8080:3020"  # 使用 8080 端口
```

### 2. 权限问题

如果遇到文件权限问题，可以调整目录权限：

```bash
sudo chown -R $USER:$USER uploads extracted_images
```

### 3. 内存不足

如果遇到内存不足问题，可以增加 Docker 内存限制：

```bash
docker run -d -p 3020:3020 --memory=2g --name file-processing-app file-processing
```

## 生产部署建议

1. 使用反向代理（如 Nginx）处理 HTTPS
2. 配置环境变量文件（.env）
3. 设置日志轮转
4. 配置监控和告警
5. 使用 Docker Swarm 或 Kubernetes 进行集群部署

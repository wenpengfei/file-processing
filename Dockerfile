# 使用官方Node.js运行时作为基础镜像（使用Debian-based而不是Alpine）
FROM node:22.12.0-slim AS base

# 设置工作目录
WORKDIR /app

# 安装系统依赖（用于PDF处理和图像处理）
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-eng \
    imagemagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# 复制package.json和pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装pnpm（如果使用pnpm）
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p uploads extracted_images

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3020

# 暴露端口
EXPOSE 3020

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3020/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["node", "index.js"]

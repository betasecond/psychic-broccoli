# Docker & Docker Compose 配置约定

版本: 2.0  
更新: 适配 Go (Gin) + React (Vite) 技术栈  
目标: 为 CourseArk 在线教育平台项目定义一套标准的容器化构建、部署和管理流程。

## 1. 概述

本文档旨在统一项目团队在使用 Docker 和 Docker Compose 时的配置、命令和最佳实践。通过容器化，我们可以实现：

* **环境一致性:** 消除"在我电脑上能跑"的问题。
* **快速部署:** 通过一条命令即可启动整个应用栈。
* **服务隔离:** 各个服务（前端、后端、数据库）在独立的环境中运行，互不干扰。
* **自动更新:** 配合 Watchtower 实现推送代码即自动部署。

## 2. 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 后端 | Go 1.24 + Gin | RESTful API 服务 |
| 数据库 | SQLite | 嵌入式数据库，通过 Docker Volume 持久化 |
| 前端 | React 19 + Vite | SPA 单页应用 |
| Web 服务器 | Nginx | 托管前端静态资源 + 反向代理 API |
| 自动更新 | Watchtower | 自动拉取新镜像并重启容器 |

## 3. 项目目录结构

```
psychic-broccoli/
├── backend/
│   ├── Dockerfile           # 后端多阶段构建
│   ├── .dockerignore        # 构建时排除的文件
│   ├── main.go
│   ├── go.mod
│   ├── database/
│   │   └── schema.sql       # 数据库 Schema
│   └── public/              # 静态资源（作业附件等）
│
├── frontend/
│   ├── Dockerfile           # 前端多阶段构建
│   ├── .dockerignore        # 构建时排除的文件
│   ├── nginx.conf           # Nginx 配置
│   ├── package.json
│   └── src/
│
├── docker-compose.prod.yml  # 生产环境编排文件
├── env.example              # 环境变量示例
└── document/
    └── deploy-ghcr-watchtower.md  # 详细部署指南
```

## 4. Dockerfile 详解

### 4.1. 后端 Dockerfile (`backend/Dockerfile`)

多阶段构建，生成静态链接的 Go 二进制文件：

```dockerfile
# --- Stage 1: Build ---
FROM golang:1.24-alpine AS builder
RUN apk add --no-cache gcc musl-dev sqlite-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-w -s -linkmode external -extldflags '-static'" \
    -o server main.go

# --- Stage 2: Runtime ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/database/schema.sql ./database/
COPY --from=builder /app/public ./public
RUN mkdir -p /data

ENV SERVER_PORT=8080
ENV DB_PATH=/data/education.db
ENV JWT_SECRET=change-me-in-production
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./server"]
```

**关键点**：
- 使用 Alpine 基础镜像，最终镜像约 20MB
- CGO 启用（SQLite 需要）
- 数据库文件放在 `/data` 目录，通过 Volume 持久化
- 内置健康检查

### 4.2. 前端 Dockerfile (`frontend/Dockerfile`)

```dockerfile
# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Runtime ---
FROM nginx:1.27-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 4.3. Nginx 配置 (`frontend/nginx.conf`)

```nginx
upstream backend {
    server backend:8080;
}

server {
    listen 80;
    root /usr/share/nginx/html;
    client_max_body_size 20M;

    # API 反向代理
    location /api/v1/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端静态资源代理
    location /static/ {
        proxy_pass http://backend;
    }

    # 健康检查代理
    location /health {
        proxy_pass http://backend;
    }

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 5. Docker Compose 配置

### 5.1. 生产环境 (`docker-compose.prod.yml`)

```yaml
services:
  backend:
    # 注意: GHCR_OWNER 是必填项，未设置会报错
    image: "ghcr.io/${GHCR_OWNER:?GHCR_OWNER is required}/psychic-broccoli-backend:latest"
    container_name: courseark-backend
    restart: unless-stopped
    environment:
      - SERVER_PORT=8080
      - DB_PATH=/data/education.db
      - "JWT_SECRET=${JWT_SECRET:?JWT_SECRET is required}"
      - GIN_MODE=release
      - ENABLE_SEED=${ENABLE_SEED:-false}
    volumes:
      - sqlite_data:/data
      - uploads_data:/app/public/uploads  # 用户上传的附件
    networks:
      - courseark-network
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  web:
    image: "ghcr.io/${GHCR_OWNER:?GHCR_OWNER is required}/psychic-broccoli-web:latest"
    container_name: courseark-web
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-80}:80"
    networks:
      - courseark-network
    depends_on:
      backend:
        condition: service_healthy
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  watchtower:
    image: containrrr/watchtower:latest
    container_name: courseark-watchtower
    restart: unless-stopped
    environment:
      - WATCHTOWER_LABEL_ENABLE=true
      - WATCHTOWER_POLL_INTERVAL=300
      - WATCHTOWER_CLEANUP=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      # 使用绝对路径，非 root 用户需设置 DOCKER_CONFIG_PATH
      - ${DOCKER_CONFIG_PATH:-/root/.docker/config.json}:/config.json:ro

networks:
  courseark-network:
    driver: bridge

volumes:
  sqlite_data:      # SQLite 数据库
  uploads_data:     # 用户上传的附件
```

## 6. 环境变量

### 必填变量

| 变量 | 说明 |
|------|------|
| `GHCR_OWNER` | GitHub 用户名，用于拉取镜像。**必填**，未设置时启动报错。 |
| `JWT_SECRET` | JWT 签名密钥。**必填**，建议用 `openssl rand -base64 32` 生成。 |

### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WEB_PORT` | Web 服务端口 | `80` |
| `ENABLE_SEED` | 是否填充测试数据（生产环境建议禁用） | `false` |
| `DOCKER_CONFIG_PATH` | Docker 配置文件路径（Watchtower 认证用） | `/root/.docker/config.json` |
| `SERVER_PORT` | 后端 API 端口 | `8080` |
| `DB_PATH` | SQLite 路径 | `/data/education.db` |
| `GIN_MODE` | Gin 运行模式 | `release` |

## 7. 常用命令

```bash
# 启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 查看状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 手动更新
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# 停止服务
docker compose -f docker-compose.prod.yml down

# 备份数据库
docker cp courseark-backend:/data/education.db ./backup.db
```

## 8. CI/CD 集成

项目使用 GitHub Actions 自动构建镜像：

1. 推送到 `main` 分支
2. GitHub Actions 构建 `backend` 和 `web` 镜像
3. 推送到 GHCR（GitHub Container Registry）
4. 远程服务器的 Watchtower 自动拉取更新

详见：[`.github/workflows/publish-images.yml`](../.github/workflows/publish-images.yml)

## 9. 参考文档

- [完整部署指南](deploy-ghcr-watchtower.md)
- [Watchtower 官方文档](https://containrrr.dev/watchtower/)
- [Docker Compose 官方文档](https://docs.docker.com/compose/)

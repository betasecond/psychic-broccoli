# CourseArk

在线教育平台 - 支持课程管理、作业提交、考试系统等功能。

## 技术栈

- **前端**: React 19 + Vite + TypeScript + Ant Design + Redux Toolkit
- **后端**: Go 1.24 + Gin + SQLite + JWT
- **部署**: Docker + Docker Compose + Watchtower（自动更新）

## 项目结构

```
├── frontend/          # React + Vite 前端应用
├── backend/           # Go (Gin) 后端 API
├── document/          # 项目文档
├── docker-compose.prod.yml  # 生产环境编排文件
└── ui/                # 原型/静态页面
```

## 快速开始

### 本地开发

#### 后端

```bash
cd backend

# 安装依赖
go mod tidy

# 运行（默认端口 8080）
go run main.go

# 或编译后运行
go build -o server main.go
./server
```

环境变量：
- `SERVER_PORT`: 服务端口（默认 8080）
- `DB_PATH`: SQLite 数据库路径（默认 `./database/education.db`）
- `JWT_SECRET`: JWT 签名密钥
- `ENABLE_SEED`: 是否填充测试数据（默认 false，生产环境建议禁用）

#### 前端

```bash
cd frontend

# 安装依赖
npm install

# 开发模式（默认端口 5173）
npm run dev

# 构建生产版本
npm run build
```

环境变量（`.env` 文件）：
- `VITE_API_BASE_URL`: API 地址（默认 `/api/v1`，开发时可设为 `http://localhost:8080/api/v1`）

### 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 学生 | student | password123 |
| 教师 | instructor | password123 |
| 管理员 | admin | password123 |

---

## Docker 部署（推荐）

本项目支持一键 Docker 部署，配合 Watchtower 实现自动更新。

### 架构

```
git push main → GitHub Actions 构建镜像 → 推送 GHCR → Watchtower 自动拉取更新
```

### 快速部署

1. **在远程服务器安装 Docker**：
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. **创建部署目录和配置**：
   ```bash
   mkdir -p ~/courseark && cd ~/courseark
   
   # 下载 compose 文件
   curl -O https://raw.githubusercontent.com/<你的用户名>/psychic-broccoli/main/docker-compose.prod.yml
   
   # 创建 .env 文件
   cat > .env << EOF
   GHCR_OWNER=你的GitHub用户名
   JWT_SECRET=$(openssl rand -base64 32)
   WEB_PORT=80
   EOF
   ```

3. **启动服务**：
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **验证**：
   ```bash
   curl http://localhost/health
   ```

### 日常发布

部署后，只需推送代码到 `main` 分支：

```bash
git push origin main
```

GitHub Actions 会自动构建镜像，Watchtower 会在 5 分钟内自动更新服务。

### 详细文档

- 完整部署指南：[`document/deploy-ghcr-watchtower.md`](document/deploy-ghcr-watchtower.md)
- API 文档：[`document/api.md`](document/api.md)
- Docker 配置约定：[`document/docker.md`](document/docker.md)

---

## CI/CD

本项目使用 GitHub Actions 自动构建和发布 Docker 镜像：

- **触发条件**: 推送到 `main` 分支且修改了 `backend/` 或 `frontend/` 目录
- **产物**: 
  - `ghcr.io/<owner>/psychic-broccoli-backend:latest`
  - `ghcr.io/<owner>/psychic-broccoli-web:latest`
- **架构**: 支持 `linux/amd64` 和 `linux/arm64`

---

## 开发指南

### 热重载开发

后端使用 [air](https://github.com/cosmtrek/air)：
```bash
go install github.com/cosmtrek/air@latest
cd backend && air
```

前端 Vite 自带热重载：
```bash
cd frontend && npm run dev
```

### 代码规范

```bash
# 前端 lint
cd frontend && npm run lint

# 前端格式化
cd frontend && npm run format

# 前端测试
cd frontend && npm test
```

---

## License

Private project.

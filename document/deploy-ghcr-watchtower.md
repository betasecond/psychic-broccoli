# 远程部署指南：GitHub Actions + GHCR + Watchtower

本文档说明如何使用 GitHub Actions 自动构建镜像，通过 GHCR（GitHub Container Registry）分发，并在远程服务器上使用 Watchtower 实现自动更新部署。

## 目录

1. [架构概览](#架构概览)
2. [前置条件](#前置条件)
3. [GitHub 仓库配置](#github-仓库配置)
4. [远程服务器首次部署](#远程服务器首次部署)
5. [日常发布流程](#日常发布流程)
6. [常用运维命令](#常用运维命令)
7. [回滚操作](#回滚操作)
8. [故障排查](#故障排查)

---

## 架构概览

```
┌─────────────┐     git push      ┌──────────────────┐
│  Developer  │ ────────────────► │   GitHub Repo    │
└─────────────┘                   └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  GitHub Actions  │
                                  │  (build images)  │
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │      GHCR        │
                                  │ (image registry) │
                                  └────────┬─────────┘
                                           │ poll every 5min
                                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Remote Server                            │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────┐  │
│  │ Watchtower │───►│    Web     │───►│      Backend       │  │
│  │ (auto-pull)│    │  (Nginx)   │    │  (Go API + SQLite) │  │
│  └────────────┘    └────────────┘    └────────────────────┘  │
│                           │                    │              │
│                           └────────────────────┘              │
│                              courseark-network                │
└──────────────────────────────────────────────────────────────┘
```

---

## 前置条件

### 本地开发机
- Git 客户端
- 能够推送到 GitHub 仓库

### 远程服务器
- Linux 系统（推荐 Ubuntu 22.04+ / Debian 12+）
- Docker Engine 24.0+
- Docker Compose V2（`docker compose` 命令）
- 公网 IP 或域名
- 开放端口：80（或自定义 WEB_PORT）

---

## GitHub 仓库配置

### 1. 确保仓库 Packages 权限

GitHub Actions 使用 `GITHUB_TOKEN` 自动获得推送镜像到 GHCR 的权限。

前往仓库：**Settings → Actions → General → Workflow permissions**
- 选择 **Read and write permissions**
- 勾选 **Allow GitHub Actions to create and approve pull requests**（可选）

### 2. 首次推送触发构建

将代码推送到 `main` 分支后，GitHub Actions 会自动：
1. 构建 `backend` 和 `web` 两个 Docker 镜像
2. 推送到 `ghcr.io/<你的用户名>/psychic-broccoli-backend` 和 `ghcr.io/<你的用户名>/psychic-broccoli-web`
3. 打标签：`latest` 和 `<commit-sha>`

### 3. 设置镜像可见性（可选）

默认情况下 GHCR 包是私有的。如需公开访问：
1. 前往 https://github.com/users/<你的用户名>/packages
2. 点击对应的 package
3. **Package settings → Danger Zone → Change visibility → Public**

---

## 远程服务器首次部署

### 步骤 1：安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录使 docker 组生效
exit
# 重新 SSH 登录后验证
docker --version
docker compose version
```

### 步骤 2：登录 GHCR

如果镜像是私有的，需要使用 Personal Access Token (PAT) 登录：

1. 在 GitHub 创建 PAT：**Settings → Developer settings → Personal access tokens → Tokens (classic)**
   - 勾选 `read:packages` 权限
   - 生成并复制 token

2. 在服务器上登录：
```bash
echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

> 如果镜像已设为 Public，可跳过此步骤。

### 步骤 3：创建部署目录和配置文件

```bash
# 创建部署目录
mkdir -p ~/courseark && cd ~/courseark

# 下载 docker-compose.prod.yml
curl -o docker-compose.prod.yml \
  https://raw.githubusercontent.com/<你的用户名>/psychic-broccoli/main/docker-compose.prod.yml

# 创建环境变量文件
cat > .env << 'EOF'
# GitHub 用户名（用于拉取镜像）
GHCR_OWNER=你的GitHub用户名

# JWT 密钥（请使用强随机字符串）
JWT_SECRET=请替换为你的安全密钥-至少32个字符

# Web 服务端口（默认 80）
WEB_PORT=80

# 是否填充测试数据（生产环境建议 false，开发环境可设 true）
ENABLE_SEED=false
EOF
```

### 步骤 4：启动服务

```bash
cd ~/courseark
docker compose -f docker-compose.prod.yml up -d
```

### 步骤 5：验证部署

```bash
# 检查容器状态
docker compose -f docker-compose.prod.yml ps

# 检查后端健康
curl http://localhost/health

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

访问 `http://你的服务器IP` 应该能看到 CourseArk 前端界面。

### 关于测试数据

默认情况下，`ENABLE_SEED=false`，不会填充测试账号。如果你需要测试账号来验证功能，可以：

```bash
# 编辑 .env 文件
echo "ENABLE_SEED=true" >> .env

# 重新启动服务
docker compose -f docker-compose.prod.yml up -d
```

**⚠️ 重要**：生产环境建议保持 `ENABLE_SEED=false`，避免初始化时创建测试用户账号。

---

## 日常发布流程

部署完成后，日常发布极其简单：

```bash
# 在本地开发机
git add .
git commit -m "feat: 新功能"
git push origin main
```

**就这样！** GitHub Actions 会自动构建新镜像，Watchtower 会在 5 分钟内自动拉取并重启服务。

### 查看更新日志

```bash
# 在远程服务器
docker logs courseark-watchtower --tail 50
```

---

## 常用运维命令

```bash
cd ~/courseark

# 查看所有服务状态
docker compose -f docker-compose.prod.yml ps

# 查看实时日志
docker compose -f docker-compose.prod.yml logs -f

# 只看后端日志
docker compose -f docker-compose.prod.yml logs -f backend

# 手动拉取最新镜像并重启（不等 Watchtower）
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# 停止所有服务
docker compose -f docker-compose.prod.yml down

# 完全清理（包括数据卷）⚠️ 危险操作
docker compose -f docker-compose.prod.yml down -v

# 进入后端容器调试
docker exec -it courseark-backend sh

# 查看 SQLite 数据库
docker exec -it courseark-backend sh -c "ls -la /data/"
```

---

## 回滚操作

每次 CI 构建都会打上 commit SHA 标签，方便回滚。

### 方法 1：指定版本启动

```bash
cd ~/courseark

# 编辑 docker-compose.prod.yml，将 :latest 改为具体 SHA
# 例如: ghcr.io/youruser/psychic-broccoli-backend:abc1234

# 或者直接用环境变量覆盖（需要修改 compose 文件支持）
docker compose -f docker-compose.prod.yml up -d
```

### 方法 2：手动拉取指定版本

```bash
# 拉取指定版本
docker pull ghcr.io/<你的用户名>/psychic-broccoli-backend:<commit-sha>
docker pull ghcr.io/<你的用户名>/psychic-broccoli-web:<commit-sha>

# 停止 watchtower 防止自动更新回 latest
docker stop courseark-watchtower

# 重新 tag 为 latest
docker tag ghcr.io/<你的用户名>/psychic-broccoli-backend:<commit-sha> \
           ghcr.io/<你的用户名>/psychic-broccoli-backend:latest

# 重启服务
docker compose -f docker-compose.prod.yml up -d backend web

# 确认稳定后再启动 watchtower
docker start courseark-watchtower
```

---

## 故障排查

### 问题：容器启动失败

```bash
# 查看详细日志
docker compose -f docker-compose.prod.yml logs backend

# 常见原因：
# 1. JWT_SECRET 未设置 → 检查 .env 文件
# 2. 端口被占用 → netstat -tlnp | grep 80
# 3. 镜像拉取失败 → docker login ghcr.io
```

### 问题：Watchtower 不更新

```bash
# 检查 watchtower 日志
docker logs courseark-watchtower --tail 100

# 确认容器有正确的 label
docker inspect courseark-backend | grep watchtower

# 手动触发检查
docker exec courseark-watchtower /watchtower --run-once
```

### 问题：无法访问网站

```bash
# 检查 nginx 配置
docker exec courseark-web nginx -t

# 检查后端连通性
docker exec courseark-web wget -qO- http://backend:8080/health

# 检查防火墙
sudo ufw status
sudo iptables -L -n
```

### 问题：数据库丢失

SQLite 数据库保存在 Docker volume 中：

```bash
# 查看 volume
docker volume inspect courseark_sqlite_data

# 备份数据库
docker cp courseark-backend:/data/education.db ./backup.db

# 恢复数据库
docker cp ./backup.db courseark-backend:/data/education.db
docker restart courseark-backend
```

---

## 附录：环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `GHCR_OWNER` | GitHub 用户名，用于拉取镜像 | `local` |
| `JWT_SECRET` | JWT 签名密钥 | `change-me-in-production` |
| `WEB_PORT` | Web 服务对外端口 | `80` |
| `ENABLE_SEED` | 是否填充测试数据（生产环境建议禁用） | `false` |
| `SERVER_PORT` | 后端 API 端口（内部） | `8080` |
| `DB_PATH` | SQLite 数据库路径 | `/data/education.db` |
| `GIN_MODE` | Gin 运行模式 | `release` |
| `SERVER_PORT` | 后端 API 端口（内部） | `8080` |
| `DB_PATH` | SQLite 数据库路径 | `/data/education.db` |
| `GIN_MODE` | Gin 运行模式 | `release` |

---

## 附录：测试账号

数据库首次初始化会自动创建测试账号（生产环境建议禁用 seed）：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 学生 | student | password123 |
| 教师 | instructor | password123 |
| 管理员 | admin | password123 |

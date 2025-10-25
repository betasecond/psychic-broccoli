# 在线教育平台后端

基于Go语言、Gin框架和SQLite数据库的在线教育平台后端API。

## 技术栈

- **语言**: Go 1.24+
- **框架**: Gin
- **数据库**: SQLite
- **认证**: JWT
- **密码加密**: bcrypt

## 快速开始

### 1. 安装依赖

```bash
go mod tidy
```

### 2. 编译

```bash
go build -o server.exe main.go
```

### 3. 运行

#### Windows PowerShell
```powershell
.\server.exe
```

#### 或使用启动脚本
```powershell
.\start.ps1
```

#### 后台运行
```powershell
Start-Process -FilePath ".\server.exe" -NoNewWindow
```

### 4. 测试

访问健康检查端点:
```bash
curl http://localhost:35001/health
```

## API端点

### 认证 (/api/v1/auth)
- POST /login - 用户登录
- POST /register - 用户注册
- GET /me - 获取当前用户
- PUT /profile - 更新资料
- PUT /password - 修改密码
- GET /check-username - 检查用户名
- GET /check-email - 检查邮箱

### 课程 (/api/v1/courses)
- GET / - 课程列表
- POST / - 创建课程
- GET /:id - 课程详情
- PUT /:id - 更新课程
- DELETE /:id - 删除课程
- POST /:id/enroll - 学生选课
- GET /:id/chapters - 获取章节
- POST /:id/chapters - 创建章节

### 作业 (/api/v1/assignments)
- GET / - 作业列表
- POST / - 创建作业
- GET /:id - 作业详情
- POST /:id/submit - 提交作业
- GET /submissions - 提交列表
- PUT /submissions/:id/grade - 批改作业

### 考试 (/api/v1/exams)
- GET / - 考试列表
- POST / - 创建考试
- GET /:id - 考试详情
- POST /:id/questions - 添加题目
- POST /:id/submit - 提交答卷
- GET /:id/results - 成绩列表

### 分类 (/api/v1/categories)
- GET / - 分类列表

## 测试账号

数据库会自动填充以下测试账号:

- **学生**: student / password123
- **教师**: instructor / password123
- **管理员**: admin / password123

## 配置

通过环境变量配置:

- `SERVER_PORT`: 服务器端口 (默认: 35001)
- `DB_PATH`: 数据库文件路径 (默认: ./database/education.db)
- `JWT_SECRET`: JWT密钥 (默认: your-secret-key-change-in-production)

## 项目结构

```
backend/
├── main.go                 # 入口文件
├── config/
│   └── config.go          # 配置管理
├── models/
│   └── models.go          # 数据模型
├── database/
│   ├── db.go              # 数据库连接
│   ├── schema.sql         # 数据库Schema
│   └── seed.go            # 测试数据
├── handlers/
│   ├── auth.go            # 认证接口
│   ├── courses.go         # 课程接口
│   ├── assignments.go     # 作业接口
│   └── exams.go           # 考试接口
├── middleware/
│   ├── auth.go            # JWT中间件
│   └── cors.go            # CORS中间件
└── utils/
    ├── response.go        # 统一响应
    └── jwt.go             # JWT工具
```

## 开发

### 热重载

使用 air 进行热重载开发:

```bash
go install github.com/cosmtrek/air@latest
air
```

### 查看日志

如果后台运行，可以查看日志文件或使用前台运行模式查看输出。


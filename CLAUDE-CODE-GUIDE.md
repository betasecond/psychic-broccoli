# 在项目中使用 Claude Code 和 OpenClaw Skills

## 快速开始

### 方案 1：直接使用 Claude Code（✅ 立即可用）

Claude Code 已安装并配置好，可以直接在你的项目中使用。

#### 基本使用

```bash
# 进入项目目录
cd /e/biyesheji/psychic-broccoli

# 查看项目结构
claude "Show me the project structure"

# 代码分析
claude "Analyze the backend code quality"

# 添加功能
claude "Add error handling to the API endpoints"

# 修复 bug
claude "Fix the authentication issue in backend/middleware/auth.go"
```

#### 在特定文件上工作

```bash
# 重构特定文件
claude "Refactor backend/handlers/courses.go to improve readability"

# 添加测试
claude "Add unit tests for backend/handlers/assignments.go"

# 优化性能
claude "Optimize database queries in backend/handlers/courses_ext.go"
```

#### 项目级任务

```bash
# 生成文档
claude "Create comprehensive API documentation"

# 代码审查
claude "Review all Go files and suggest improvements"

# 安全审计
claude "Check for security vulnerabilities in the codebase"
```

---

## 方案 2：通过 OpenClaw Skills 使用（⏳ API 问题解决后可用）

### OpenClaw coding-agent Skill

一旦 API 连接问题解决，你可以通过 OpenClaw 使用更强大的功能：

#### 基本语法

通过 OpenClaw Gateway 发送消息：

```bash
openclaw agent --message "Use coding-agent to analyze my project at /e/biyesheji/psychic-broccoli" --to user@example.com
```

#### 后台任务

让 coding-agent 在后台执行长时间任务：

```
在 /e/biyesheji/psychic-broccoli 项目中使用 coding-agent：
bash pty:true workdir:/e/biyesheji/psychic-broccoli background:true command:"claude 'Add comprehensive error handling to all API endpoints'"
```

#### 并行任务

同时处理多个任务：

```
1. bash pty:true workdir:/e/biyesheji/psychic-broccoli command:"claude 'Review backend code'"
2. bash pty:true workdir:/e/biyesheji/psychic-broccoli command:"claude 'Review frontend code'"
```

---

## 当前状态

### ✅ 可用功能
- Claude Code CLI：直接在终端使用
- 项目代码分析
- 代码修改和重构
- 测试生成
- 文档创建

### ⏳ 待修复
- OpenClaw API 连接（user agent 限制）
- 解决后可使用：
  - OpenClaw skills 系统
  - 后台任务管理
  - 多渠道通知（WhatsApp、Telegram 等）
  - WebChat 聊天界面

---

## 推荐工作流

### 日常开发
```bash
# 1. 进入项目
cd /e/biyesheji/psychic-broccoli

# 2. 使用 Claude Code 完成任务
claude "Add validation to the course creation endpoint"

# 3. 查看更改
git status
git diff

# 4. 提交
git add .
git commit -m "Add validation to course creation"
```

### 大型重构
```bash
# 使用 Claude Code 的非交互模式
claude "Refactor the entire backend to use dependency injection" \
  --model claude-sonnet-4-5
```

---

## 配置项目工作区到 OpenClaw

创建项目特定的工作区配置：

```bash
# 创建项目配置
cat > ~/.openclaw/projects/biyesheji.json << 'EOF'
{
  "name": "毕设项目",
  "path": "/e/biyesheji/psychic-broccoli",
  "description": "在线教育平台",
  "tech": ["Go", "React", "SQLite"],
  "skills": ["coding-agent", "github"],
  "notes": "Frontend: React + TypeScript, Backend: Go + Gin"
}
EOF
```

---

## 示例：实际任务

### 任务 1：代码审查
```bash
cd /e/biyesheji/psychic-broccoli
claude "Review all changes in the last commit and provide feedback"
```

### 任务 2：添加功能
```bash
claude "Add a new endpoint to get course statistics (enrollment count, completion rate)"
```

### 任务 3：优化性能
```bash
claude "Analyze database queries and optimize slow operations"
```

### 任务 4：安全加固
```bash
claude "Audit the authentication and authorization code for security issues"
```

---

## 下一步

1. **立即尝试**：运行 `test-claude-code.sh` 测试 Claude Code
2. **解决 API**：联系中转站提供商或获取官方 Anthropic API
3. **启用更多 skills**：安装和配置其他有用的 skills
4. **集成工作流**：将 Claude Code 集成到你的日常开发流程

---

## 有用的命令

```bash
# 查看 Claude Code 帮助
claude --help

# 查看 OpenClaw skills
openclaw skills list

# 安装新 skill
npx clawhub install <skill-name>

# 启用插件
openclaw plugins enable <plugin-name>
```

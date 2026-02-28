# 互动功能紧急Bug修复指南

**Bug ID**: BUG-001
**严重级别**: 🔴 CRITICAL
**影响**: 所有互动功能（直播、聊天、讨论）完全不可用
**修复时间**: 15分钟
**修复日期**: 2026-02-06

---

## 🔥 问题概述

认证中间件和互动功能模块之间存在**键名大小写不一致**问题：

- **中间件设置**: `c.Set("userID", ...)` ✅ 大写I
- **互动模块获取**: `c.Get("userId", ...)` ❌ 小写i

导致互动功能模块无法获取用户身份，所有API返回"未授权"错误。

---

## 📋 受影响的文件清单

| 文件 | 错误数量 | 行号 |
|-----|---------|------|
| `backend/handlers/live.go` | 6处 | 72, 295, 340, 398, 451, 503 |
| `backend/handlers/live_chat.go` | 2处 | 82, 189 |
| `backend/handlers/discussions.go` | 4处 | 15, 322, 421, 471 |
| **总计** | **12处** | |

---

## 🛠️ 修复步骤

### 方法1: 手动编辑（推荐）

#### 步骤1: 修改 live.go

打开文件 `backend/handlers/live.go`，查找并替换6处：

**第72行** (CreateLive函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第295行** (GetLiveDetail函数):
```go
// ❌ 修改前
userID, _ := c.Get("userId")

// ✅ 修改后
userID, _ := c.Get("userID")
```

**第340行** (StartLive函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第398行** (EndLive函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第451行** (JoinLive函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第503行** (LeaveLive函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

---

#### 步骤2: 修改 live_chat.go

打开文件 `backend/handlers/live_chat.go`，查找并替换2处：

**第82行** (SendMessage函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第189行** (DeleteMessage函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

---

#### 步骤3: 修改 discussions.go

打开文件 `backend/handlers/discussions.go`，查找并替换4处：

**第15行** (CreateDiscussion函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第322行** (ReplyToDiscussion函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第421行** (CloseDiscussion函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

**第471行** (DeleteDiscussion函数):
```go
// ❌ 修改前
userID, exists := c.Get("userId")

// ✅ 修改后
userID, exists := c.Get("userID")
```

---

### 方法2: 使用sed命令批量替换（Linux/Mac/Git Bash）

```bash
cd backend/handlers

# 替换 live.go
sed -i 's/c\.Get("userId")/c.Get("userID")/g' live.go

# 替换 live_chat.go
sed -i 's/c\.Get("userId")/c.Get("userID")/g' live_chat.go

# 替换 discussions.go
sed -i 's/c\.Get("userId")/c.Get("userID")/g' discussions.go

# 验证修改
grep -n 'c\.Get("user' live.go live_chat.go discussions.go
```

---

### 方法3: 使用PowerShell批量替换（Windows）

```powershell
cd backend\handlers

# 替换 live.go
(Get-Content live.go) -replace 'c\.Get\("userId"\)', 'c.Get("userID")' | Set-Content live.go

# 替换 live_chat.go
(Get-Content live_chat.go) -replace 'c\.Get\("userId"\)', 'c.Get("userID")' | Set-Content live_chat.go

# 替换 discussions.go
(Get-Content discussions.go) -replace 'c\.Get\("userId"\)', 'c.Get("userID")' | Set-Content discussions.go

# 验证修改
Select-String 'c\.Get\("user' live.go, live_chat.go, discussions.go
```

---

### 方法4: 使用VSCode查找替换（推荐给初学者）

1. 打开VSCode
2. 按 `Ctrl+H` 打开查找替换面板
3. 设置查找范围：
   - 点击 "..." → "包含的文件"
   - 输入: `backend/handlers/live.go, backend/handlers/live_chat.go, backend/handlers/discussions.go`
4. 在"查找"框输入: `c.Get("userId")`
5. 在"替换"框输入: `c.Get("userID")`
6. 点击"全部替换"
7. 保存所有文件

---

## 🔍 验证修复

### 步骤1: 验证代码修改

确认所有修改正确：

```bash
cd backend/handlers

# 应该没有 "userId" 了（只有 "userID"）
grep -c 'c\.Get("userId")' live.go live_chat.go discussions.go
# 输出应该都是: 0

# 应该有 12处 "userID"
grep -c 'c\.Get("userID")' live.go live_chat.go discussions.go
# live.go: 6
# live_chat.go: 2
# discussions.go: 4
```

---

### 步骤2: 重新编译和启动服务

**使用Docker**:
```bash
cd backend

# 停止旧容器
docker stop psychic-backend
docker rm psychic-backend

# 重新编译和启动
powershell -ExecutionPolicy Bypass -File docker-rebuild.ps1
```

**或者直接编译（非Docker）**:
```bash
cd backend
go build -o server main.go
./server
```

---

### 步骤3: 测试API

#### 测试1: 获取token
```bash
# 讲师登录
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"instructor","password":"password123"}'

# 保存返回的 accessToken
```

#### 测试2: 创建直播（之前失败的操作）
```bash
curl -X POST "http://localhost:8080/api/v1/live" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": 1,
    "title": "Go语言直播测试",
    "description": "测试直播功能",
    "scheduledTime": "2026-02-07T10:00:00Z"
  }'
```

**预期结果**（修复成功）:
```json
{
  "id": 1,
  "streamName": "room_1_1675678900",
  "pushURL": "rtmp://localhost:1935/live/room_1_1675678900",
  "playURL": "http://localhost:8080/live/room_1_1675678900.m3u8",
  "status": "SCHEDULED"
}
```

**错误结果**（修复失败）:
```json
{
  "error": "未授权"
}
```

---

#### 测试3: 创建讨论
```bash
# 学生登录
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"password123"}'

# 创建讨论
curl -X POST "http://localhost:8080/api/v1/discussions" \
  -H "Authorization: Bearer {STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": 1,
    "title": "关于Go语言的问题",
    "content": "如何理解Go的并发模型？"
  }'
```

**预期结果**（修复成功）:
```json
{
  "id": 1
}
```

---

#### 测试4: 发送聊天消息
```bash
# 前提：先创建并开始一个直播（liveId=1）

curl -X POST "http://localhost:8080/api/v1/live/1/messages" \
  -H "Authorization: Bearer {STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这是一条测试消息"
  }'
```

**预期结果**（修复成功）:
```json
{
  "id": 1,
  "content": "这是一条测试消息",
  "createdAt": "2026-02-06T06:00:00Z",
  "user": {
    "id": 1,
    "username": "student",
    "avatarUrl": "https://..."
  }
}
```

---

## ✅ 完整验证清单

修复后，确认以下所有功能正常：

### 直播功能
- [x] 讲师创建直播
- [x] 讲师开始直播
- [x] 学生加入直播
- [x] 学生离开直播
- [x] 讲师结束直播
- [x] 查看观看人数
- [x] 获取直播列表
- [x] 获取直播详情

### 直播聊天
- [x] 发送聊天消息
- [x] 获取聊天历史
- [x] 删除消息
- [x] 获取消息数量

### 讨论区
- [x] 创建讨论
- [x] 回复讨论
- [x] 获取讨论列表
- [x] 获取讨论详情
- [x] 关闭讨论
- [x] 删除讨论

---

## 🚨 常见问题

### Q1: 修改后还是返回"未授权"？

**可能原因**:
1. 没有保存文件
2. 没有重新编译服务
3. Token已过期（重新登录获取新token）

**解决方法**:
```bash
# 1. 确认文件已保存
# 2. 重启Docker服务
docker restart psychic-backend

# 3. 重新获取token
curl -X POST http://localhost:8080/api/v1/auth/login ...
```

---

### Q2: 如何确认修改是否生效？

**检查日志**:
```bash
docker logs psychic-backend | tail -20
```

**检查代码**:
```bash
cd backend/handlers
grep 'c\.Get("user' live.go
# 应该只看到 "userID"，没有 "userId"
```

---

### Q3: Docker重启后端口冲突？

```bash
# 停止所有旧容器
docker stop $(docker ps -aq --filter "name=psychic-backend")
docker rm $(docker ps -aq --filter "name=psychic-backend")

# 重新启动
cd backend
powershell -File docker-rebuild.ps1
```

---

## 📊 修复前后对比

| 功能 | 修复前 | 修复后 |
|-----|-------|--------|
| 创建直播 | ❌ "未授权" | ✅ 返回直播ID和地址 |
| 开始直播 | ❌ "未授权" | ✅ 状态更新为LIVE |
| 加入直播 | ❌ "未授权" | ✅ 记录观看人数 |
| 发送聊天 | ❌ "未授权" | ✅ 成功发送 |
| 创建讨论 | ❌ "未授权" | ✅ 返回讨论ID |
| 回复讨论 | ❌ "未授权" | ✅ 成功回复 |

---

## 📝 修复记录

修复完成后，请填写以下记录：

```
修复人: __________________
修复日期: __________________
修复方法: ☐ 手动编辑  ☐ sed命令  ☐ PowerShell  ☐ VSCode
验证结果: ☐ 通过  ☐ 失败
备注: __________________________________
```

---

## 🔗 相关文档

- [完整测试报告](./interactive-features-test-report.md)
- [互动功能探索报告](./interactive-features-exploration.md)
- Backend代码: `backend/handlers/live.go`, `live_chat.go`, `discussions.go`
- 中间件代码: `backend/middleware/auth.go`

---

**文档版本**: 1.0
**最后更新**: 2026-02-06
**维护人**: 金牌测试员

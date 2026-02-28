# 第三周互动功能 - 快速启动和测试指南

**最后更新**: 2026-02-06
**状态**: 开发完成，待测试

---

## 🚀 快速启动

### 1. 前端依赖安装

首先需要安装新的依赖包：

```bash
cd frontend
npm install react-player dayjs
```

**必需的包**:
- `react-player` - 用于直播视频播放
- `dayjs` - 日期时间处理（如果还未安装）

### 2. 启动后端

```bash
cd backend
go run main.go
```

后端将在 `http://localhost:8080` 启动。

### 3. 启动前端

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:5173` 启动（默认Vite端口）。

---

## ✅ 功能测试清单

### 一、直播功能测试

#### 1.1 教师端 - 创建直播

1. 使用教师账号登录
2. 访问 `/teacher/live`
3. 点击"创建直播"按钮
4. 填写表单：
   - 选择课程
   - 输入直播标题
   - 输入描述（可选）
   - 选择预定时间（可选）
5. 点击"创建直播"
6. ✅ 验证：创建成功并跳转到直播控制页面

#### 1.2 教师端 - 开始直播

1. 在直播控制页面 `/teacher/live/:id`
2. 查看推流地址和密钥
3. 点击"复制"按钮复制推流信息
4. ✅ 验证：能正确复制推流地址和密钥
5. 点击"开始直播"按钮
6. ✅ 验证：直播状态变为"直播中"

**OBS 推流测试**（可选）:
1. 打开 OBS Studio
2. 设置 → 推流
3. 粘贴服务器地址和密钥
4. 添加视频源（摄像头或屏幕）
5. 点击"开始推流"
6. ✅ 验证：OBS显示推流成功

#### 1.3 学生端 - 观看直播

1. 使用学生账号登录
2. 访问 `/student/live/:id`
3. ✅ 验证：能看到直播视频播放器
4. ✅ 验证：能看到实时观看人数
5. ✅ 验证：观看人数会实时更新

#### 1.4 直播聊天功能

**发送消息**:
1. 在直播页面右侧聊天区
2. 输入消息内容
3. 点击"发送"
4. ✅ 验证：消息立即显示在聊天列表
5. ✅ 验证：消息自动滚动到底部

**接收消息**（使用两个浏览器窗口）:
1. 窗口A：学生账号发送消息
2. 窗口B：刷新或等待2秒
3. ✅ 验证：窗口B收到新消息
4. ✅ 验证：消息显示用户名、头像和时间

**删除消息**（教师权限）:
1. 使用教师账号查看直播
2. 点击消息的"删除"按钮
3. ✅ 验证：消息被删除

#### 1.5 结束直播

1. 在直播控制页面点击"结束直播"
2. ✅ 验证：直播状态变为"已结束"
3. ✅ 验证：学生端显示"直播已结束"

---

### 二、讨论区功能测试

#### 2.1 创建讨论

1. 使用学生或教师账号登录
2. 访问 `/student/discussions`
3. 点击"发起讨论"按钮
4. 填写表单：
   - 选择课程
   - 输入讨论标题
   - 输入讨论内容
5. 点击"发布讨论"
6. ✅ 验证：讨论创建成功并跳转到详情页

#### 2.2 查看讨论列表

1. 访问 `/student/discussions`
2. ✅ 验证：能看到所有讨论列表
3. ✅ 验证：显示标题、状态、回复数、课程信息
4. ✅ 验证：显示发起人和创建时间

**搜索和筛选**:
1. 在搜索框输入关键词
2. ✅ 验证：列表实时过滤
3. 选择状态筛选（进行中/已关闭）
4. ✅ 验证：列表正确筛选

#### 2.3 查看讨论详情

1. 点击讨论项进入详情页 `/student/discussions/:id`
2. ✅ 验证：能看到完整讨论内容
3. ✅ 验证：能看到所有回复列表
4. ✅ 验证：显示回复数量

#### 2.4 回复讨论

1. 在讨论详情页底部输入回复
2. 点击"发表回复"
3. ✅ 验证：回复成功并显示在列表
4. ✅ 验证：回复显示用户名和时间
5. ✅ 验证：讨论的回复数+1

#### 2.5 关闭讨论

1. 使用讨论发起人或教师账号
2. 点击"关闭讨论"按钮
3. 确认操作
4. ✅ 验证：讨论状态变为"已关闭"
5. ✅ 验证：无法继续回复

#### 2.6 删除讨论

1. 使用讨论发起人或管理员账号
2. 点击"删除"按钮
3. 确认删除
4. ✅ 验证：讨论被删除并跳转到列表页

---

## 🐛 常见问题排查

### 前端问题

#### 问题1: 编译错误 - Cannot find module 'react-player'
**解决方案**:
```bash
npm install react-player
```

#### 问题2: 编译错误 - Cannot find module 'dayjs'
**解决方案**:
```bash
npm install dayjs
```

#### 问题3: 路由404错误
**检查项**:
1. 确认 `pages/index.ts` 已导出所有新页面
2. 确认 `App.tsx` 已添加路由配置
3. 检查路由路径是否正确

#### 问题4: LiveChat组件样式问题
**检查项**:
1. 确认 `LiveChat.css` 文件存在
2. 确认在组件中正确导入CSS

### 后端问题

#### 问题1: 数据库表不存在
**解决方案**:
```bash
cd backend
sqlite3 database/education.db < database/migrations/004_add_live_and_discussion_tables.sql
```

#### 问题2: API 401 未授权错误
**检查项**:
1. 确认用户已登录
2. 检查token是否过期
3. 查看浏览器控制台的请求头

#### 问题3: API 403 权限错误
**检查项**:
1. 确认用户角色正确（学生/教师/管理员）
2. 确认用户已选修相关课程（讨论区功能）

---

## 📊 API测试（使用curl）

### 创建直播

```bash
# 获取token（先登录）
TOKEN="your_jwt_token_here"

# 创建直播
curl -X POST http://localhost:8080/api/v1/live \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": 1,
    "title": "测试直播",
    "description": "这是一个测试直播"
  }'
```

### 获取直播列表

```bash
curl http://localhost:8080/api/v1/live \
  -H "Authorization: Bearer $TOKEN"
```

### 开始直播

```bash
curl -X PUT http://localhost:8080/api/v1/live/1/start \
  -H "Authorization: Bearer $TOKEN"
```

### 发送聊天消息

```bash
curl -X POST http://localhost:8080/api/v1/live/1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, 直播间！"}'
```

### 获取聊天消息

```bash
curl http://localhost:8080/api/v1/live/1/messages \
  -H "Authorization: Bearer $TOKEN"
```

### 创建讨论

```bash
curl -X POST http://localhost:8080/api/v1/discussions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": 1,
    "title": "测试讨论",
    "content": "这是一个测试讨论内容"
  }'
```

### 回复讨论

```bash
curl -X POST http://localhost:8080/api/v1/discussions/1/replies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "这是一条回复"}'
```

---

## 📝 测试数据准备

### 创建测试账号

如果需要测试，请确保有以下账号：

```sql
-- 教师账号
INSERT INTO users (username, password_hash, email, role) VALUES
('teacher1', '$2a$10$...', 'teacher1@test.com', 'INSTRUCTOR');

-- 学生账号
INSERT INTO users (username, password_hash, email, role) VALUES
('student1', '$2a$10$...', 'student1@test.com', 'STUDENT'),
('student2', '$2a$10$...', 'student2@test.com', 'STUDENT');

-- 测试课程
INSERT INTO courses (title, description, instructor_id, status) VALUES
('测试课程1', '用于测试直播和讨论功能', 1, 'PUBLISHED');

-- 选课记录
INSERT INTO course_enrollments (student_id, course_id) VALUES
(2, 1), (3, 1);
```

---

## 🎯 验收标准

### 直播功能

- ✅ 教师能创建直播
- ✅ 教师能获取推流地址和密钥
- ✅ 教师能开始/结束直播
- ✅ 学生能观看直播（播放器正常显示）
- ✅ 聊天消息实时更新（2秒延迟）
- ✅ 聊天消息显示用户信息
- ✅ 教师能删除聊天消息
- ✅ 观看人数实时更新（5秒刷新）

### 讨论区功能

- ✅ 用户能创建讨论
- ✅ 用户能查看讨论列表
- ✅ 用户能搜索和筛选讨论
- ✅ 用户能查看讨论详情
- ✅ 用户能回复讨论
- ✅ 发起人/教师能关闭讨论
- ✅ 发起人/管理员能删除讨论
- ✅ 未选课学生无法发起讨论

### 权限控制

- ✅ 只有教师能创建直播
- ✅ 只有课程讲师能开始/结束直播
- ✅ 只有选课学生能参与课程讨论
- ✅ 消息删除权限正确

---

## 🔧 下一步优化建议

### 短期优化（可选）

1. **视频播放器增强**
   - 添加倍速播放
   - 添加全屏功能
   - 添加音量控制

2. **聊天功能增强**
   - 添加表情支持
   - 添加@提醒功能
   - 添加消息通知

3. **讨论区增强**
   - 添加点赞功能
   - 添加最佳回答标记
   - 添加讨论分类

### 长期优化

1. **升级为WebSocket**
   - 真正的实时通信（<100ms延迟）
   - 双向通信支持
   - 连接状态管理

2. **集成真实直播服务**
   - 阿里云直播服务
   - 推流鉴权
   - 播放鉴权

3. **性能优化**
   - 消息分页加载
   - 虚拟滚动
   - 懒加载优化

---

## 📚 相关文档

- [第三周完成报告](week3-interactive-features-report.md)
- [30天完成计划](30-day-completion-plan.md)
- [每日任务追踪](daily-task-tracker.md)

---

**祝测试顺利！如有问题请查看相关文档或检查代码实现。** 🎉

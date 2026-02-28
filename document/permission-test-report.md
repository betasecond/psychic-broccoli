# CourseArk 权限系统测试报告

**项目名称**: CourseArk - 在线教育平台
**测试日期**: 2026-02-02
**测试人员**: 金牌测试员
**测试类型**: 权限安全测试

---

## 📋 测试目录

1. [权限系统架构分析](#权限系统架构分析)
2. [测试方法和工具](#测试方法和工具)
3. [测试场景清单](#测试场景清单)
4. [测试执行记录](#测试执行记录)
5. [发现的问题](#发现的问题)
6. [修复建议](#修复建议)
7. [测试总结](#测试总结)

---

## 权限系统架构分析

### 后端权限系统

#### 1. 认证机制
- **技术**: JWT (JSON Web Token)
- **中间件**: `backend/middleware/auth.go` - `AuthMiddleware()`
- **Token存储**: 前端localStorage
- **Token内容**: userID, username, role

#### 2. 角色系统
项目定义了三种用户角色：

| 角色 | 代码标识 | 权限描述 |
|------|---------|---------|
| 管理员 | `ADMIN` | 最高权限，可以访问所有资源 |
| 教师 | `INSTRUCTOR` | 可以创建和管理自己的课程、作业、考试 |
| 学生 | `STUDENT` | 只能访问已选课程和自己的作业/考试 |

#### 3. 权限检查位置

**a) 中间件级别**
- `AuthMiddleware()` - 验证JWT token
- `RequireRole()` - 验证特定角色

**b) 业务逻辑级别**
- 课程管理：教师只能修改自己的课程
- 作业提交：学生只能查看/提交自己的作业
- 选课校验：学生需要选课才能访问课程资源

### 前端权限系统

#### ProtectedRoute 组件
- 文件: `frontend/src/components/ProtectedRoute.tsx`
- 功能:
  - 检查用户是否登录
  - 验证用户角色
  - 未授权用户重定向

---

## 测试方法和工具

### 测试工具
1. **cURL** - 命令行API测试
2. **Postman/Insomnia** - API测试客户端（推荐）
3. **浏览器DevTools** - 前端测试
4. **SQLite Browser** - 数据库验证

### 测试账号准备

需要准备以下测试账号：

```bash
# 管理员账号
username: admin
password: admin123

# 教师账号
username: teacher1
password: teacher123

# 学生账号1
username: student1
password: student123

# 学生账号2
username: student2
password: student123
```

### 获取测试Token

```bash
# 1. 登录获取token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1",
    "password": "student123"
  }'

# 响应示例：
# {
#   "code": 200,
#   "data": {
#     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "tokenType": "Bearer",
#     "user": {...}
#   }
# }
```

---

## 测试场景清单

### 类别1: 认证测试 (Authentication)

#### ✅ TEST-AUTH-01: 未携带Token访问受保护资源
**目标**: 验证未登录用户无法访问需要认证的API

**测试步骤**:
```bash
curl -X GET http://localhost:8080/api/v1/auth/me
```

**预期结果**:
- HTTP状态码: 401 Unauthorized
- 返回消息: "缺少认证令牌"

**实际结果**: ⬜ 待测试

---

#### ✅ TEST-AUTH-02: 使用无效Token访问
**目标**: 验证系统能识别并拒绝无效token

**测试步骤**:
```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

**预期结果**:
- HTTP状态码: 401 Unauthorized
- 返回消息: "无效的认证令牌"

**实际结果**: ⬜ 待测试

---

#### ✅ TEST-AUTH-03: 使用过期Token访问
**目标**: 验证过期token被正确拒绝

**测试步骤**:
1. 使用旧的/过期的token
2. 访问任意受保护API

**预期结果**:
- HTTP状态码: 401 Unauthorized
- 返回消息: "无效的认证令牌"

**实际结果**: ⬜ 待测试

---

### 类别2: 角色权限测试 (Role-Based Access Control)

#### 🔴 TEST-ROLE-01: 学生访问教师专属功能
**目标**: 验证学生无法创建课程

**测试步骤**:
```bash
# 使用学生token创建课程
curl -X POST http://localhost:8080/api/v1/courses \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试课程",
    "description": "这是学生尝试创建的课程",
    "status": "DRAFT"
  }'
```

**预期结果**:
- HTTP状态码: 403 Forbidden
- 返回消息: "权限不足"

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-ROLE-02: 学生访问其他学生的作业提交
**目标**: 验证学生只能查看自己的作业提交记录

**测试步骤**:
```bash
# Student1 尝试查看 Student2 的作业提交
curl -X GET "http://localhost:8080/api/v1/assignments/submissions?studentId=2" \
  -H "Authorization: Bearer <STUDENT1_TOKEN>"
```

**预期结果**:
- HTTP状态码: 403 Forbidden
- 返回消息: "只能查看自己的提交记录"

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-ROLE-03: 教师修改其他教师的课程
**目标**: 验证教师只能修改自己创建的课程

**测试步骤**:
```bash
# Teacher1 尝试修改 Teacher2 的课程 (假设课程ID=5是Teacher2的)
curl -X PUT http://localhost:8080/api/v1/courses/5 \
  -H "Authorization: Bearer <TEACHER1_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "被篡改的课程标题",
    "description": "测试权限漏洞",
    "status": "PUBLISHED"
  }'
```

**预期结果**:
- HTTP状态码: 403 Forbidden
- 返回消息: "权限不足"

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-ROLE-04: 教师批改其他教师课程的作业
**目标**: 验证教师只能批改自己课程的作业

**测试步骤**:
```bash
# Teacher1 尝试批改 Teacher2 课程的作业提交
curl -X PUT http://localhost:8080/api/v1/assignments/submissions/10/grade \
  -H "Authorization: Bearer <TEACHER1_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "grade": 100,
    "feedback": "测试权限"
  }'
```

**预期结果**:
- HTTP状态码: 403 Forbidden
- 返回消息: "权限不足"

**实际结果**: ⬜ 待测试

---

### 类别3: 数据可见性测试 (Data Visibility)

#### 🔴 TEST-VISIBILITY-01: 学生查看未发布课程
**目标**: 验证学生只能看到已发布(PUBLISHED)的课程

**测试步骤**:
```bash
# 学生获取课程列表（不指定status参数）
curl -X GET "http://localhost:8080/api/v1/courses?page=1&pageSize=20" \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

**预期结果**:
- 返回的课程列表中，所有课程的status都是"PUBLISHED"
- 不应包含状态为"DRAFT"或"ARCHIVED"的课程

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-VISIBILITY-02: 学生查看未选课程的作业
**目标**: 验证学生只能查看已选课程的作业

**测试步骤**:
```bash
# 学生查询未选课程的作业列表（假设课程ID=99是未选的）
curl -X GET "http://localhost:8080/api/v1/assignments?courseId=99" \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

**预期结果**:
- HTTP状态码: 403 Forbidden
- 返回消息: "您未选修此课程"

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-VISIBILITY-03: 学生提交未选课程的作业
**目标**: 验证学生无法提交未选课程的作业

**测试步骤**:
```bash
# 学生提交未选课程的作业（假设作业ID=50属于未选课程）
curl -X POST http://localhost:8080/api/v1/assignments/50/submit \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这是我的作业答案",
    "attachments": null
  }'
```

**预期结果**:
- HTTP状态码: 403 Forbidden
- 返回消息: "您未选修此课程"

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-VISIBILITY-04: 用户查看他人的消息
**目标**: 验证用户只能查看自己的消息

**测试步骤**:
```bash
# Student1 尝试访问 Student2 的消息
# 注意：messages接口使用userID from context，所以这个测试需要特殊处理
curl -X GET http://localhost:8080/api/v1/messages \
  -H "Authorization: Bearer <STUDENT1_TOKEN>"
```

**预期结果**:
- 只返回Student1自己的消息
- 不包含其他用户的消息

**验证方法**:
- 检查返回的消息列表中的user_id字段
- 确保所有消息的user_id都等于Student1的ID

**实际结果**: ⬜ 待测试

---

### 类别4: 选课状态校验测试 (Enrollment Validation)

#### 🔴 TEST-ENROLL-01: 未选课学生访问课程详情
**目标**: 根据30天计划，这是一个已知问题，需要验证

**测试步骤**:
```bash
# 学生访问未选课程的详情页
curl -X GET http://localhost:8080/api/v1/courses/5 \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

**当前行为**: 可以访问（可能的安全问题）
**建议行为**: 应该检查选课状态

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-ENROLL-02: 学生重复选课
**目标**: 验证学生不能重复选择同一门课程

**测试步骤**:
```bash
# 第一次选课（应该成功）
curl -X POST http://localhost:8080/api/v1/courses/3/enroll \
  -H "Authorization: Bearer <STUDENT_TOKEN>"

# 第二次选课（应该失败）
curl -X POST http://localhost:8080/api/v1/courses/3/enroll \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

**预期结果**:
- 第二次请求返回 400 Bad Request
- 返回消息: "已选过该课程"

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-ENROLL-03: 学生选择未发布课程
**目标**: 验证学生只能选择已发布的课程

**测试步骤**:
```bash
# 尝试选择状态为DRAFT的课程（需要先在数据库中创建一个DRAFT课程）
curl -X POST http://localhost:8080/api/v1/courses/99/enroll \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

**预期结果**:
- HTTP状态码: 400 Bad Request
- 返回消息: "课程未发布"

**实际结果**: ⬜ 待测试

---

### 类别5: 前端路由权限测试 (Frontend Route Protection)

#### 🔴 TEST-FRONTEND-01: 学生访问教师页面
**目标**: 验证前端路由保护正常工作

**测试步骤**:
1. 使用学生账号登录
2. 尝试直接访问教师页面URL: `http://localhost:5173/teacher/dashboard`

**预期结果**:
- 被自动重定向到学生dashboard: `/student/dashboard`
- 或显示"权限不足"提示

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-FRONTEND-02: 未登录用户访问受保护页面
**目标**: 验证未登录用户被重定向到登录页

**测试步骤**:
1. 清除localStorage中的token
2. 尝试访问任意受保护页面，如: `/student/dashboard`

**预期结果**:
- 被重定向到登录页: `/login`
- URL中包含redirect参数，记录原始目标页面

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-FRONTEND-03: Token过期后的页面行为
**目标**: 验证token过期后前端的处理

**测试步骤**:
1. 修改localStorage中的token为过期token
2. 刷新任意受保护页面
3. 观察页面行为

**预期结果**:
- 自动重定向到登录页
- 显示"登录已过期，请重新登录"提示

**实际结果**: ⬜ 待测试

---

### 类别6: 特殊边界测试 (Edge Cases)

#### 🔴 TEST-EDGE-01: SQL注入测试
**目标**: 验证权限检查不受SQL注入影响

**测试步骤**:
```bash
# 尝试在studentId参数中注入SQL
curl -X GET "http://localhost:8080/api/v1/assignments/submissions?studentId=1%20OR%201=1" \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

**预期结果**:
- 安全地处理输入
- 只返回当前用户的数据
- 不泄露其他用户数据

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-EDGE-02: Token伪造测试
**目标**: 验证JWT签名验证有效

**测试步骤**:
1. 获取一个有效token
2. 修改token payload部分（如改变userID）
3. 使用修改后的token访问API

**预期结果**:
- HTTP状态码: 401 Unauthorized
- 返回消息: "无效的认证令牌"

**实际结果**: ⬜ 待测试

---

#### 🔴 TEST-EDGE-03: 整数溢出测试
**目标**: 验证ID参数的安全处理

**测试步骤**:
```bash
# 使用超大ID值
curl -X GET http://localhost:8080/api/v1/courses/999999999999 \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

**预期结果**:
- 安全地处理
- 返回404 Not Found或400 Bad Request

**实际结果**: ⬜ 待测试

---

## 测试执行记录

### 执行环境
- 后端服务: http://localhost:8080
- 前端服务: http://localhost:5173
- 数据库: SQLite (backend/database/education.db)
- 测试时间: [待填写]

### 测试摘要

| 类别 | 总计 | 通过 | 失败 | 待测试 |
|------|------|------|------|--------|
| 认证测试 | 3 | 0 | 0 | 3 |
| 角色权限测试 | 4 | 0 | 0 | 4 |
| 数据可见性测试 | 4 | 0 | 0 | 4 |
| 选课状态校验 | 3 | 0 | 0 | 3 |
| 前端路由保护 | 3 | 0 | 0 | 3 |
| 边界测试 | 3 | 0 | 0 | 3 |
| **总计** | **20** | **0** | **0** | **20** |

---

## 发现的问题

### 🔴 高危问题 (Critical)

暂无（待测试后填写）

---

### 🟡 中危问题 (Medium)

暂无（待测试后填写）

---

### 🟢 低危问题 (Low)

暂无（待测试后填写）

---

## 修复建议

### 已知问题修复建议（来自30天计划）

#### 1. 课程详情选课状态校验
**文件**: `backend/handlers/courses.go`
**函数**: `GetCourse`

**建议代码**:
```go
func GetCourse(c *gin.Context) {
    courseID := c.Param("id")
    userID, _ := c.Get("userID")
    role, _ := c.Get("role")

    var course models.Course
    err := database.DB.QueryRow(`...`).Scan(...)

    if err == sql.ErrNoRows {
        utils.NotFound(c, "课程不存在")
        return
    }
    if err != nil {
        utils.InternalServerError(c, "查询失败")
        return
    }

    // 【新增】如果是学生，需要检查选课状态或课程发布状态
    if role == "STUDENT" {
        if course.Status != "PUBLISHED" {
            utils.NotFound(c, "课程不存在")
            return
        }

        // 可选：检查是否选课
        var enrolled int
        database.DB.QueryRow(`
            SELECT COUNT(*) FROM course_enrollments
            WHERE student_id = ? AND course_id = ?
        `, userID, courseID).Scan(&enrolled)

        if enrolled == 0 {
            utils.Forbidden(c, "请先选修此课程")
            return
        }
    }

    utils.Success(c, course)
}
```

---

### 通用安全建议

#### 1. 实现接口频率限制 (Rate Limiting)
防止暴力破解和DDOS攻击

#### 2. 添加详细的审计日志
记录所有敏感操作（登录、修改权限、删除数据等）

#### 3. 实现Token刷新机制
当前JWT没有刷新机制，建议实现refresh token

#### 4. 加强密码策略
- 最小长度8位
- 必须包含大小写字母、数字、特殊字符
- 定期提醒修改密码

---

## 测试总结

### 总体评估
⬜ 待完成测试后填写

### 安全评分
⬜ 待完成测试后填写

评分标准：
- A (90-100分): 优秀，权限系统非常安全
- B (80-89分): 良好，有小问题但不影响整体安全
- C (70-79分): 及格，存在中等风险需要修复
- D (60-69分): 较差，存在高危漏洞
- F (<60分): 不合格，严重安全问题

### 后续工作建议

1. ✅ 执行所有测试用例
2. ✅ 修复发现的高危和中危问题
3. ✅ 完善审计日志系统
4. ✅ 添加自动化权限测试
5. ✅ 定期进行安全审计

---

**测试文档版本**: 1.0
**创建日期**: 2026-02-02
**最后更新**: 2026-02-02
**状态**: 📝 测试准备完成，等待执行

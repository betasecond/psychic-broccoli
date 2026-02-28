# 权限修复测试指南

**测试日期**: 2026-02-02
**修复内容**: Day 1 权限修复与安全加固

---

## 📊 测试数据说明

### 用户账号（密码都是 password123）

#### 学生账号
| 用户名 | ID | 已选课程 | 用途 |
|--------|----|---------| -----|
| student | 1 | 课程11, 12 | 原有学生，有多个提交记录 |
| student2 | 19 | 课程11, 13 | 测试选课权限 |
| student3 | 20 | 课程12, 13 | 测试选课权限 |
| student4 | 21 | 课程11 | 测试选课权限 |
| student5 | 22 | **无** | 测试未选课权限（重要）|

#### 教师账号
| 用户名 | ID | 教授课程 | 用途 |
|--------|----|---------| -----|
| instructor | 2 | 课程11, 12, 14 | 原有教师 |
| instructor3 | 10 | 课程13, 15 | 教师账号2 |
| instructor4 | 11 | 课程16 | 教师账号3 |

#### 管理员账号
| 用户名 | ID | 权限 |
|--------|----| -----|
| admin | 18 | 所有权限 |

### 课程数据

#### 已发布课程（所有学生可见）
| ID | 课程名 | 教师ID | 状态 |
|----|--------|--------|------|
| 11 | Python编程入门 | 2 | PUBLISHED |
| 12 | Java高级编程 | 2 | PUBLISHED |
| 13 | 前端开发实战 | 10 | PUBLISHED |

#### 草稿课程（仅创建者和管理员可见）
| ID | 课程名 | 教师ID | 状态 |
|----|--------|--------|------|
| 14 | 机器学习基础（草稿）| 2 | DRAFT |
| 15 | 数据结构与算法（草稿）| 10 | DRAFT |
| 16 | Go语言开发（草稿）| 11 | DRAFT |

#### 已归档课程
| ID | 课程名 | 教师ID | 状态 |
|----|--------|--------|------|
| 17 | 旧版Web开发（已归档）| 10 | ARCHIVED |

### 作业数据

| 作业ID | 所属课程 | 作业名称 |
|--------|---------|---------|
| 11 | 课程11 | Python基础练习1 |
| 12 | 课程11 | Python函数编程 |
| 13 | 课程11 | Python面向对象 |
| 14 | 课程12 | Java多线程编程 |
| 15 | 课程12 | Java集合框架 |
| 16 | 课程13 | HTML5网页制作 |
| 17 | 课程13 | CSS布局练习 |

---

## 🧪 权限测试用例

### 测试 1: 作业提交记录权限

#### 测试1.1 - 学生只能查看自己的提交 ✅

**步骤**:
1. 使用 `student` 账号登录 (username: student, password: password123)
2. 尝试查看其他学生的提交记录

**测试命令**:
```bash
# 1. 登录获取token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"password123"}'

# 2. 保存token到变量（从上面响应中获取）
TOKEN="your_token_here"

# 3. 尝试查看其他学生(student2, ID=19)的提交（应该失败）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/assignments/submissions?studentId=19"

# 4. 查看自己的提交（应该成功）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/assignments/submissions?studentId=1"
```

**预期结果**:
- 第3步：返回 `403 Forbidden` 或 "只能查看自己的提交记录"
- 第4步：返回 `200 OK` 及提交记录

---

#### 测试1.2 - 教师只能查看自己课程的提交 ✅

**步骤**:
1. 使用 `instructor` 账号登录
2. 查看自己课程（课程11）的作业提交
3. 尝试查看其他教师课程（课程13）的作业提交

**测试命令**:
```bash
# 1. 教师登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"instructor","password":"password123"}'

TOKEN="your_token_here"

# 2. 查看自己课程11的作业11的提交（应该成功）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/assignments/submissions?assignmentId=11"

# 3. 查看其他教师课程13的作业16的提交（应该失败）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/assignments/submissions?assignmentId=16"
```

**预期结果**:
- 第2步：返回 `200 OK` 及作业11的提交记录
- 第3步：返回 `403 Forbidden` 或 "只能查看自己课程的作业提交"

---

### 测试 2: 作业列表选课权限

#### 测试2.1 - 未选课学生不能查看作业列表 ✅

**步骤**:
1. 使用 `student5` 账号登录（该学生未选任何课程）
2. 尝试查看课程11的作业列表

**测试命令**:
```bash
# 1. student5 登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student5","password":"password123"}'

TOKEN="your_token_here"

# 2. 尝试查看课程11的作业（应该失败）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/assignments?courseId=11"
```

**预期结果**:
- 返回 `403 Forbidden` 或 "您未选修此课程"

---

#### 测试2.2 - 已选课学生可以查看作业列表 ✅

**步骤**:
1. 使用 `student` 账号登录（已选课程11）
2. 查看课程11的作业列表

**测试命令**:
```bash
# 1. student 登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"password123"}'

TOKEN="your_token_here"

# 2. 查看已选课程11的作业（应该成功）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/assignments?courseId=11"
```

**预期结果**:
- 返回 `200 OK` 及课程11的作业列表（作业11, 12, 13）

---

### 测试 3: 课程列表状态过滤

#### 测试3.1 - 学生只能看到已发布课程 ✅

**步骤**:
1. 使用 `student` 账号登录
2. 查询课程列表（不指定status参数）

**测试命令**:
```bash
# 1. student 登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"password123"}'

TOKEN="your_token_here"

# 2. 查看课程列表（应该只看到PUBLISHED状态的）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/courses"
```

**预期结果**:
- 只返回 PUBLISHED 状态的课程（课程11, 12, 13）
- **不应该**包含 DRAFT 课程（课程14, 15, 16）

---

#### 测试3.2 - 教师可以看到自己的草稿课程 ✅

**步骤**:
1. 使用 `instructor` 账号登录（ID=2，有草稿课程14）
2. 查询课程列表

**测试命令**:
```bash
# 1. instructor 登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"instructor","password":"password123"}'

TOKEN="your_token_here"

# 2. 查看课程列表
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/courses"
```

**预期结果**:
- 包含自己的已发布课程（课程11, 12）
- 包含自己的草稿课程（课程14）
- 包含其他教师的已发布课程（课程13）
- **不包含**其他教师的草稿课程（课程15, 16）

---

#### 测试3.3 - 管理员可以看到所有课程 ✅

**步骤**:
1. 使用 `admin` 账号登录
2. 查询课程列表

**测试命令**:
```bash
# 1. admin 登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

TOKEN="your_token_here"

# 2. 查看课程列表
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/courses"
```

**预期结果**:
- 包含所有状态的所有课程（PUBLISHED, DRAFT, ARCHIVED）

---

## 🎯 快速测试脚本

创建一个测试脚本 `test_permissions.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:8080/api/v1"

echo "=== 权限测试开始 ==="

# 测试1: 学生登录
echo -e "\n[测试1] 学生登录"
STUDENT_TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"password123"}' \
  | jq -r '.data.accessToken')
echo "Student Token: ${STUDENT_TOKEN:0:20}..."

# 测试2: 学生查看其他人的提交（应该失败）
echo -e "\n[测试2] 学生查看其他人的提交（应该失败）"
curl -s -H "Authorization: Bearer $STUDENT_TOKEN" \
  "$API_URL/assignments/submissions?studentId=19" \
  | jq '.message'

# 测试3: 未选课学生登录
echo -e "\n[测试3] 未选课学生登录"
STUDENT5_TOKEN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student5","password":"password123"}' \
  | jq -r '.data.accessToken')

# 测试4: 未选课学生查看作业（应该失败）
echo -e "\n[测试4] 未选课学生查看作业（应该失败）"
curl -s -H "Authorization: Bearer $STUDENT5_TOKEN" \
  "$API_URL/assignments?courseId=11" \
  | jq '.message'

# 测试5: 学生查看课程列表（应该只看到PUBLISHED）
echo -e "\n[测试5] 学生查看课程列表"
curl -s -H "Authorization: Bearer $STUDENT_TOKEN" \
  "$API_URL/courses" \
  | jq '.data.courses[] | {id, title, status}'

echo -e "\n=== 权限测试完成 ==="
```

---

## 📝 测试检查清单

Day 1 权限修复验收：

- [ ] 学生无法查看其他学生的作业提交记录
- [ ] 教师无法查看其他教师课程的作业提交
- [ ] 未选课学生无法查看课程作业列表
- [ ] 已选课学生可以正常查看作业
- [ ] 学生只能看到已发布课程
- [ ] 教师可以看到自己的草稿课程
- [ ] 管理员可以看到所有课程
- [ ] 所有修改已提交到git

---

## 🔧 如何重新加载测试数据

如果需要重新加载测试数据：

```bash
cd backend
sqlite3 database/education.db < database/test_data.sql
```

---

**文档创建日期**: 2026-02-02
**作者**: 开发团队

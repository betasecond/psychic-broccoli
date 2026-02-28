# 学习进度追踪功能缺陷报告

**项目**: 教育平台系统
**模块**: 学习进度追踪
**测试日期**: 2026-02-05
**报告人**: 金牌测试员

---

## 缺陷总览

| ID | 标题 | 严重级别 | 状态 | 优先级 | 发现阶段 |
|----|------|---------|------|--------|---------|
| BUG-001 | GetMyCourses API返回progress始终为0 | 🔴 HIGH | 待修复 | P0 | 后端API测试 |

**总计**: 1个缺陷
**高严重级别**: 1个
**需立即修复**: 1个

---

## BUG-001: GetMyCourses API返回progress始终为0

### 基本信息
| 项目 | 内容 |
|-----|------|
| **缺陷ID** | BUG-001 |
| **标题** | GetMyCourses API返回progress始终为0 |
| **严重级别** | 🔴 HIGH（高） |
| **优先级** | P0（立即修复） |
| **状态** | 🔴 待修复 |
| **发现日期** | 2026-02-05 |
| **发现人** | 金牌测试员 |
| **发现阶段** | 后端API测试 |
| **所属模块** | 后端API - 课程管理 |
| **影响版本** | master分支最新版本 |

---

### 缺陷描述

调用 `GET /api/v1/courses/my` 获取学生已选课程列表时，返回的所有课程的 `progress` 字段都是 `0`，无论数据库中存储的真实进度值是多少（如 30、50、100 等）。

同时，`completedChapters` 字段也始终返回 `0`，未实现章节完成数量的统计。

---

### 复现步骤

#### 前置条件
1. 学生用户已登录（username: student, ID: 1）
2. 学生已选修课程ID=11（Python编程入门，共5个章节）

#### 操作步骤
1. 标记课程11的章节24完成
   ```bash
   curl -X POST "http://localhost:8080/api/v1/chapters/24/complete" \
     -H "Authorization: Bearer {token}"
   ```
   返回: `{"progress": 20, "completedCount": 1, "totalCount": 5}`

2. 标记章节25完成
   返回: `{"progress": 40, "completedCount": 2, "totalCount": 5}`

3. 验证数据库中的进度值
   ```sql
   SELECT progress FROM course_enrollments
   WHERE student_id = 1 AND course_id = 11;
   ```
   结果: `40` ✅ 正确

4. 调用 GetMyCourses API
   ```bash
   curl -X GET "http://localhost:8080/api/v1/courses/my" \
     -H "Authorization: Bearer {token}"
   ```

#### 实际结果
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "courses": [
      {
        "id": 11,
        "title": "Python编程入门",
        "progress": 0,           // ❌ 错误：应该是 40
        "totalChapters": 5,
        "completedChapters": 0   // ❌ 错误：应该是 2
      }
    ]
  }
}
```

#### 预期结果
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "courses": [
      {
        "id": 11,
        "title": "Python编程入门",
        "progress": 40,          // ✅ 应该显示真实进度
        "totalChapters": 5,
        "completedChapters": 2   // ✅ 应该显示已完成章节数
      }
    ]
  }
}
```

---

### 根本原因分析

**问题文件**: `backend/handlers/courses_ext.go`
**问题函数**: `GetMyCourses` (第11-96行)

#### 原因1: SQL查询缺少 progress 字段

**代码位置**: 第21-32行

```go
rows, err := database.DB.Query(`
    SELECT c.id, c.title, c.description, c.instructor_id, c.category_id, c.created_at,
           u.username as instructor_name,
           cat.name as category_name,
           ce.enrolled_at
           -- ❌ 问题：缺少 ce.progress
    FROM courses c
    JOIN course_enrollments ce ON c.id = ce.course_id
    JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_categories cat ON c.category_id = cat.id
    WHERE ce.student_id = ?
    ORDER BY ce.enrolled_at DESC
`, userID)
```

**分析**: SQL SELECT 语句中没有选择 `course_enrollments` 表的 `progress` 字段，导致无法获取真实进度值。

---

#### 原因2: 硬编码返回 progress = 0

**代码位置**: 第76-88行

```go
// 获取课程进度（章节完成情况 - 暂时返回模拟数据）
var totalChapters int
database.DB.QueryRow(`
    SELECT COUNT(*) FROM course_chapters WHERE course_id = ?
`, id).Scan(&totalChapters)

course["totalChapters"] = totalChapters
course["completedChapters"] = 0 // TODO: 实现章节完成追踪

if totalChapters > 0 {
    course["progress"] = 0.0  // ❌ 问题：硬编码为0，完全忽略数据库值
} else {
    course["progress"] = 0.0
}
```

**分析**:
1. 代码中有 `TODO` 注释，说明功能未完成
2. `progress` 被硬编码为 `0.0`，没有从数据库读取
3. `completedChapters` 也被硬编码为 `0`，没有查询 `chapter_completions` 表

---

#### 原因3: Scan 未读取 progress 值

**代码位置**: 第50-51行

```go
rows.Scan(&id, &title, &description, &instructorID, &categoryID, &createdAt,
    &instructorName, &categoryName, &enrolledAt)
    // ❌ 缺少: &progress
```

**分析**: 即使SQL中添加了 `ce.progress`，这里也没有变量接收它。

---

### 影响范围

#### 直接影响
1. ⚠️ **前端课程列表页面**
   - 所有课程显示进度为 0%
   - 进度条始终为空
   - 状态始终显示"进行中"，即使已完成

2. ⚠️ **用户体验**
   - 学生看不到真实学习进度
   - 无法感知学习成就
   - 降低学习动力

3. ⚠️ **数据浪费**
   - 数据库中正确存储了进度值
   - 但前端无法获取和展示
   - 章节完成记录未被利用

#### 间接影响
4. ⚠️ **统计分析**
   - 无法基于真实进度做学习分析
   - 课程完成率统计错误

5. ⚠️ **用户留存**
   - 进度反馈缺失可能降低用户活跃度

---

### 修复方案

#### 方案A: 快速修复（仅读取 progress 字段）⭐ 推荐

**修复时间**: 15分钟
**修复难度**: 简单
**风险等级**: 低

**修改文件**: `backend/handlers/courses_ext.go`

**步骤1**: 修改SQL查询（第21-32行）
```go
rows, err := database.DB.Query(`
    SELECT c.id, c.title, c.description, c.instructor_id, c.category_id, c.created_at,
           u.username as instructor_name,
           cat.name as category_name,
           ce.enrolled_at,
           ce.progress  -- ✅ 添加此字段
    FROM courses c
    JOIN course_enrollments ce ON c.id = ce.course_id
    JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_categories cat ON c.category_id = cat.id
    WHERE ce.student_id = ?
    ORDER BY ce.enrolled_at DESC
`, userID)
```

**步骤2**: 添加变量接收 progress（第42-48行）
```go
var id, instructorID int64
var title string
var description sql.NullString
var categoryID sql.NullInt64
var createdAt, enrolledAt sql.NullTime
var instructorName string
var categoryName sql.NullString
var progress int  // ✅ 添加此变量
```

**步骤3**: 修改 Scan 语句（第50-51行）
```go
rows.Scan(&id, &title, &description, &instructorID, &categoryID, &createdAt,
    &instructorName, &categoryName, &enrolledAt, &progress)  // ✅ 添加 &progress
```

**步骤4**: 使用真实进度值（第76-88行替换为）
```go
// 获取课程章节数
var totalChapters int
database.DB.QueryRow(`
    SELECT COUNT(*) FROM course_chapters WHERE course_id = ?
`, id).Scan(&totalChapters)

course["totalChapters"] = totalChapters
course["progress"] = progress  // ✅ 使用从数据库读取的真实值
```

**优点**:
- ✅ 修改简单，风险低
- ✅ 快速见效
- ✅ 不改变现有数据结构

**缺点**:
- ⚠️ `completedChapters` 仍然是0（但影响较小）

---

#### 方案B: 完整修复（实现 completedChapters）

**修复时间**: 30分钟
**修复难度**: 中等
**风险等级**: 低-中

在方案A的基础上，额外实现 `completedChapters` 查询：

**步骤5**: 查询已完成章节数（在第83行后添加）
```go
// 查询已完成的章节数
var completedChapters int
database.DB.QueryRow(`
    SELECT COUNT(*) FROM chapter_completions
    WHERE student_id = ? AND chapter_id IN (
        SELECT id FROM course_chapters WHERE course_id = ?
    )
`, userID, id).Scan(&completedChapters)

course["completedChapters"] = completedChapters  // ✅ 使用真实值
```

**优点**:
- ✅ 功能完整
- ✅ 数据准确
- ✅ 前端可显示"已完成 X / Y 章节"

**缺点**:
- ⚠️ 每个课程多一次数据库查询（性能影响小）
- ⚠️ 代码稍复杂

---

#### 方案C: 性能优化版（使用JOIN）

**修复时间**: 45分钟
**修复难度**: 较高
**风险等级**: 中

使用 LEFT JOIN 和 GROUP BY 一次性查询所有数据：

```go
rows, err := database.DB.Query(`
    SELECT c.id, c.title, c.description, c.instructor_id, c.category_id, c.created_at,
           u.username as instructor_name,
           cat.name as category_name,
           ce.enrolled_at,
           ce.progress,
           COUNT(DISTINCT ch.id) as total_chapters,
           COUNT(DISTINCT cc.chapter_id) as completed_chapters
    FROM courses c
    JOIN course_enrollments ce ON c.id = ce.course_id
    JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_categories cat ON c.category_id = cat.id
    LEFT JOIN course_chapters ch ON c.id = ch.course_id
    LEFT JOIN chapter_completions cc ON ch.id = cc.chapter_id AND cc.student_id = ce.student_id
    WHERE ce.student_id = ?
    GROUP BY c.id
    ORDER BY ce.enrolled_at DESC
`, userID)
```

**优点**:
- ✅ 性能最优（单次查询）
- ✅ 减少数据库往返次数

**缺点**:
- ⚠️ SQL复杂度高
- ⚠️ 需要仔细测试 GROUP BY 逻辑
- ⚠️ 修改风险较大

---

### 推荐方案

**🎯 推荐方案B（完整修复）**

**理由**:
1. 修复时间适中（30分钟）
2. 功能完整，用户体验最佳
3. 风险可控
4. 性能影响可忽略（学生选课数量通常< 20门）

**实施步骤**:
1. 按方案A修复 `progress` 字段（15分钟）
2. 测试验证 progress 显示正确
3. 按方案B添加 `completedChapters` 查询（15分钟）
4. 完整测试

---

### 测试建议

#### 修复后必须验证的测试用例

**测试1**: 基本功能验证
```bash
# 1. 标记2个章节完成（总共5个章节）
curl -X POST "http://localhost:8080/api/v1/chapters/24/complete" -H "Authorization: Bearer {token}"
curl -X POST "http://localhost:8080/api/v1/chapters/25/complete" -H "Authorization: Bearer {token}"

# 2. 验证数据库
sqlite3 education.db "SELECT progress FROM course_enrollments WHERE student_id=1 AND course_id=11;"
# 预期: 40

# 3. 调用 GetMyCourses
curl -X GET "http://localhost:8080/api/v1/courses/my" -H "Authorization: Bearer {token}"

# 4. 验证返回值
# 预期: {"progress": 40, "completedChapters": 2, "totalChapters": 5}
```

**测试2**: 边界条件
- 进度=0% (未完成任何章节)
- 进度=100% (完成所有章节)
- 课程没有章节（totalChapters=0）

**测试3**: 多用户隔离
- 学生A和学生B选修同一课程
- 学生A完成2章，学生B完成3章
- 验证各自的进度互不影响

**测试4**: 前端显示
- 课程列表页面显示正确进度条
- 进度百分比文字正确
- 状态标签正确（进行中/已完成）

---

### 回归测试

修复后需要运行以下回归测试，确保未引入新问题：

1. ✅ 标记章节完成功能正常
2. ✅ 进度自动计算正常
3. ✅ 其他课程相关API正常
4. ✅ 前端页面渲染正常

---

### 截图和日志

#### API返回对比

**修复前**:
```json
{
  "id": 11,
  "title": "Python编程入门",
  "progress": 0,           // ❌ 错误
  "completedChapters": 0   // ❌ 错误
}
```

**修复后（预期）**:
```json
{
  "id": 11,
  "title": "Python编程入门",
  "progress": 40,          // ✅ 正确
  "completedChapters": 2   // ✅ 正确
}
```

#### 数据库验证

```sql
-- 查询学生1的课程11进度
SELECT ce.progress, COUNT(cc.id) as completed
FROM course_enrollments ce
LEFT JOIN chapter_completions cc ON cc.student_id = ce.student_id
WHERE ce.student_id = 1 AND ce.course_id = 11;

-- 结果:
-- progress=40, completed=2
```

---

### 相关代码

#### 问题代码
**文件**: `backend/handlers/courses_ext.go`
**行号**: 11-96

```go
func GetMyCourses(c *gin.Context) {
    // ... 省略前面代码 ...

    // ❌ 问题代码
    course["totalChapters"] = totalChapters
    course["completedChapters"] = 0 // TODO: 实现章节完成追踪
    if totalChapters > 0 {
        course["progress"] = 0.0  // 硬编码
    } else {
        course["progress"] = 0.0
    }

    // ... 省略后面代码 ...
}
```

#### 修复代码（方案B）
```go
func GetMyCourses(c *gin.Context) {
    userID, _ := c.Get("userID")
    role, _ := c.Get("role")

    if role != "STUDENT" {
        utils.Forbidden(c, "权限不足")
        return
    }

    // ✅ 修改SQL查询，添加 ce.progress
    rows, err := database.DB.Query(`
        SELECT c.id, c.title, c.description, c.instructor_id, c.category_id, c.created_at,
               u.username as instructor_name,
               cat.name as category_name,
               ce.enrolled_at,
               ce.progress
        FROM courses c
        JOIN course_enrollments ce ON c.id = ce.course_id
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN course_categories cat ON c.category_id = cat.id
        WHERE ce.student_id = ?
        ORDER BY ce.enrolled_at DESC
    `, userID)

    if err != nil {
        utils.InternalServerError(c, "查询失败")
        return
    }
    defer rows.Close()

    courses := []gin.H{}
    for rows.Next() {
        var id, instructorID int64
        var title string
        var description sql.NullString
        var categoryID sql.NullInt64
        var createdAt, enrolledAt sql.NullTime
        var instructorName string
        var categoryName sql.NullString
        var progress int  // ✅ 添加变量

        // ✅ Scan 包含 progress
        rows.Scan(&id, &title, &description, &instructorID, &categoryID, &createdAt,
            &instructorName, &categoryName, &enrolledAt, &progress)

        course := gin.H{
            "id":             id,
            "title":          title,
            "instructorId":   instructorID,
            "instructorName": instructorName,
        }

        if description.Valid {
            course["description"] = description.String
        }
        if categoryID.Valid {
            course["categoryId"] = categoryID.Int64
        }
        if categoryName.Valid {
            course["categoryName"] = categoryName.String
        }
        if createdAt.Valid {
            course["createdAt"] = createdAt.Time
        }
        if enrolledAt.Valid {
            course["enrolledAt"] = enrolledAt.Time
        }

        // ✅ 查询总章节数
        var totalChapters int
        database.DB.QueryRow(`
            SELECT COUNT(*) FROM course_chapters WHERE course_id = ?
        `, id).Scan(&totalChapters)

        // ✅ 查询已完成章节数
        var completedChapters int
        database.DB.QueryRow(`
            SELECT COUNT(*) FROM chapter_completions
            WHERE student_id = ? AND chapter_id IN (
                SELECT id FROM course_chapters WHERE course_id = ?
            )
        `, userID, id).Scan(&completedChapters)

        course["totalChapters"] = totalChapters
        course["completedChapters"] = completedChapters
        course["progress"] = progress  // ✅ 使用真实值

        courses = append(courses, course)
    }

    utils.Success(c, gin.H{
        "courses": courses,
    })
}
```

---

### 优先级说明

**为什么是 P0（立即修复）？**

1. **影响核心用户体验**
   - 学习进度是教育平台的核心功能
   - 用户无法看到学习成果

2. **修复成本低**
   - 只需15-30分钟
   - 改动量小，风险低

3. **数据完整但未展示**
   - 数据库中有正确数据
   - 只是读取逻辑缺失

4. **用户感知明显**
   - 用户会立即发现进度始终为0
   - 影响平台可信度

---

### 相关文档

- [测试报告](./progress-tracking-test-report.md)
- [测试计划](./progress-tracking-test-plan.md)
- 源码位置: `backend/handlers/courses_ext.go`
- API文档: `GET /api/v1/courses/my`

---

### 历史记录

| 日期 | 操作 | 操作人 | 备注 |
|-----|------|-------|------|
| 2026-02-05 | 创建缺陷 | 金牌测试员 | API测试发现 |
| __________ | 指派开发 | _________ | - |
| __________ | 修复完成 | _________ | - |
| __________ | 验证通过 | _________ | - |
| __________ | 关闭缺陷 | _________ | - |

---

**缺陷报告生成时间**: 2026-02-05 13:35:00
**报告人**: 金牌测试员
**审核人**: 待指定

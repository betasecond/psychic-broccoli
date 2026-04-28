# CourseArk LLM 数据库设计文档

## 0. 文档定位

本文档在以下文档之后编写，用于给后续 AI coding agent、后端开发、数据库维护和测试人员承接 LLM 功能实现：

1. `docs/LLM/01-需求分析.md`
2. `docs/LLM/02-LLM功能详细设计.md`
3. `docs/LLM/03-LLM前端设计文档.md`
4. `docs/LLM/04-LLM API与数据库设计基线冻结文档.md`
5. `docs/LLM/05-LLM API设计文档.md`

本文档只展开数据库设计与数据写入边界。根据 `04` 的冻结基线，本轮 LLM 能力不新增表、不新增索引、不新增软删除、不新增版本字段、不迁移核心教学表结构。

本文档的核心目的：

1. 明确 LLM 功能如何复用现有表。
2. 明确哪些接口可以写库，哪些接口禁止写库。
3. 明确题目确认导入时字段如何落库。
4. 明确本轮不做数据库迁移的原因和后续解冻条件。
5. 为后续 AI 实现提供可逐项检查的数据库约束。

## 1. 数据库设计结论

本轮结论：

| 项目 | 结论 |
| --- | --- |
| 是否新增表 | 否 |
| 是否修改表结构 | 否 |
| 是否新增索引 | 否 |
| 是否新增软删除 | 否 |
| 是否新增乐观锁字段 | 否 |
| 是否持久化 LLM 调用记录 | 否 |
| 是否持久化临时模型 Key | 否 |
| 是否持久化 LLM 原始响应 | 否 |
| 是否持久化解析接口结果 | 否 |

允许复用的现有表：

| 表 | 用途 |
| --- | --- |
| `courses` | 课程归属校验 |
| `course_chapters` | 教师确认大纲后，通过既有章节创建接口写入 |
| `course_sections` | 教师确认大纲后，通过既有课时创建接口写入 |
| `exams` | 考试归属校验 |
| `exam_questions` | 教师确认题目后写入 |
| `ai_corrections` | 题目确认导入时记录修订差异 |

禁止新增的临时表类型：

1. `llm_logs`
2. `llm_parse_records`
3. `question_parse_records`
4. `outline_parse_records`
5. `temporary_questions`
6. `model_keys`
7. `ai_import_sessions`

若后续确需新增持久化 LLM 调用记录，必须先更新 `04-LLM API与数据库设计基线冻结文档.md` 并编写迁移方案。

## 2. 数据流与写库边界

### 2.1 课程大纲解析数据流

```text
上传大纲文件
→ parse-outline
→ LLM 解析或规则回退
→ 返回 chapters/sections 预览
→ 前端教师确认
→ 调用既有 createChapter
→ 写入 course_chapters
→ 调用既有 createSection
→ 写入 course_sections
```

`parse-outline` 阶段禁止写库：

| 表 | 是否允许写入 | 说明 |
| --- | --- | --- |
| `course_chapters` | 否 | 解析结果只返回给前端 |
| `course_sections` | 否 | 解析结果只返回给前端 |
| `ai_corrections` | 否 | 大纲解析不记录修订审计 |
| 任意 LLM 日志表 | 否 | 本轮不存在此类表 |

教师确认导入阶段允许写库：

| 接口 | 表 | 说明 |
| --- | --- | --- |
| `POST /api/v1/courses/:id/chapters` | `course_chapters` | 创建章节 |
| `POST /api/v1/courses/:id/chapters/:cid/sections` | `course_sections` | 创建课时 |

### 2.2 试题解析数据流

```text
上传题目文件或自然语言要求
→ parse-questions
→ LLM 解析/生成或规则回退
→ 返回 questions 预览
→ 前端教师编辑、删除、选择
→ questions/confirm
→ 写入 exam_questions
→ 写入 ai_corrections 修订审计
```

`parse-questions` 阶段禁止写库：

| 表 | 是否允许写入 | 说明 |
| --- | --- | --- |
| `exam_questions` | 否 | 题目必须教师确认后才入库 |
| `ai_corrections` | 否 | 尚未发生教师确认和修订 |
| 任意 LLM 日志表 | 否 | 本轮不存在此类表 |

`questions/confirm` 阶段允许写库：

| 表 | 是否允许写入 | 说明 |
| --- | --- | --- |
| `exam_questions` | 是 | 写入教师确认后的题目 |
| `ai_corrections` | 是 | 记录原始解析与教师修订差异 |

## 3. 现有表设计

### 3.1 `courses`

用途：

1. 保存课程基础信息。
2. 为 `parse-outline` 提供课程存在性校验。
3. 为教师权限提供归属校验。
4. 为考试题目接口通过 `exams.course_id` 间接提供归属校验。

当前字段：

| 字段 | 类型与约束 | LLM 相关用途 |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | 课程 ID |
| `title` | `TEXT NOT NULL` | 不修改 |
| `description` | `TEXT NOT NULL` | 不修改 |
| `cover_image_url` | `TEXT` | 不修改 |
| `instructor_id` | `INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT` | 教师归属校验 |
| `category_id` | `INTEGER REFERENCES course_categories(id) ON DELETE SET NULL` | 不修改 |
| `status` | `TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))` | 不修改 |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | 不修改 |
| `updated_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | 不修改 |

LLM 相关规则：

1. 本轮不向 `courses` 增加任何 LLM 字段。
2. 不记录课程大纲是否由 LLM 解析。
3. 不记录 `parseMode`、`fallbackReason`。
4. 归属校验必须依赖 `instructor_id`。

### 3.2 `course_chapters`

用途：

1. 保存课程章节。
2. 大纲解析结果经教师确认后，通过既有创建章节接口写入。

当前字段：

| 字段 | 类型与约束 | LLM 相关用途 |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | 章节 ID，数据库生成 |
| `course_id` | `INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE` | 归属课程 |
| `title` | `TEXT NOT NULL` | 来自教师确认后的章节标题 |
| `order_index` | `INTEGER NOT NULL DEFAULT 0` | 来自确认后的章节顺序 |

字段映射：

| API 字段 | 数据库字段 | 规则 |
| --- | --- | --- |
| `chapters[].title` | `title` | 非空，建议 1 到 100 字 |
| `chapters[].orderIndex` | `order_index` | 从 1 开始，最终以创建接口处理为准 |
| 路径 `courseId` | `course_id` | 不信任前端传入其他课程 ID |

约束：

1. `parse-outline` 不得写入本表。
2. 只有教师确认导入后，前端调用既有创建章节接口才写入本表。
3. 不新增 `parse_mode`、`source`、`llm_confidence`、`created_by_llm` 等字段。
4. 不新增唯一约束。当前允许同一课程下重复章节标题，后续如需去重由业务层处理。

### 3.3 `course_sections`

用途：

1. 保存课程课时。
2. 大纲解析结果经教师确认后，通过既有创建课时接口写入。

当前字段：

| 字段 | 类型与约束 | LLM 相关用途 |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | 课时 ID，数据库生成 |
| `chapter_id` | `INTEGER NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE` | 归属章节 |
| `title` | `TEXT NOT NULL` | 来自教师确认后的课时标题 |
| `order_index` | `INTEGER NOT NULL DEFAULT 0` | 来自确认后的课时顺序 |
| `type` | `TEXT NOT NULL CHECK(type IN ('VIDEO', 'TEXT', 'LIVE', 'ASSIGNMENT', 'EXAM'))` | LLM 本轮只产出 `VIDEO` 或 `TEXT` |
| `video_url` | `TEXT` | 大纲导入通常为空 |
| `content` | `TEXT` | 大纲导入通常为空 |
| `resource_id` | `INTEGER` | 大纲导入通常为空 |

字段映射：

| API 字段 | 数据库字段 | 规则 |
| --- | --- | --- |
| `sections[].title` | `title` | 非空，建议 1 到 100 字 |
| `sections[].orderIndex` | `order_index` | 从 1 开始，最终以创建接口处理为准 |
| `sections[].type` | `type` | 本轮只允许 `VIDEO` 或 `TEXT` |
| 创建章节返回 ID | `chapter_id` | 前端必须使用真实创建后的章节 ID |

约束：

1. `parse-outline` 不得写入本表。
2. LLM 大纲解析结果只允许返回 `VIDEO` 或 `TEXT`，但数据库枚举不得收窄。
3. 不新增 `parse_mode`、`fallback_reason`、`llm_confidence` 字段。
4. 前端重试导入时必须避免重复创建已成功章节下的课时。

### 3.4 `exams`

用途：

1. 保存考试基础信息。
2. 为 `parse-questions` 和 `questions/confirm` 提供考试存在性校验。
3. 通过 `course_id` 与 `courses` 联合完成教师归属校验。

当前字段：

| 字段 | 类型与约束 | LLM 相关用途 |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | 考试 ID |
| `course_id` | `INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE` | 归属课程，用于权限校验 |
| `title` | `TEXT NOT NULL` | 不修改 |
| `start_time` | `DATETIME NOT NULL` | 不修改 |
| `end_time` | `DATETIME NOT NULL` | 不修改 |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | 不修改 |

LLM 相关规则：

1. 本轮不向 `exams` 增加任何 LLM 字段。
2. 不记录考试是否启用 LLM。
3. 不记录题目导入来源。
4. 教师权限校验必须使用 `exams.course_id -> courses.instructor_id`。

### 3.5 `exam_questions`

用途：

1. 保存考试题目。
2. LLM 或规则解析得到的题目必须经过教师确认后，才写入本表。

当前字段：

| 字段 | 类型与约束 | LLM 相关用途 |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | 题目 ID，数据库生成 |
| `exam_id` | `INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE` | 归属考试 |
| `type` | `TEXT NOT NULL CHECK(type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'))` | 题型 |
| `stem` | `TEXT NOT NULL` | 题干 |
| `options` | `TEXT` | JSON 数组字符串，选择题选项 |
| `answer` | `TEXT NOT NULL` | 归一化答案 |
| `score` | `REAL NOT NULL` | 分值 |
| `order_index` | `INTEGER NOT NULL DEFAULT 0` | 题目顺序 |

字段映射：

| 确认导入字段 | 数据库字段 | 规则 |
| --- | --- | --- |
| 路径 `:id` / `examId` | `exam_id` | 二者必须一致，以路径资源为准 |
| `type` | `type` | 四种枚举之一 |
| `stem` | `stem` | 非空 |
| `options` | `options` | 序列化为 JSON 数组字符串；非选择题本轮统一写入 `[]` |
| `answer` | `answer` | 按题型归一化后保存裸答案字符串 |
| `score` | `score` | 大于 0 |
| 插入顺序 | `order_index` | 建议从当前最大值后递增 |

答案存储口径：

1. 本轮 `questions/confirm` 写入 `exam_questions.answer` 时统一保存裸答案字符串，例如 `A`、`A,C`、`true`、`false` 或简答参考答案。
2. 不应使用 `fmt.Sprintf("%q", q.Answer)` 这类方式把答案额外包成 JSON 字符串，例如 `"A"`。
3. 读取、判分和历史数据兼容逻辑仍应兼容既有 JSON 字符串答案，避免旧数据或旧接口写入结果失效。
4. 手动新增题目和 AI 确认导入题目应在判分时表现一致。

不得落库字段：

| API/前端字段 | 原因 |
| --- | --- |
| `confidence` | 只用于解析预览，不属于题库业务字段 |
| `issues` | 只用于教师确认前提示 |
| `parseMode` | 接口响应元信息 |
| `fallbackReason` | 接口响应元信息 |
| `_selected` | 前端 UI 状态 |
| `_saved` | 前端 UI 状态 |
| `_saving` | 前端 UI 状态 |
| `_editing` | 前端 UI 状态 |
| `_error` | 前端 UI 状态 |

题型存储规则：

| 题型 | `options` 存储 | `answer` 存储 |
| --- | --- | --- |
| `SINGLE_CHOICE` | JSON 数组字符串，如 `["go","func"]` | `A` |
| `MULTIPLE_CHOICE` | JSON 数组字符串，如 `["A选项","B选项"]` | `A,C` |
| `TRUE_FALSE` | `[]` | `true` 或 `false` |
| `SHORT_ANSWER` | `[]` | 参考答案文本 |

兼容说明：读取端可以兼容历史空字符串或旧 JSON 字符串答案，但本轮新增写入必须使用上表口径。

约束：

1. `parse-questions` 不得写入本表。
2. `questions/confirm` 是解析题目批量导入本表的唯一入口。
3. 手动新增题目继续使用既有 `AddQuestion` 接口。
4. 不新增 `source`、`confidence`、`issues`、`llm_raw_json` 等字段。
5. 单题插入失败时跳过并继续处理后续题目，返回 `inserted/total`。

### 3.6 `ai_corrections`

用途：

1. 记录 AI/规则解析题目经教师确认导入时的修订差异。
2. 复用既有审计表，不新增 LLM 专用日志表。

当前字段：

| 字段 | 类型与约束 | LLM 相关用途 |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | 审计记录 ID |
| `exam_id` | `INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE` | 归属考试 |
| `user_id` | `INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE` | 操作教师或管理员 |
| `original_json` | `TEXT NOT NULL` | 解析完成瞬间的原始题目快照 |
| `corrected_json` | `TEXT NOT NULL` | 实际成功插入题库的题目快照 |
| `diff_summary` | `TEXT NOT NULL DEFAULT ''` | 差异摘要 |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | 审计时间 |

写入规则：

1. 仅 `questions/confirm` 写入本表。
2. `original_json` 使用前端传入的 `originalQuestions`，但后端应确保不含 UI 字段。
3. `corrected_json` 使用实际成功插入 `exam_questions` 的题目快照，不保存被跳过的非法题。
4. `diff_summary` 可记录新增题目数、修改题目数、跳过题目数等短摘要；当 `confirmedQuestions` 有 3 道但实际只插入 2 道时，`corrected_json` 保存成功插入的 2 道，`diff_summary` 记录跳过 1 道。
5. 写入失败不阻断 `exam_questions` 主流程，但必须记录短日志。

禁止内容：

1. 临时模型 Key。
2. 上传原文全文。
3. LLM 原始响应全文。
4. 前端 UI 字段。
5. 过长错误堆栈。

## 4. 关系设计

### 4.1 大纲相关关系

```text
courses 1 ── N course_chapters 1 ── N course_sections
```

外键：

| 子表 | 外键 | 父表 | 删除策略 |
| --- | --- | --- | --- |
| `course_chapters` | `course_id` | `courses.id` | `ON DELETE CASCADE` |
| `course_sections` | `chapter_id` | `course_chapters.id` | `ON DELETE CASCADE` |

LLM 相关说明：

1. 解析结果中的章节和课时没有数据库 ID。
2. 前端必须先创建章节，拿到真实章节 ID 后再创建课时。
3. 部分失败时不回滚已创建章节或课时。
4. 重试时应复用已创建章节 ID，避免重复章节。

### 4.2 试题相关关系

```text
courses 1 ── N exams 1 ── N exam_questions
                     └── N ai_corrections
```

外键：

| 子表 | 外键 | 父表 | 删除策略 |
| --- | --- | --- | --- |
| `exams` | `course_id` | `courses.id` | `ON DELETE CASCADE` |
| `exam_questions` | `exam_id` | `exams.id` | `ON DELETE CASCADE` |
| `ai_corrections` | `exam_id` | `exams.id` | `ON DELETE CASCADE` |
| `ai_corrections` | `user_id` | `users.id` | `ON DELETE CASCADE` |

LLM 相关说明：

1. `parse-questions` 返回的题目没有数据库 ID。
2. `questions/confirm` 插入后由数据库生成题目 ID。
3. `ai_corrections` 与单个题目没有外键关系，记录的是一次确认导入的整体修订快照。

## 5. 状态设计

本轮不新增数据库状态字段。

接口状态使用响应字段表达：

| 状态 | 存储位置 | 是否入库 |
| --- | --- | --- |
| `parseMode=llm` | API 响应 | 否 |
| `parseMode=rule_fallback` | API 响应 | 否 |
| `fallbackReason` | API 响应和短日志 | 否 |
| `confidence` | API 响应和前端临时状态 | 否 |
| `issues` | API 响应和前端临时状态 | 否 |

当前既有数据库状态枚举不变：

| 表 | 字段 | 枚举 |
| --- | --- | --- |
| `courses` | `status` | `DRAFT`、`PUBLISHED`、`ARCHIVED` |

禁止：

1. 不向 `exam_questions` 增加 `status` 字段。
2. 不向 `course_chapters` 增加 `source_status` 字段。
3. 不向任何表增加 `parse_status` 字段。

## 6. 约束设计

### 6.1 数据库约束

沿用现有约束：

| 表 | 约束 |
| --- | --- |
| `course_chapters` | `course_id` 外键，`title NOT NULL` |
| `course_sections` | `chapter_id` 外键，`title NOT NULL`，`type CHECK` |
| `exams` | `course_id` 外键，`title/start_time/end_time NOT NULL` |
| `exam_questions` | `exam_id` 外键，`type CHECK`，`stem/answer/score NOT NULL` |
| `ai_corrections` | `exam_id/user_id` 外键，JSON 字段 NOT NULL |

本轮不新增数据库级约束。

### 6.2 业务约束

需要在后端业务层保证：

课程大纲：

1. 章节标题非空。
2. 课时标题非空。
3. 课时类型为 `VIDEO` 或 `TEXT`。
4. 章节和课时顺序连续。

试题：

1. 题型必须合法。
2. 题干非空。
3. 分值大于 0。
4. 选择题至少 2 个选项。
5. 单选答案必须是一个合法选项字母。
6. 多选答案必须是一组合法选项字母。
7. 判断题答案必须是 `true` 或 `false`。
8. 简答题答案非空。

原因：

1. 当前 SQLite 表结构无法表达所有复杂业务约束。
2. LLM 输出不可信，必须在后端写入前做完整校验。
3. 前端校验只改善体验，不作为安全边界。

## 7. 索引设计

现有相关索引：

| 索引 | 字段 | 用途 |
| --- | --- | --- |
| `idx_chapters_course_id` | `course_chapters(course_id)` | 查询课程章节 |
| `idx_sections_chapter_id` | `course_sections(chapter_id)` | 查询章节课时 |
| `idx_exams_course_id` | `exams(course_id)` | 查询课程考试和权限校验 |
| `idx_questions_exam_id` | `exam_questions(exam_id)` | 查询考试题目 |
| `idx_ai_corrections_user_id` | `ai_corrections(user_id)` | 查询用户修订记录 |
| `idx_ai_corrections_exam_id` | `ai_corrections(exam_id)` | 查询考试修订记录 |

本轮不新增索引。

理由：

1. 解析接口不写库、不查解析历史。
2. 确认导入使用既有考试题目表，已有 `exam_id` 索引。
3. 归属校验使用既有 `exams.course_id` 和 `courses.instructor_id` 查询路径。
4. LLM 日志不持久化，因此不存在日志查询索引。

若后续新增持久化 LLM 调用记录，必须重新设计索引，至少考虑 `course_id`、`exam_id`、`user_id`、`created_at`。

## 8. 审计设计

### 8.1 服务端日志

解析接口只记录服务端短日志，不入库。

建议记录：

| 字段 | 示例 |
| --- | --- |
| `api` | `parse-outline`、`parse-questions` |
| `userId` | 当前用户 ID |
| `courseId` | 大纲解析课程 ID |
| `examId` | 试题解析考试 ID |
| `parseMode` | `llm`、`rule_fallback` |
| `fallbackReason` | `missing_key`、`timeout` |
| `chapterCount` | 3 |
| `sectionCount` | 12 |
| `questionCount` | 5 |
| `durationMs` | 1200 |

禁止记录：

1. 完整 API Key。
2. 上传文件全文。
3. LLM 原始响应全文。
4. 完整错误堆栈。

### 8.2 数据库审计

只在试题确认导入时复用 `ai_corrections`。

写入时机：

```text
questions/confirm
→ 成功插入至少 1 道题
→ 生成修订摘要
→ 插入 ai_corrections
```

`ai_corrections` 失败策略：

1. 不回滚已插入的题目。
2. 记录短日志。
3. API 仍返回题目导入结果。

大纲导入不写 `ai_corrections`，因为当前表语义是考试题目修订，不适合复用到章节课时。

## 9. 迁移策略

### 9.1 本轮迁移结论

本轮无数据库迁移。

无需创建迁移脚本：

1. 不新增表。
2. 不新增字段。
3. 不新增索引。
4. 不修改 CHECK 枚举。
5. 不调整外键。
6. 不新增触发器。

实现 LLM 功能时不得修改：

1. `backend/database/schema.sql` 的核心表结构。
2. 已有 SQLite 数据库表结构。
3. 生产数据中的核心表列。

例外：

1. 如果发现当前运行库缺失既有 `ai_corrections` 表，可以按既有 `schema.sql` 和 `db.go` 初始化逻辑补齐。
2. 该补齐不属于本轮新增表，而是恢复项目已有表。

### 9.2 后续解冻迁移条件

只有出现以下需求，才考虑数据库迁移：

| 需求 | 可能变更 |
| --- | --- |
| 需要查看 LLM 调用历史 | 新增 `llm_call_logs` 或等价表 |
| 需要恢复未确认的解析结果 | 新增解析会话表 |
| 需要统计 AI 导入质量 | 新增题目来源字段或审计扩展表 |
| 需要防重复确认导入 | 新增幂等键或导入批次表 |
| 需要题目级修订审计 | 新增题目修订明细表 |

解冻文档必须包含：

1. 变更原因。
2. 新表或字段设计。
3. 与 `04` 冻结规则的冲突点。
4. 迁移 SQL。
5. 回滚 SQL。
6. 前后端兼容方案。
7. 测试方案。

## 10. 写入流程设计

### 10.1 大纲确认导入写入流程

由前端控制分步写入：

```text
for chapter in selectedChapters:
  createChapter(courseId, chapter.title)
  if success:
    for section in selectedSections:
      createSection(courseId, createdChapterId, section)
```

数据库影响：

1. 创建章节成功后写入 `course_chapters`。
2. 创建课时成功后写入 `course_sections`。
3. 课时失败不自动删除已创建章节。
4. 后续重试应复用已创建章节 ID。

排序策略：

1. 前端可按解析结果顺序提交。
2. 后端既有创建接口可使用请求中的 `orderIndex` 或当前最大顺序。
3. 不要求本轮新增批量排序事务。

### 10.2 试题确认导入写入流程

后端控制单请求内逐题插入：

```text
校验 examId 与路径一致
→ 校验用户有权操作考试
→ 获取当前 exam_questions 最大 order_index
→ 遍历 confirmedQuestions
→ 校验单题
→ 归一化 options/answer
→ 插入 exam_questions
→ 收集实际成功插入的题目快照
→ 统计 inserted
→ 写入 ai_corrections
→ 返回 inserted/total
```

插入 `exam_questions` 建议 SQL 语义：

```sql
INSERT INTO exam_questions (
  exam_id,
  type,
  stem,
  options,
  answer,
  score,
  order_index
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

插入 `ai_corrections` 建议 SQL 语义：

```sql
INSERT INTO ai_corrections (
  exam_id,
  user_id,
  original_json,
  corrected_json,
  diff_summary
) VALUES (?, ?, ?, ?, ?);
```

### 10.3 部分成功语义

当前冻结语义为“逐题插入，单题失败跳过”。

| 场景 | 处理 |
| --- | --- |
| 某道题字段非法 | 跳过该题 |
| 某道题插入失败 | 跳过该题，记录短日志 |
| 后续题合法 | 继续插入 |
| 至少 1 道成功 | 返回 200，`inserted/total` |
| 0 道成功 | 返回 400 |
| 审计写入失败 | 不阻断主流程 |

后续不得在未更新冻结文档的情况下改为“全成功或全回滚”的事务语义。

## 11. 数据安全设计

### 11.1 临时模型 Key

临时模型 Key 只允许存在于：

1. 前端 `sessionStorage`。
2. HTTP 请求头。
3. 后端请求生命周期内存。

禁止：

1. 写入任意数据库表。
2. 写入日志。
3. 写入 `ai_corrections`。
4. 写入错误响应。
5. 写入 URL query。

### 11.2 上传内容

上传文件全文只允许存在于：

1. 当前请求内存。
2. LLM 调用 prompt。
3. 必要的短日志摘要不包含全文。

禁止：

1. 持久化上传全文。
2. 写入 `ai_corrections.original_json`。
3. 写入错误响应。

说明：

`ai_corrections.original_json` 存储的是结构化题目快照，不是上传文件全文。

### 11.3 LLM 原始响应

LLM 原始响应只用于当前请求解析。

禁止：

1. 写入数据库。
2. 完整写入日志。
3. 返回给前端。

前端只接收经过后端校验和归一化后的结构化结果。

## 12. 数据一致性设计

### 12.1 大纲导入一致性

大纲导入使用既有章节/课时接口，天然是多请求流程。

一致性规则：

1. 已成功创建的章节和课时不自动回滚。
2. 部分失败时前端保留失败项。
3. 前端重试时避免重复创建已成功章节。
4. 后端不新增大纲批量事务接口。

风险：

1. 网络中断可能导致部分章节创建成功。
2. 重试不当可能产生重复章节。

控制：

1. 前端记录 `_createdChapterId`。
2. 前端对已保存章节/课时标记 `_saved=true`。
3. 重试只补未完成项。

### 12.2 试题导入一致性

试题确认导入是单请求多题写入。

一致性规则：

1. 按题逐条校验和插入。
2. 单题失败不影响其他题。
3. 返回 `inserted/total` 告知结果。
4. `ai_corrections` 审计失败不回滚题目。

风险：

1. 用户重复点击可能重复插入。
2. 部分题目失败后需要前端明确提示。

控制：

1. 前端导入中禁用确认按钮。
2. 成功后关闭弹窗并刷新题目列表。
3. `inserted < total` 时提示部分成功。

## 13. 数据验证规则

### 13.1 大纲解析响应验证

虽然 `parse-outline` 不写库，但输出会被后续创建接口使用，因此必须先验证：

| 字段 | 规则 |
| --- | --- |
| `chapters` | 至少 1 个有效章节 |
| `chapter.title` | 非空 |
| `chapter.orderIndex` | 正整数，后端可重排 |
| `sections` | 缺失时归一化为 `[]` |
| `section.title` | 非空 |
| `section.type` | `VIDEO` 或 `TEXT` |
| `section.orderIndex` | 正整数，后端可重排 |

### 13.2 试题确认入库验证

写入 `exam_questions` 前必须验证：

| 字段 | 规则 |
| --- | --- |
| `exam_id` | 考试存在且用户有权限 |
| `type` | 四种题型之一 |
| `stem` | 非空 |
| `options` | 选择题至少 2 项，非选择题归一化为空数组 |
| `answer` | 按题型合法 |
| `score` | 大于 0 |
| `order_index` | 建议递增 |

### 13.3 JSON 字段验证

`exam_questions.options`：

1. 写入前必须能序列化为 JSON 数组字符串。
2. 新增写入时，非选择题必须写入 `[]`，不得写空字符串。
3. 不得写入前端 UI 字段。
4. 读取端应兼容历史数据中的空字符串。

`exam_questions.answer`：

1. 新增写入时必须保存裸答案字符串。
2. 单选题示例为 `A`，多选题示例为 `A,C`，判断题示例为 `true`。
3. 不得额外序列化成带引号的 JSON 字符串。
4. 读取、判分逻辑应兼容历史数据中可能存在的 JSON 字符串答案。

`ai_corrections.original_json` 和 `corrected_json`：

1. 必须是合法 JSON 字符串。
2. 必须只包含业务题目字段。
3. 不得包含临时模型 Key、上传原文或 UI 字段。
4. `corrected_json` 必须与实际成功插入的题目集合一致。

## 14. 与 RAG 数据库的边界

当前项目已有 RAG 相关表：

| 表 | 用途 |
| --- | --- |
| `rag_documents` | 课程知识库文档 |
| `rag_chunks` | 文档分块 |
| `rag_queries` | 问答查询记录 |

本轮 LLM 课程大纲解析和试题解析不修改这些表。

边界：

1. 不重写 RAG 文档上传。
2. 不迁移 RAG 分块和向量数据。
3. 不把大纲解析或试题解析记录写入 `rag_queries`。
4. `X-RAG-API-Key` 只是历史请求头命名，不代表本轮数据写入 RAG 表。

## 15. 后续 AI 实现约束

后续 AI coding agent 修改代码时必须遵守：

1. 不新增数据库表。
2. 不新增数据库字段。
3. 不新增索引。
4. 不修改 `course_sections.type` 的 CHECK 枚举。
5. 不修改 `exam_questions.type` 的 CHECK 枚举。
6. 不把 `parseMode`、`fallbackReason`、`confidence`、`issues` 写入 `exam_questions`。
7. 不把临时模型 Key 写入任何表。
8. 不把上传文件全文写入任何表。
9. 不把 LLM 原始响应全文写入任何表。
10. 解析接口不得调用 `INSERT`、`UPDATE`、`DELETE`。
11. `questions/confirm` 必须校验权限和 `examId` 一致性。
12. `questions/confirm` 必须剥离前端 UI 字段后再写 `ai_corrections`。

允许修改的数据库相关代码范围：

| 文件 | 允许修改内容 |
| --- | --- |
| `backend/handlers/ai.go` | 题目确认导入校验、字段归一化、写入逻辑 |
| `backend/handlers/outline.go` | 只读解析，不新增写库 |
| `backend/database/db.go` | 仅在既有初始化缺失时修复，不新增 LLM 表 |
| `backend/database/schema.sql` | 本轮原则上不修改 |

## 16. 数据库测试设计

### 16.1 禁止写库测试

课程大纲解析：

1. 调用 `parse-outline` 前查询 `course_chapters` 数量。
2. 调用接口。
3. 再次查询 `course_chapters` 数量。
4. 数量必须不变。
5. 同理检查 `course_sections` 数量不变。

试题解析：

1. 调用 `parse-questions` 前查询 `exam_questions` 数量。
2. 调用接口。
3. 再次查询 `exam_questions` 数量。
4. 数量必须不变。
5. 同理检查 `ai_corrections` 数量不变。

### 16.2 确认导入写库测试

用例：

1. 创建或选择一个教师本人课程下的考试。
2. 调用 `questions/confirm` 导入 3 道合法题。
3. 查询 `exam_questions`，应新增 3 条。
4. 查询 `ai_corrections`，应新增修订记录。
5. 检查 `options` 是可解析 JSON 数组字符串。
6. 检查 `answer` 已按题型归一化。
7. 检查没有 `_selected`、`confidence`、`issues` 等字段进入 JSON。

### 16.3 权限测试

| 用例 | 预期 |
| --- | --- |
| 学生调用 `parse-outline` | 403，数据库不变 |
| 学生调用 `parse-questions` | 403，数据库不变 |
| 学生调用 `questions/confirm` | 403，数据库不变 |
| 教师调用他人课程 `parse-outline` | 403，数据库不变 |
| 教师调用他人考试 `parse-questions` | 403，数据库不变 |
| 教师向他人考试 `questions/confirm` | 403，数据库不变 |

### 16.4 部分成功测试

输入：

1. 第 1 题合法。
2. 第 2 题题干为空。
3. 第 3 题合法。

预期：

1. `questions/confirm` 返回 200。
2. `inserted=2`。
3. `total=3`。
4. `exam_questions` 新增 2 条。
5. 前端按部分成功提示。

### 16.5 ID 一致性测试

输入：

```json
{
  "examId": 2,
  "originalQuestions": [],
  "confirmedQuestions": []
}
```

请求路径：

```http
POST /api/v1/exams/1/questions/confirm
```

预期：

1. 返回 400。
2. `exam_questions` 不新增。
3. `ai_corrections` 不新增。

## 17. 数据库验收清单

提交前逐项确认：

1. 本轮未新增表。
2. 本轮未新增字段。
3. 本轮未新增索引。
4. 本轮未新增软删除字段。
5. 本轮未新增 `version` 字段。
6. `parse-outline` 不写 `course_chapters`。
7. `parse-outline` 不写 `course_sections`。
8. `parse-questions` 不写 `exam_questions`。
9. `parse-questions` 不写 `ai_corrections`。
10. `questions/confirm` 写入 `exam_questions`。
11. `questions/confirm` 复用 `ai_corrections` 记录修订差异。
12. `exam_questions.options` 可解析为 JSON 数组。
13. `exam_questions.answer` 按题型归一化。
14. `confidence` 未写入 `exam_questions`。
15. `issues` 未写入 `exam_questions`。
16. `parseMode` 未写入任何业务表。
17. `fallbackReason` 未写入任何业务表。
18. 临时模型 Key 未写入任何表。
19. 上传文件全文未写入任何表。
20. LLM 原始响应全文未写入任何表。
21. 前端 `_` 开头 UI 字段未进入数据库。
22. 教师归属校验使用 `courses.instructor_id`。
23. 考试归属校验使用 `exams.course_id -> courses.instructor_id`。
24. `questions/confirm` 校验路径 `:id` 与请求体 `examId`。
25. 部分成功时返回 `inserted/total`，不误报完全成功。

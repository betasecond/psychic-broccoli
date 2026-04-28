# CourseArk LLM API 与数据库设计基线冻结文档

## 0. 文档定位

本文档在 `01-需求分析.md`、`02-LLM功能详细设计.md`、`03-LLM前端设计文档.md` 之后冻结 LLM 能力相关的 API 与数据库底层设计规则。

后续由人或 AI 编写实现文档、接口文档、数据库变更文档、测试文档时，必须优先遵守本文档中关于 API 路径、请求/响应字段、错误码、鉴权方式和数据库写入边界的规则。若后续文档在这些基线问题上与本文档冲突，以本文档为准；需求目标、功能范围和非目标仍以 `01-需求分析.md` 为准。确需变更 API 或数据库基线时，必须先更新本文档并说明变更原因、影响范围和迁移策略。

本文档的目标不是一次性设计完所有模块 API 和数据库，而是统一底层设计路径，避免后续各模块各自发散。

## 1. 适用范围

本文档适用于本轮 LLM 能力补充涉及的三类接口与相关数据库写入路径：

1. 课程大纲 LLM 解析：`POST /api/v1/courses/:id/parse-outline`
2. 试题 LLM 解析/生成：`POST /api/v1/exams/:id/parse-questions`
3. 试题确认导入：`POST /api/v1/exams/:id/questions/confirm`

本文档也约束后续新增 LLM 辅助能力时的通用 API 和数据库设计。

本文档不重写既有 RAG 问答模块，不新增 LLM 调用记录表，不强制引入 JSON Schema 校验库，不承诺完整自动个性化学习闭环。

## 2. 术语与强制等级

| 术语 | 含义 |
| --- | --- |
| MUST | 必须遵守，后续实现不得违反 |
| SHOULD | 应遵守，除非有明确兼容性理由 |
| MAY | 可以采用，不作为验收硬性条件 |
| 解析接口 | 只读取上传内容并返回结构化结果的接口 |
| 确认导入接口 | 在教师或管理员确认后真正写入业务表的接口 |
| 临时模型 Key | 用户通过请求头传入、仅用于本次模型调用的 Key |
| 规则回退 | LLM 不可用或输出无效时，回到已有规则解析逻辑 |

## 3. 全局 API 基线

### 3.1 路由命名

1. 后端对外 API MUST 使用 `/api/v1` 前缀。
2. 资源名 MUST 使用复数名词，例如 `courses`、`exams`、`questions`。
3. 路径参数 MUST 使用资源 ID，例如 `:id`。
4. 行为型接口 MAY 使用动词短语作为资源子动作，例如 `parse-outline`、`parse-questions`、`questions/confirm`。
5. LLM 能力不得为了“AI”单独创建平行资源路径，例如不得新增 `/api/v1/ai/courses/:id/outline` 来替代既有课程上下文路径。

冻结路由如下：

| 能力 | 方法 | 路径 | 写库 |
| --- | --- | --- | --- |
| 课程大纲解析 | `POST` | `/api/v1/courses/:id/parse-outline` | 否 |
| 试题解析/生成 | `POST` | `/api/v1/exams/:id/parse-questions` | 否 |
| 试题确认导入 | `POST` | `/api/v1/exams/:id/questions/confirm` | 是 |

### 3.2 请求格式

解析接口 MUST 使用 `multipart/form-data`，字段名固定为 `file`。

| 接口 | 允许后缀 | 大小上限 |
| --- | --- | --- |
| `parse-outline` | `.txt`、`.md` | 2MB |
| `parse-questions` | `.txt`、`.md`、`.csv` | 2MB |

前端 MAY 预校验文件后缀和大小，但后端 MUST 作为最终校验点。文件类型判断 SHOULD 基于文件名后缀，不应依赖浏览器传入的 MIME。

确认导入接口 MUST 使用 `application/json`。

### 3.3 请求头

所有需要登录的接口 MUST 携带：

```http
Authorization: Bearer <token>
```

LLM 解析接口 MAY 携带：

```http
X-RAG-API-Key: <optional>
X-RAG-Provider: dashscope | openrouter
```

冻结规则：

1. `X-RAG-API-Key` 表示本次模型调用的临时 Key，不是 RAG 专属 Key。
2. `X-RAG-Provider` 表示模型供应商。
3. 临时 Key 优先于服务端环境变量。
4. 服务端环境变量作为兜底配置，包含 `OPENAI_API_KEY`、`DASHSCOPE_API_KEY`、`OPENAI_BASE_URL`、`LLM_MODEL`。
5. 未提供任何 Key 时，解析接口 MUST 走规则回退，不得直接返回 500。
6. 临时 Key MUST NOT 持久化到数据库。
7. 日志 MUST NOT 打印完整 Key。

### 3.4 响应包络

HTTP 层 MUST 沿用当前后端 `utils.Success()` 响应包络：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

前端 `api.ts` 拦截器会自动拆出 `data`，因此前端 service 层和本文后续业务响应示例均以“解包后的业务对象”为准。后续文档不得误写成后端 HTTP 直接裸返回业务对象。

解析接口响应 MUST 包含 `parseMode`。

`parseMode` 冻结枚举：

| 值 | 含义 |
| --- | --- |
| `llm` | LLM 解析成功并通过后端校验 |
| `rule_fallback` | LLM 未调用、调用失败、输出无效或字段校验失败后，规则解析成功 |

`fallbackReason` MAY 返回，建议仅在 `parseMode=rule_fallback` 时返回。若返回，MUST 是短字符串，不得包含 API Key、上传原文或模型完整响应。

### 3.5 分页规范

本轮三个冻结接口不涉及分页。

后续列表接口 MUST 使用如下查询参数：

| 参数 | 规则 |
| --- | --- |
| `page` | 从 1 开始，缺省为 1 |
| `pageSize` | 缺省 10 或沿用页面既有值，最大值不得超过 100 |

分页响应 SHOULD 包含：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

若既有接口已使用其他字段名，后续修改 MUST 优先兼容旧字段。

### 3.6 错误码规则

HTTP 状态码冻结如下：

| 状态码 | 场景 |
| --- | --- |
| `400` | 参数错误、文件类型错误、文件过大、解析结果为空、路径 `:id` 与请求体 `examId` 不一致 |
| `401` | 未登录或 Token 无效 |
| `403` | 当前用户无权操作该课程或考试 |
| `404` | 课程或考试不存在 |
| `500` | 非预期服务端错误 |

LLM 调用失败、Key 缺失、模型超时、模型返回非法 JSON，MUST NOT 直接映射为 500；只要规则解析成功，就返回 200 且 `parseMode=rule_fallback`。

错误响应 SHOULD 包含可读 `message`。后续若新增机器可读错误码，字段名 SHOULD 为 `code`，取值使用小写下划线，例如 `file_too_large`、`permission_denied`。

### 3.7 鉴权与归属校验

所有冻结接口 MUST 校验登录态。

课程大纲解析：

1. 学生 MUST 返回 403。
2. 教师只能解析自己创建或归属自己的课程。
3. 管理员可以解析全部课程。
4. 课程不存在返回 404 或项目既有 NotFound 语义。

试题解析/生成：

1. 学生 MUST 返回 403。
2. 教师只能解析自己课程下的考试。
3. 管理员可以解析全部考试。
4. 考试不存在返回 404。
5. 归属链路 MUST 使用 `exams.id -> exams.course_id -> courses.instructor_id`。

试题确认导入：

1. 教师导入题目仍需校验考试归属。
2. 后端 MUST NOT 只信任请求体 `examId`。
3. 路径参数 `:id` MUST 与请求体 `examId` 一致。
4. `:id` 与 `examId` 不一致时 MUST 返回 400。

### 3.8 审计与日志

本轮不新增持久化 LLM 调用记录表。

服务端日志 SHOULD 记录：

1. 解析接口名称。
2. 当前用户 ID。
3. 课程 ID 或考试 ID。
4. LLM 是否调用成功。
5. 是否发生规则回退。
6. `fallbackReason`。
7. 解析出的章节数、课时数或题目数。
8. 耗时摘要。

服务端日志 MUST NOT 记录：

1. 完整 API Key。
2. 上传文件完整原文。
3. 模型完整响应正文。
4. 学生答题隐私之外的不必要敏感信息。

业务审计写库只保留既有 `ai_corrections` 用途：试题确认导入时记录教师修订差异。`parse-outline` 与 `parse-questions` 不得因为审计而新增写库行为。

### 3.9 LLM 调用边界

1. LLM 输出 MUST 被视为不可信输入。
2. 后端 MUST 对 LLM 输出做 JSON 提取、反序列化、字段校验和归一化。
3. LLM 不得直接决定数据库写入。
4. LLM 不得被提示或允许生成 SQL。
5. LLM 调用 SHOULD 设置明确 HTTP 超时，建议 10 到 15 秒。
6. 超时 MUST 触发规则回退。
7. Prompt MUST 要求只输出 JSON，不输出 Markdown 或解释文本。

## 4. LLM API 冻结契约

### 4.1 课程大纲解析

接口：

```http
POST /api/v1/courses/:id/parse-outline
Content-Type: multipart/form-data
Authorization: Bearer <token>
X-RAG-API-Key: <optional>
X-RAG-Provider: dashscope | openrouter
```

请求：

| 字段 | 规则 |
| --- | --- |
| `file` | 必填 |
| 后缀 | `.txt`、`.md` |
| 大小 | 不超过 2MB |

响应：

```json
{
  "chapters": [
    {
      "title": "第一章 Go 语言基础",
      "orderIndex": 1,
      "sections": [
        {
          "title": "变量与类型",
          "orderIndex": 1,
          "type": "VIDEO"
        }
      ]
    }
  ],
  "chapterCount": 1,
  "sectionCount": 1,
  "parseMode": "llm"
}
```

字段冻结：

1. `chapters` MUST 是数组。
2. `chapterCount` MUST 等于 `chapters.length`。
3. `sectionCount` MUST 等于所有 `chapters[*].sections.length` 之和。
4. `parseMode` MUST 是 `llm` 或 `rule_fallback`。
5. `fallbackReason` MAY 省略。
6. `sections` 为空时 MUST 返回 `[]`，不应返回 `null`。
7. 后端 SHOULD 重排 `orderIndex`，从 1 开始连续编号。
8. 课时 `type` 在本轮解析结果中 MUST 归一化为 `VIDEO` 或 `TEXT`。

写库冻结：

1. `parse-outline` MUST NOT 写入 `course_chapters`。
2. `parse-outline` MUST NOT 写入 `course_sections`。
3. 教师确认后，前端继续复用既有章节创建接口和课时创建接口完成导入。

### 4.2 试题解析/生成

接口：

```http
POST /api/v1/exams/:id/parse-questions
Content-Type: multipart/form-data
Authorization: Bearer <token>
X-RAG-API-Key: <optional>
X-RAG-Provider: dashscope | openrouter
```

请求：

| 字段 | 规则 |
| --- | --- |
| `file` | 必填 |
| 后缀 | `.txt`、`.md`、`.csv` |
| 大小 | 不超过 2MB |

响应：

```json
{
  "questions": [
    {
      "type": "SINGLE_CHOICE",
      "stem": "Go 语言中用于启动协程的关键字是？",
      "options": ["go", "func", "defer", "chan"],
      "answer": "A",
      "score": 3,
      "confidence": 0.92,
      "issues": []
    }
  ],
  "count": 1,
  "parseMode": "llm"
}
```

字段冻结：

1. `questions` MUST 是数组。
2. `count` MUST 等于 `questions.length`。
3. `parseMode` MUST 是 `llm` 或 `rule_fallback`。
4. `fallbackReason` MAY 省略。
5. `questions[*].type` MUST 是 `SINGLE_CHOICE`、`MULTIPLE_CHOICE`、`TRUE_FALSE`、`SHORT_ANSWER` 之一。
6. `questions[*].stem` MUST 非空。
7. `questions[*].score` MUST 大于 0。
8. `questions[*].confidence` MUST 位于 `0.0 <= confidence <= 1.0`。
9. `questions[*].issues` MUST 存在；无问题时 MUST 是 `[]`，不得是 `null`。
10. 严重不合法题目 MUST 被过滤，不返回给前端。
11. 轻微问题题目 MAY 返回，但 MUST 在 `issues` 中说明。

题型字段规则：

| 题型 | `options` | `answer` |
| --- | --- | --- |
| `SINGLE_CHOICE` | 至少 2 项 | 单个选项字母，例如 `A` |
| `MULTIPLE_CHOICE` | 至少 2 项 | 多个选项字母，逗号分隔，例如 `A,C` |
| `TRUE_FALSE` | 可为空 | `true` 或 `false` |
| `SHORT_ANSWER` | 可为空 | 参考答案文本，非空 |

写库冻结：

1. `parse-questions` MUST NOT 写入 `exam_questions`。
2. `parse-questions` MUST NOT 写入 `ai_corrections`。
3. 教师确认导入前，解析结果只存在于响应和前端临时状态。

### 4.3 试题确认导入

接口：

```http
POST /api/v1/exams/:id/questions/confirm
Content-Type: application/json
Authorization: Bearer <token>
```

请求体：

```json
{
  "examId": 1,
  "originalQuestions": [],
  "confirmedQuestions": []
}
```

HTTP 层通过 `utils.Success()` 包裹返回；前端 service 层解包后的业务对象 SHOULD 为：

```json
{
  "inserted": 3,
  "total": 3
}
```

冻结规则：

1. 只有该接口可以将 LLM 或规则解析得到的批量题目写入 `exam_questions`。
2. `examId` MUST 与路径 `:id` 一致。
3. `originalQuestions` MUST 是解析完成瞬间保存的原始题目快照。
4. `confirmedQuestions` MUST 是教师选择并修订后的题目。
5. 前端所有 `_` 开头 UI 字段 MUST NOT 进入 payload。
6. 后端 MUST 再次校验题型、题干、选项、答案和分值。
7. 写入成功后 SHOULD 沿用现有行为写入 `ai_corrections` 记录修订差异；该审计写入失败时不阻断题目导入主流程。
8. 当前确认导入实现按题逐条插入，单题失败时跳过并返回 `inserted/total`；后续不得在未说明迁移影响的情况下改成“失败即全部回滚”的事务语义。
9. 教师手动新增、编辑、删除题目仍沿用既有 `AddQuestion`、`UpdateQuestion`、`DeleteQuestion` 相关接口；本规则只约束 AI/规则解析结果的批量导入。
10. 当 `inserted < total` 时，前端 MUST 按“部分成功”处理，提示成功数量与失败数量，不得提示为完全成功。

## 5. 回退原因冻结

内部 `fallbackReason` 枚举冻结如下：

| 值 | 含义 |
| --- | --- |
| `missing_key` | 未配置模型 Key |
| `request_failed` | HTTP 请求失败 |
| `timeout` | LLM 调用超时 |
| `bad_status` | LLM 返回错误状态码 |
| `empty_response` | LLM 返回空内容 |
| `json_not_found` | 无法从模型输出中提取 JSON |
| `json_unmarshal_failed` | JSON 反序列化失败 |
| `validation_failed` | 字段校验后无有效数据 |
| `rule_parse_failed` | 规则解析也失败 |

冻结规则：

1. `fallbackReason` MAY 返回给前端。
2. `fallbackReason` MUST NOT 包含 API Key。
3. `fallbackReason` MUST NOT 包含上传原文。
4. `fallbackReason` MUST NOT 包含模型完整响应。
5. 日志 MAY 记录该枚举与短错误摘要。

## 6. 全局数据库基线

### 6.0 当前数据库事实

本文档必须契合当前 SQLite 数据库结构。后续文档和代码不得为了 LLM 能力随意改动以下核心表。

`courses` 当前字段：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `title` | `TEXT NOT NULL` |
| `description` | `TEXT NOT NULL` |
| `cover_image_url` | `TEXT` |
| `instructor_id` | `INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT` |
| `category_id` | `INTEGER REFERENCES course_categories(id) ON DELETE SET NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))` |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |

`course_chapters` 当前字段：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `course_id` | `INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE` |
| `title` | `TEXT NOT NULL` |
| `order_index` | `INTEGER NOT NULL DEFAULT 0` |

`course_sections` 当前字段：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `chapter_id` | `INTEGER NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE` |
| `title` | `TEXT NOT NULL` |
| `order_index` | `INTEGER NOT NULL DEFAULT 0` |
| `type` | `TEXT NOT NULL CHECK(type IN ('VIDEO', 'TEXT', 'LIVE', 'ASSIGNMENT', 'EXAM'))` |
| `video_url` | `TEXT` |
| `content` | `TEXT` |
| `resource_id` | `INTEGER` |

说明：LLM 大纲解析本轮只产出 `VIDEO` 或 `TEXT`，但数据库现有 `course_sections.type` 允许 `LIVE`、`ASSIGNMENT`、`EXAM`，后续不得把数据库枚举收窄为仅 `VIDEO`/`TEXT`。

`exams` 当前字段：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `course_id` | `INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE` |
| `title` | `TEXT NOT NULL` |
| `start_time` | `DATETIME NOT NULL` |
| `end_time` | `DATETIME NOT NULL` |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |

`exam_questions` 当前字段：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `exam_id` | `INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE` |
| `type` | `TEXT NOT NULL CHECK(type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'))` |
| `stem` | `TEXT NOT NULL` |
| `options` | `TEXT`，当前用于保存 JSON 格式选项 |
| `answer` | `TEXT NOT NULL`，当前用于保存 JSON 格式答案或兼容答案字符串 |
| `score` | `REAL NOT NULL` |
| `order_index` | `INTEGER NOT NULL DEFAULT 0` |

`ai_corrections` 当前字段：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `exam_id` | `INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE` |
| `user_id` | `INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE` |
| `original_json` | `TEXT NOT NULL` |
| `corrected_json` | `TEXT NOT NULL` |
| `diff_summary` | `TEXT NOT NULL DEFAULT ''` |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |

当前数据库事实带来的冻结结论：

1. 本轮不新增任何 LLM 专用表。
2. 本轮不修改 `course_chapters`、`course_sections`、`exam_questions` 的列结构。
3. 本轮不为 `exam_questions` 新增 `confidence`、`issues`、`parse_mode`、`fallback_reason` 字段；这些字段只存在于解析响应和前端临时状态。
4. 本轮不为 `course_chapters`、`course_sections`、`exam_questions` 补 `created_at`、`updated_at`、`deleted_at` 或 `version`。
5. 题目确认导入必须写入现有 `exam_questions` 字段集合，不得要求数据库保存前端展示字段。
6. 题目确认导入的修订审计必须复用现有 `ai_corrections` 表，不得另建 `llm_logs`、`question_parse_records` 等临时表。

### 6.1 命名规范

1. 表名 MUST 使用小写下划线复数名词，例如 `course_chapters`、`exam_questions`。
2. 主键字段 MUST 命名为 `id`。
3. 外键字段 MUST 使用 `<resource>_id`，例如 `course_id`、`exam_id`、`chapter_id`、`user_id`。
4. 排序字段 MUST 使用 `order_index`。
5. 时间字段 MUST 使用 snake_case，例如 `created_at`、`updated_at`、`submitted_at`。
6. Go/JSON 层对外字段继续使用 camelCase，例如 `orderIndex`、`createdAt`。

### 6.2 主键策略

1. 当前 SQLite 表 MUST 继续使用 `INTEGER PRIMARY KEY AUTOINCREMENT`。
2. 后续新增表如无强理由，也 MUST 使用同一主键策略。
3. 业务写入不得依赖前端传入主键。
4. 批量导入时后端 MUST 以数据库生成 ID 为准。

### 6.3 外键与删除策略

现有关键外键策略冻结如下：

| 表 | 外键 | 删除策略 |
| --- | --- | --- |
| `course_chapters` | `course_id -> courses.id` | `ON DELETE CASCADE` |
| `course_sections` | `chapter_id -> course_chapters.id` | `ON DELETE CASCADE` |
| `exams` | `course_id -> courses.id` | `ON DELETE CASCADE` |
| `exam_questions` | `exam_id -> exams.id` | `ON DELETE CASCADE` |
| `ai_corrections` | `exam_id -> exams.id` | `ON DELETE CASCADE` |
| `ai_corrections` | `user_id -> users.id` | `ON DELETE CASCADE` |

后续新增与课程、考试、题目强归属的数据 SHOULD 明确外键和删除策略，不得只存孤立 ID。

### 6.4 状态字段

状态字段 MUST 使用受限枚举，优先通过 `CHECK` 或后端常量双重约束。

现有状态枚举：

| 表 | 字段 | 枚举 |
| --- | --- | --- |
| `courses` | `status` | `DRAFT`、`PUBLISHED`、`ARCHIVED` |
| `messages` | `status` | `read`、`unread` |
| `discussions` | `status` | `active`、`closed` |

本轮 LLM 解析结果不新增数据库状态字段。解析状态只通过接口响应 `parseMode` 和可选 `fallbackReason` 表达。

### 6.5 审计字段

后续新增持久化业务表 SHOULD 至少包含：

| 字段 | 规则 |
| --- | --- |
| `created_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | 数据会被更新时必须提供 |
| `created_by` 或 `user_id` | 有明确操作者时必须提供 |

现有 `course_chapters`、`course_sections`、`exam_questions` 不包含 `created_at` 和 `updated_at`，本轮不得为了 LLM 能力强行迁移这些表。若后续需要补审计字段，必须单独编写迁移文档并验证兼容性。

`ai_corrections` 已包含 `created_at`，用于记录题目确认导入时的修订差异。

### 6.6 软删除规则

当前核心教学表未统一采用 `deleted_at` 软删除。

冻结规则：

1. 本轮 LLM API 和数据库设计 MUST NOT 新增软删除字段。
2. 不得在单个 LLM 相关表中局部引入 `deleted_at`，以免查询口径不一致。
3. 后续若要引入软删除，必须作为全局数据库策略变更，至少覆盖查询过滤、唯一约束、索引、恢复策略和物理清理策略。
4. 当前删除语义继续遵守既有外键级联和业务删除接口。

### 6.7 索引原则

现有关键索引：

| 索引 | 字段 |
| --- | --- |
| `idx_chapters_course_id` | `course_chapters(course_id)` |
| `idx_sections_chapter_id` | `course_sections(chapter_id)` |
| `idx_exams_course_id` | `exams(course_id)` |
| `idx_questions_exam_id` | `exam_questions(exam_id)` |
| `idx_ai_corrections_user_id` | `ai_corrections(user_id)` |
| `idx_ai_corrections_exam_id` | `ai_corrections(exam_id)` |

后续新增索引 MUST 服务明确查询路径。优先为外键、归属校验字段、列表筛选字段建立索引。不得为了“可能会查”随意增加宽索引。

本轮不需要新增索引。

### 6.8 版本号与并发控制

当前核心表未统一提供 `version` 字段。

冻结规则：

1. 本轮 LLM 能力 MUST NOT 为 `course_chapters`、`course_sections`、`exam_questions` 新增 `version` 字段。
2. 解析接口是只读结构化接口，不涉及并发写冲突。
3. 课程大纲导入通过前端逐个调用既有章节/课时创建接口完成；部分失败不回滚已创建数据。
4. 试题确认导入沿用现有单请求、逐题插入、返回 `inserted/total` 的兼容语义；单题插入失败不应导致已成功题目被回滚，除非后续先解冻并补充事务迁移方案。
5. 若后续需要乐观锁，字段名 SHOULD 为 `version`，类型 SHOULD 为整数，更新时必须带旧版本断言。

### 6.9 JSON 字段

现有 `exam_questions.options` 与 `exam_questions.answer` 为 TEXT，用于存放 JSON 格式字符串或答案字符串。

冻结规则：

1. 写入 `exam_questions.options` 前，后端 MUST 将选项归一化为可解析 JSON 数组字符串，或沿用现有处理方式并确保读取端兼容。
2. 写入 `exam_questions.answer` 前，后端 MUST 按题型归一化答案。
3. `ai_corrections.original_json` 与 `ai_corrections.corrected_json` MUST 存放不含前端 UI 字段的业务题目 JSON。
4. `_selected`、`_saved`、`_saving`、`_editing`、`_error` 等 UI 字段 MUST NOT 写入任何数据库 JSON 字段。

## 7. 本轮数据库写入冻结

本轮不新增表。

解析接口数据库写入断言：

| 接口 | 是否允许写库 | 说明 |
| --- | --- | --- |
| `POST /api/v1/courses/:id/parse-outline` | 否 | 只返回章节/课时结构 |
| `POST /api/v1/exams/:id/parse-questions` | 否 | 只返回题目结构 |
| `POST /api/v1/exams/:id/questions/confirm` | 是 | 写入确认后的题目 |

允许写入的表：

| 表 | 场景 |
| --- | --- |
| `course_chapters` | 教师确认大纲后，通过既有章节创建接口写入 |
| `course_sections` | 教师确认大纲后，通过既有课时创建接口写入 |
| `exam_questions` | 教师确认题目后，通过确认导入接口写入 |
| `ai_corrections` | 题目确认导入时记录修订差异 |

禁止行为：

1. 解析接口不得直接写入业务表。
2. 解析接口不得新增临时解析结果表。
3. 解析接口不得持久化临时模型 Key。
4. 解析接口不得持久化上传原文全文。
5. LLM 原始响应不得直接入库。

## 8. 前后端契约基线

### 8.1 前端请求约束

1. `courseService.parseOutline()` MUST 向 `/courses/${courseId}/parse-outline` 发送 `multipart/form-data`。
2. `examService.parseQuestionsFromFile()` MUST 向 `/exams/${examId}/parse-questions` 发送 `multipart/form-data`。
3. 两个解析请求 SHOULD 复用 `ragCredentialHeaders()` 或同等逻辑携带临时模型 Key。
4. 无临时 Key 时，前端不得阻止上传解析。
5. `examService.confirmParsedQuestions()` MUST 向 `/exams/${examId}/questions/confirm` 发送 JSON。

### 8.2 前端响应归一化

课程大纲：

1. `sections` 缺失时归一化为 `[]`。
2. 每个章节和课时默认补 `_selected=true`。
3. `chapterCount`、`sectionCount` 不一致时以实际数组展示，并在开发环境记录警告。
4. `parseMode=rule_fallback` 不算失败，仍允许教师编辑和导入。

试题：

1. `questions` 缺失时归一化为 `[]`。
2. 每题默认补 `_selected=true`。
3. `issues` 缺失时归一化为 `[]`。
4. `confidence` 缺失时显示为 `-`，不得伪造高置信度。
5. 解析完成瞬间保存一份不含 UI 字段的 deep copy，作为 `originalQuestions`。
6. 确认导入前必须移除所有 `_` 开头 UI 字段。

## 9. 后续文档编写规则

后续 AI 编写实现文档时 MUST：

1. 先引用本文档作为 API 和数据库基线。
2. 不重复发明新的路径、字段、枚举和写库规则。
3. 对每个接口明确请求、响应、错误码、权限、是否写库。
4. 对每个数据库变更明确表名、主键、外键、状态字段、审计字段、索引、软删除和并发策略。
5. 若不新增数据库结构，必须明确写出“不新增表、不新增索引、不新增软删除、不新增版本字段”。
6. 若提出变更，必须列出与本文档冲突点并标注需要先解冻。

后续 AI 编写代码任务清单时 MUST：

1. 把 `parse-outline` 和 `parse-questions` 视为只读解析接口。
2. 把 `questions/confirm` 视为 AI/规则解析结果批量导入 `exam_questions` 的唯一入口。
3. 保留规则解析兜底。
4. 保留教师确认后入库。
5. 保证无 Key、坏 Key、超时、非法 JSON 不会导致解析接口直接 500。

## 10. 解冻条件

只有满足以下情况之一，才允许修改本文档冻结规则：

1. 现有代码事实与冻结规则冲突，且无法通过兼容方式修复。
2. 后续需求明确要求新增持久化 LLM 调用记录。
3. 后续需求明确要求统一 API 响应包络。
4. 后续需求明确要求引入软删除或乐观锁。
5. 后续需求明确要求把大纲导入改为后端批量确认接口。

解冻变更 MUST 包含：

1. 变更原因。
2. 影响的接口。
3. 影响的表和字段。
4. 前端兼容方案。
5. 数据迁移方案。
6. 测试与回滚方案。

## 11. 最终冻结清单

提交后逐项检查：

1. API 路径是否仍为 `/api/v1/courses/:id/parse-outline`、`/api/v1/exams/:id/parse-questions`、`/api/v1/exams/:id/questions/confirm`。
2. 解析接口是否仍使用 `multipart/form-data` 和 `file` 字段。
3. 解析接口是否均返回 `parseMode`。
4. `parseMode` 是否只使用 `llm`、`rule_fallback`。
5. `fallbackReason` 是否只使用冻结枚举。
6. 无 Key、坏 Key、超时、非法 JSON 是否均可回退。
7. 解析接口是否不写库。
8. 试题是否只在确认导入后写入 `exam_questions`。
9. 临时模型 Key 是否不入库、不完整进日志。
10. 教师是否只能操作自己课程或考试。
11. 学生访问教师解析接口是否返回 403。
12. `:id` 与 `examId` 不一致是否返回 400。
13. 本轮是否未新增表、未新增索引、未新增软删除、未新增版本字段。
14. 题目 `issues` 无问题时是否为 `[]`。
15. 前端 UI 字段是否不会进入确认导入 payload 或数据库。

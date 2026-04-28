# CourseArk LLM API 设计文档

## 0. 文档定位

本文档在以下文档之后编写，用于给后续 AI coding agent、后端开发、前端开发和测试人员承接 LLM 功能实现：

1. `docs/LLM/01-需求分析.md`
2. `docs/LLM/02-LLM功能详细设计.md`
3. `docs/LLM/03-LLM前端设计文档.md`
4. `docs/LLM/04-LLM API与数据库设计基线冻结文档.md`

本文档只展开 API 设计，不重新定义需求范围，不新增数据库表，不改变 `04` 中冻结的 API 路径、响应包络、写库边界和数据库基线。

后续 AI 实现时必须优先遵守：

1. 解析接口只做结构化识别，不直接写库。
2. LLM 输出必须后端校验和归一化。
3. LLM 失败、无 Key、超时、非法 JSON 或校验失败时必须规则回退。
4. 试题只有经过教师确认导入接口后才写入 `exam_questions`。
5. 临时模型 Key 不入库、不完整进日志。

## 1. API 总览

本轮 LLM 功能涉及 3 个冻结接口。

| 模块 | 能力 | 方法 | 路径 | 是否写库 |
| --- | --- | --- | --- | --- |
| 课程大纲 | LLM 课程大纲解析 | `POST` | `/api/v1/courses/:id/parse-outline` | 否 |
| 考试题目 | LLM 试题解析/生成 | `POST` | `/api/v1/exams/:id/parse-questions` | 否 |
| 考试题目 | 解析题目确认导入 | `POST` | `/api/v1/exams/:id/questions/confirm` | 是 |

相关但不属于本轮新增的既有接口：

| 能力 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 创建章节 | `POST` | `/api/v1/courses/:id/chapters` | 大纲解析后由前端逐章调用 |
| 创建课时 | `POST` | `/api/v1/courses/:id/chapters/:cid/sections` | 大纲解析后由前端逐课时调用 |
| 手动新增题目 | `POST` | `/api/v1/exams/:id/questions` | 教师手动新增题目继续使用 |
| RAG 问答 | `POST` | `/api/v1/courses/:id/rag/query` | 保留既有能力，本轮不重写 |

## 2. 全局 API 规则

### 2.1 响应包络

后端 HTTP 响应必须沿用当前项目 `utils.Success()` 和错误响应风格。

HTTP 层成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

本文档后续的响应示例均表示前端 service 解包后的 `data` 业务对象，不表示 HTTP 直接裸返回。

### 2.2 鉴权请求头

所有接口必须携带登录 Token：

```http
Authorization: Bearer <token>
```

LLM 解析接口可携带临时模型 Key：

```http
X-RAG-API-Key: <optional>
X-RAG-Provider: dashscope | openrouter
```

规则：

1. `X-RAG-API-Key` 是历史命名，本轮语义为“本次模型调用临时 Key”。
2. `X-RAG-Provider` 是模型供应商。
3. 请求头 Key 优先于服务端环境变量。
4. 服务端环境变量兜底，包括 `OPENAI_API_KEY`、`DASHSCOPE_API_KEY`、`OPENAI_BASE_URL`、`LLM_MODEL`。
5. 没有任何 Key 时不得返回 500，必须尝试规则解析。
6. 请求头 Key 不得写入数据库。
7. 日志不得打印完整 Key。

### 2.3 文件上传规则

解析接口统一使用：

```http
Content-Type: multipart/form-data
```

字段名固定：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | file | 是 | 待解析的大纲、题目文本或自然语言出题要求 |

限制：

| 接口 | 允许后缀 | 大小上限 |
| --- | --- | --- |
| `parse-outline` | `.txt`、`.md` | 2MB |
| `parse-questions` | `.txt`、`.md`、`.csv` | 2MB |

后端必须做最终校验。后缀比较应忽略大小写，不应依赖浏览器 MIME。

### 2.4 解析模式

所有解析接口成功响应必须包含 `parseMode`。

| 值 | 含义 |
| --- | --- |
| `llm` | LLM 调用成功，输出通过后端校验 |
| `rule_fallback` | LLM 未调用、调用失败、输出无效或校验失败后，规则解析成功 |

可选字段 `fallbackReason` 只建议在 `parseMode=rule_fallback` 时返回。

冻结枚举：

| 值 | 含义 |
| --- | --- |
| `missing_key` | 未配置模型 Key |
| `request_failed` | HTTP 请求失败 |
| `timeout` | LLM 调用超时 |
| `bad_status` | LLM 返回错误状态码 |
| `empty_response` | LLM 返回空内容 |
| `json_not_found` | 无法从模型输出提取 JSON |
| `json_unmarshal_failed` | JSON 反序列化失败 |
| `validation_failed` | 字段校验后无有效数据 |
| `rule_parse_failed` | 规则解析也失败 |

`fallbackReason` 不得包含 API Key、上传原文、模型完整响应或堆栈信息。

### 2.5 错误码

HTTP 状态码规则：

| 状态码 | 场景 |
| --- | --- |
| `400` | 参数错误、缺少文件、文件类型错误、文件过大、空文件、解析结果为空、路径 `:id` 与请求体 `examId` 不一致 |
| `401` | 未登录或 Token 无效 |
| `403` | 角色无权限，或教师访问他人课程/考试 |
| `404` | 课程或考试不存在 |
| `500` | 非预期服务端错误 |

LLM 失败类问题不得直接映射为 500。只要规则解析成功，接口返回 200，`parseMode=rule_fallback`。

错误响应建议：

```json
{
  "code": 400,
  "message": "文件大小不能超过 2MB"
}
```

## 3. 权限设计

### 3.1 角色规则

| 接口 | 学生 | 教师 | 管理员 |
| --- | --- | --- | --- |
| `parse-outline` | 403 | 仅自己课程 | 全部课程 |
| `parse-questions` | 403 | 仅自己课程下考试 | 全部考试 |
| `questions/confirm` | 403 | 仅自己课程下考试 | 全部考试 |

### 3.2 归属校验

课程大纲解析：

```text
courses.id = :id
courses.instructor_id = currentUser.id
```

试题解析和确认导入：

```text
exams.id = :id
exams.course_id = courses.id
courses.instructor_id = currentUser.id
```

要求：

1. 管理员跳过归属限制，但仍需校验资源存在。
2. 教师不得只凭请求体 `examId` 操作考试。
3. `questions/confirm` 的路径 `:id` 与请求体 `examId` 不一致时必须返回 400。

## 4. 接口一：课程大纲解析

### 4.1 基本信息

```http
POST /api/v1/courses/:id/parse-outline
Content-Type: multipart/form-data
Authorization: Bearer <token>
X-RAG-API-Key: <optional>
X-RAG-Provider: dashscope | openrouter
```

接口语义：

1. 读取上传的大纲文本。
2. 优先调用 LLM 解析章节和课时结构。
3. LLM 失败时调用既有规则解析。
4. 返回结构化章节和课时预览。
5. 不创建章节，不创建课时。

### 4.2 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 | 课程 ID |

### 4.3 请求体

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `file` | file | 是 | `.txt` 或 `.md`，不超过 2MB |

### 4.4 成功响应

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
        },
        {
          "title": "控制流程",
          "orderIndex": 2,
          "type": "TEXT"
        }
      ]
    }
  ],
  "chapterCount": 1,
  "sectionCount": 2,
  "parseMode": "llm"
}
```

规则回退响应：

```json
{
  "chapters": [
    {
      "title": "第一章 Go 语言基础",
      "orderIndex": 1,
      "sections": []
    }
  ],
  "chapterCount": 1,
  "sectionCount": 0,
  "parseMode": "rule_fallback",
  "fallbackReason": "missing_key"
}
```

### 4.5 响应字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `chapters` | array | 是 | 章节数组 |
| `chapters[].title` | string | 是 | 章节标题，非空 |
| `chapters[].orderIndex` | integer | 是 | 章节顺序，从 1 开始 |
| `chapters[].sections` | array | 是 | 课时数组，无课时时返回 `[]` |
| `sections[].title` | string | 是 | 课时标题，非空 |
| `sections[].orderIndex` | integer | 是 | 课时顺序，从 1 开始 |
| `sections[].type` | string | 是 | `VIDEO` 或 `TEXT` |
| `chapterCount` | integer | 是 | `chapters.length` |
| `sectionCount` | integer | 是 | 所有课时总数 |
| `parseMode` | string | 是 | `llm` 或 `rule_fallback` |
| `fallbackReason` | string | 否 | 回退原因枚举 |

### 4.6 后端校验与归一化

LLM 输出必须经过以下处理：

1. 从模型输出中提取 JSON 对象。
2. 反序列化为大纲结构。
3. 根对象必须包含 `chapters` 数组。
4. 过滤标题为空的章节。
5. 章节 `orderIndex` 由后端重新连续编号。
6. `sections` 缺失时归一化为 `[]`。
7. 过滤标题为空的课时。
8. 课时 `orderIndex` 由后端重新连续编号。
9. 课时 `type` 只允许 `VIDEO` 或 `TEXT`。
10. 课时 `type` 非法时可按标题关键词修正，无法修正则默认 `VIDEO`。
11. 校验后无有效章节时视为 `validation_failed` 并回退规则解析。

### 4.7 状态变更语义

`parse-outline` 是只读解析接口。

| 数据 | 是否改变 |
| --- | --- |
| `courses` | 否 |
| `course_chapters` | 否 |
| `course_sections` | 否 |
| `ai_corrections` | 否 |

教师确认大纲导入后，由前端继续调用既有章节/课时创建接口。该确认动作不属于本接口。

### 4.8 幂等性

接口本身不写库，因此对同一文件重复调用不会产生重复业务数据。

注意：

1. 由于 LLM 生成存在不确定性，重复调用的解析结果可能略有差异。
2. 前端导入阶段调用创建章节/课时接口不具备天然幂等性，重试时必须避免重复创建已成功章节。

### 4.9 错误场景

| 场景 | HTTP | 处理 |
| --- | --- | --- |
| 未登录 | 401 | 返回认证错误 |
| 学生访问 | 403 | 拒绝 |
| 教师访问他人课程 | 403 | 拒绝 |
| 课程不存在 | 404 | 返回不存在 |
| 缺少文件 | 400 | 提示上传文件 |
| 文件后缀非法 | 400 | 提示仅支持 `.txt`/`.md` |
| 文件超过 2MB | 400 | 提示大小限制 |
| 空文件 | 400 | 提示内容为空 |
| LLM 无 Key | 200 或 400 | 规则解析成功则 200，否则 400 |
| LLM 超时 | 200 或 400 | 规则解析成功则 200，否则 400 |
| LLM 非法 JSON | 200 或 400 | 规则解析成功则 200，否则 400 |
| LLM 与规则均失败 | 400 | 提示检查文件格式或内容 |

## 5. 接口二：试题解析/生成

### 5.1 基本信息

```http
POST /api/v1/exams/:id/parse-questions
Content-Type: multipart/form-data
Authorization: Bearer <token>
X-RAG-API-Key: <optional>
X-RAG-Provider: dashscope | openrouter
```

接口语义：

1. 读取上传的题目文本或自然语言出题要求。
2. 优先调用 LLM 解析已有题目，或按自然语言要求生成结构化题目。
3. LLM 失败时调用既有规则解析。
4. 返回题目预览。
5. 不写入 `exam_questions`。
6. 不写入 `ai_corrections`。

### 5.2 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 | 考试 ID |

### 5.3 请求体

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `file` | file | 是 | `.txt`、`.md` 或 `.csv`，不超过 2MB |

文件内容支持两类：

1. 已有题目文本：系统抽取为结构化题目。
2. 自然语言要求：系统生成结构化题目。例如“请生成 3 道 Go 并发单选题，每题 3 分”。

### 5.4 成功响应

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
    },
    {
      "type": "TRUE_FALSE",
      "stem": "Go 语言中的 goroutine 必须手动创建系统线程。",
      "options": [],
      "answer": "false",
      "score": 2,
      "confidence": 0.88,
      "issues": []
    }
  ],
  "count": 2,
  "parseMode": "llm"
}
```

规则回退响应：

```json
{
  "questions": [
    {
      "type": "SINGLE_CHOICE",
      "stem": "Go 中用于延迟执行函数的关键字是？",
      "options": ["defer", "go", "chan", "select"],
      "answer": "A",
      "score": 3,
      "confidence": 0.6,
      "issues": []
    }
  ],
  "count": 1,
  "parseMode": "rule_fallback",
  "fallbackReason": "missing_key"
}
```

### 5.5 响应字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `questions` | array | 是 | 结构化题目数组 |
| `questions[].type` | string | 是 | 题型枚举 |
| `questions[].stem` | string | 是 | 题干，非空 |
| `questions[].options` | array | 是 | 选项数组，无选项时返回 `[]` |
| `questions[].answer` | string | 是 | 归一化答案 |
| `questions[].score` | number | 是 | 分值，大于 0 |
| `questions[].confidence` | number | 是 | 置信度，范围 0 到 1 |
| `questions[].issues` | array | 是 | 解析提示，无问题时为 `[]` |
| `count` | integer | 是 | `questions.length` |
| `parseMode` | string | 是 | `llm` 或 `rule_fallback` |
| `fallbackReason` | string | 否 | 回退原因枚举 |

### 5.6 题型字段规则

| 题型 | `options` | `answer` | 严重非法条件 |
| --- | --- | --- | --- |
| `SINGLE_CHOICE` | 至少 2 项 | 单个字母，如 `A` | 无选项、选项少于 2、答案非法 |
| `MULTIPLE_CHOICE` | 至少 2 项 | 多个字母逗号分隔，如 `A,C` | 无选项、选项少于 2、答案非法 |
| `TRUE_FALSE` | `[]` | `true` 或 `false` | 答案无法归一化 |
| `SHORT_ANSWER` | `[]` | 参考答案文本 | 答案为空 |

通用严重非法：

1. 题干为空。
2. 题型不在枚举内且无法修正。
3. 选择题无选项或选项少于 2。
4. 判断题答案无法归一化。
5. 简答题答案为空。

通用轻微问题：

1. 分值为非数字、缺失或小于等于 0，后端使用默认分值补齐。
2. 题型大小写不规范但可修正。
3. 多选答案 `AC` 被归一化为 `A,C`。
4. 单选答案带括号或中文说明但可提取。

轻微问题必须写入 `issues`，严重非法题目必须过滤。

### 5.7 后端校验与归一化

LLM 输出处理流程：

```text
模型输出
→ 提取 JSON
→ 反序列化 questions
→ 逐题校验
→ 修正可修正字段
→ 过滤严重非法题
→ 重新计算 count
→ 返回预览
```

字段处理要求：

1. `questions` 缺失或为空时触发 `validation_failed`。
2. `type` 必须归一化为四种枚举之一。
3. `stem` 去除首尾空白后不能为空。
4. `options` 缺失时归一化为 `[]`。
5. 选择题选项正文不得带 `A.`、`B.` 前缀；如模型返回前缀，后端应尽量清理。
6. 单选答案归一化为一个合法选项字母。
7. 多选答案归一化为按字母升序、逗号分隔的格式。
8. 判断题答案归一化为 `true` 或 `false`。
9. 简答题答案保留参考答案文本，去除首尾空白。
10. `score` 非数字、缺失或小于等于 0 时使用默认分值并写入 issue；本轮不因为分值异常直接过滤题目。
11. `confidence` 缺失时必须给出确定默认值：LLM 解析结果默认 `0.8`，规则解析结果沿用或补齐 `calcConfidence()` 的结果；最终值必须落在 0 到 1。
12. `issues` 缺失时初始化为 `[]`，不得返回 `null`。

### 5.8 状态变更语义

`parse-questions` 是只读解析接口。

| 数据 | 是否改变 |
| --- | --- |
| `exams` | 否 |
| `exam_questions` | 否 |
| `ai_corrections` | 否 |

LLM 或规则解析结果只存在于响应和前端临时状态。教师确认导入前，题库不应发生变化。

### 5.9 幂等性

接口本身不写库，因此重复调用不会重复插入题目。

注意：

1. LLM 生成题目存在不确定性，同一自然语言要求重复解析可能产生不同题目。
2. 若需要稳定测试，应该使用 mock LLM 或固定响应。

### 5.10 错误场景

| 场景 | HTTP | 处理 |
| --- | --- | --- |
| 未登录 | 401 | 返回认证错误 |
| 学生访问 | 403 | 拒绝 |
| 教师访问他人课程下考试 | 403 | 拒绝 |
| 考试不存在 | 404 | 返回不存在 |
| 缺少文件 | 400 | 提示上传文件 |
| 文件后缀非法 | 400 | 提示仅支持 `.txt`/`.md`/`.csv` |
| 文件超过 2MB | 400 | 提示大小限制 |
| 空文件 | 400 | 提示内容为空 |
| LLM 无 Key | 200 或 400 | 规则解析成功则 200，否则 400 |
| LLM 超时 | 200 或 400 | 规则解析成功则 200，否则 400 |
| LLM 非法 JSON | 200 或 400 | 规则解析成功则 200，否则 400 |
| 字段校验无有效题 | 200 或 400 | 规则解析成功则 200，否则 400 |
| LLM 与规则均失败 | 400 | 提示检查文件格式或内容 |

## 6. 接口三：试题确认导入

### 6.1 基本信息

```http
POST /api/v1/exams/:id/questions/confirm
Content-Type: application/json
Authorization: Bearer <token>
```

接口语义：

1. 接收解析完成瞬间的原始题目快照。
2. 接收教师选择并修订后的题目。
3. 后端再次校验题目字段。
4. 将有效题目写入 `exam_questions`。
5. 使用 `ai_corrections` 记录修订差异。

### 6.2 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 | 考试 ID |

### 6.3 请求体

```json
{
  "examId": 1,
  "originalQuestions": [
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
  "confirmedQuestions": [
    {
      "type": "SINGLE_CHOICE",
      "stem": "Go 语言中用于启动 goroutine 的关键字是？",
      "options": ["go", "func", "defer", "chan"],
      "answer": "A",
      "score": 3
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `examId` | integer | 是 | 必须与路径 `:id` 一致 |
| `originalQuestions` | array | 是 | 解析完成瞬间的原始业务字段快照 |
| `confirmedQuestions` | array | 是 | 教师确认后的题目 |

前端不得提交 `_selected`、`_saved`、`_saving`、`_editing`、`_error` 等 UI 字段。

### 6.4 成功响应

前端 service 解包后的业务对象：

```json
{
  "inserted": 3,
  "total": 3
}
```

部分成功：

```json
{
  "inserted": 2,
  "total": 3
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `inserted` | integer | 是 | 实际写入 `exam_questions` 的题目数 |
| `total` | integer | 是 | 本次请求待导入题目总数 |

当 `inserted < total` 时，前端必须按部分成功提示，不得提示完全成功。

### 6.5 后端校验

后端必须再次校验 `confirmedQuestions`：

1. `examId` 与路径 `:id` 一致。
2. 当前用户有权操作该考试。
3. `confirmedQuestions` 至少包含 1 道题。
4. 题型合法。
5. 题干非空。
6. 分值大于 0。
7. 选择题至少 2 个选项。
8. 单选答案为一个合法选项字母。
9. 多选答案为一个或多个合法选项字母。
10. 判断题答案为 `true` 或 `false`。
11. 简答题参考答案非空。

校验失败题目可以跳过并计入未插入数量。若整个请求没有任何可插入题目，应返回 400。

### 6.6 写入语义

允许写入：

| 表 | 写入内容 |
| --- | --- |
| `exam_questions` | 教师确认后的题目 |
| `ai_corrections` | 原始解析快照、修订后快照、差异摘要 |

禁止写入：

1. 临时模型 Key。
2. 上传文件全文。
3. LLM 原始响应全文。
4. 前端 `_` 开头 UI 字段。
5. `confidence`、`issues`、`parseMode`、`fallbackReason` 到 `exam_questions` 字段。

### 6.7 幂等性

`questions/confirm` 是写接口，不保证幂等。

同一批题目重复提交会重复插入题目。前端必须通过 loading、禁用按钮和成功后关闭弹窗来避免重复提交。

### 6.8 错误场景

| 场景 | HTTP | 处理 |
| --- | --- | --- |
| 未登录 | 401 | 返回认证错误 |
| 学生访问 | 403 | 拒绝 |
| 教师访问他人考试 | 403 | 拒绝 |
| 考试不存在 | 404 | 返回不存在 |
| `examId` 与路径不一致 | 400 | 拒绝 |
| `confirmedQuestions` 为空 | 400 | 拒绝 |
| 所有题目均非法 | 400 | 拒绝 |
| 单题插入失败 | 200 | 跳过该题，返回 `inserted/total` |
| `ai_corrections` 写入失败 | 200 | 不阻断题目导入，记录短日志 |

## 7. LLM 调用 API 内部设计

### 7.1 调用方式

后端复用现有 OpenAI 兼容调用封装。

内部流程：

```text
handler
→ completeWithConfiguredLLM(c, systemPrompt, userPrompt)
→ getRAGConfig(c)
→ rag.GenClient.Complete(system, user)
→ 提取 JSON
→ 业务校验
```

约束：

1. LLM HTTP 超时建议 10 到 15 秒。
2. 调用失败只向业务层返回 error，不直接写 HTTP 响应。
3. 业务 handler 决定是否规则回退。
4. 不修改 RAG 问答 prompt、检索流程和响应结构。

### 7.2 大纲 Prompt 契约

必须要求模型：

1. 只输出 JSON。
2. 不输出 Markdown。
3. 根对象为 `{ "chapters": [...] }`。
4. `chapters[].sections` 可为空数组。
5. `type` 只能是 `VIDEO` 或 `TEXT`。
6. `orderIndex` 从 1 开始。

模型返回示例：

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
  ]
}
```

### 7.3 试题 Prompt 契约

必须要求模型：

1. 只输出 JSON。
2. 根对象为 `{ "questions": [...] }`。
3. 支持解析已有题目和根据自然语言要求生成题目。
4. 题型只使用固定枚举。
5. 选项只放正文，不带 `A.`。
6. 单选答案格式为 `A`。
7. 多选答案格式为 `A,C`。
8. 判断答案格式为 `true` 或 `false`。
9. 简答答案为参考答案文本。
10. 每题包含 `score`、`confidence`、`issues`。

模型返回示例：

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
  ]
}
```

## 8. 前端对接契约

### 8.1 `courseService.parseOutline`

调用：

```ts
api.post(`/courses/${courseId}/parse-outline`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    ...ragCredentialHeaders(),
  },
})
```

前端处理：

1. `sections` 缺失时归一化为 `[]`。
2. 每个章节和课时默认 `_selected=true`。
3. 展示 `parseMode`。
4. `parseMode=rule_fallback` 时展示回退提示，但不阻止导入。
5. 导入时继续调用既有章节/课时创建接口。

### 8.2 `examService.parseQuestionsFromFile`

调用：

```ts
api.post(`/exams/${examId}/parse-questions`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    ...ragCredentialHeaders(),
  },
})
```

前端处理：

1. `questions` 缺失时归一化为 `[]`。
2. `issues` 缺失时归一化为 `[]`。
3. 展示 `parseMode`、`confidence`、`issues`。
4. 保存解析完成瞬间的 deep copy 作为 `originalQuestions`。
5. 用户编辑只改前端临时状态，不立即写库。

### 8.3 `examService.confirmParsedQuestions`

调用：

```ts
api.post(`/exams/${examId}/questions/confirm`, {
  examId,
  originalQuestions,
  confirmedQuestions,
})
```

前端处理：

1. 移除所有 `_` 开头 UI 字段。
2. 未选中题目不进入 `confirmedQuestions`。
3. 有 `issues` 的题目导入前二次确认。
4. 成功后刷新考试题目列表。
5. `inserted < total` 时提示部分成功。

## 9. 测试用例设计

### 9.1 课程大纲解析

| 用例 | 输入 | 预期 |
| --- | --- | --- |
| LLM 成功 | 有 Key，结构清晰 `.md` | 200，`parseMode=llm` |
| 无 Key 回退 | 无 Key，规则可识别 `.md` | 200，`parseMode=rule_fallback`，`fallbackReason=missing_key` |
| 非法 JSON 回退 | mock LLM 返回解释文本 | 200，规则成功则 `rule_fallback` |
| 空文件 | 空 `.txt` | 400 |
| 文件过大 | 大于 2MB | 400 |
| 学生访问 | 学生 Token | 403 |
| 他人课程 | 教师访问非本人课程 | 403 |

### 9.2 试题解析

| 用例 | 输入 | 预期 |
| --- | --- | --- |
| LLM 生成 | 有 Key，自然语言要求 `.txt` | 200，`parseMode=llm`，返回题目 |
| LLM 抽取 | 有 Key，已有题目 `.md` | 200，字段合法 |
| 无 Key 回退 | 无 Key，规则题目文本 | 200，`parseMode=rule_fallback` |
| 非法 JSON 回退 | mock LLM 返回非 JSON | 200 或 400，取决于规则解析 |
| 严重非法题过滤 | mock LLM 返回空题干 | 不返回该题 |
| `issues` 初始化 | mock LLM 不返回 issues | 响应为 `[]` |
| 学生访问 | 学生 Token | 403 |
| 他人考试 | 教师访问非本人课程下考试 | 403 |

### 9.3 试题确认导入

| 用例 | 输入 | 预期 |
| --- | --- | --- |
| 全部成功 | 3 道合法题 | 200，`inserted=3,total=3` |
| 部分非法 | 2 道合法，1 道非法 | 200，`inserted=2,total=3` |
| 全部非法 | 全部题干为空 | 400 |
| ID 不一致 | 路径 `1`，body `examId=2` | 400 |
| 学生访问 | 学生 Token | 403 |
| 修订审计 | original 与 confirmed 不一致 | 写入 `ai_corrections` |

## 10. 后续 AI 实现顺序

后续 AI coding agent 承接时按以下顺序：

1. 读取 `01` 到 `06` 六份文档。
2. 确认现有路由是否仍与本文一致。
3. 实现或修正 LLM HTTP 超时。
4. 实现大纲解析 LLM 成功和规则回退。
5. 实现试题解析 LLM 成功和规则回退。
6. 实现试题字段校验、归一化、严重非法过滤和 `issues=[]`。
7. 实现教师考试归属权限校验。
8. 实现 `questions/confirm` 的 `examId` 一致性校验。
9. 前端解析请求复用 `ragCredentialHeaders()`。
10. 前端展示 `parseMode`、`fallbackReason`、`confidence`、`issues`。
11. 前端确认导入调用 `questions/confirm`，不得逐题调用 `addQuestion()`。
12. 运行后端测试和前端构建。

## 11. API 验收清单

提交前逐项确认：

1. `parse-outline` 路径未变。
2. `parse-questions` 路径未变。
3. `questions/confirm` 路径未变。
4. 解析接口均使用 `multipart/form-data` 和 `file` 字段。
5. 解析接口均返回 `parseMode`。
6. `parseMode` 只使用 `llm` 或 `rule_fallback`。
7. 无 Key 不会导致 500。
8. LLM 超时不会导致 500。
9. 非法 JSON 不会导致 500，只要规则解析成功。
10. 解析接口不写库。
11. 题目确认导入才写 `exam_questions`。
12. `questions/confirm` 校验路径 `:id` 与 body `examId`。
13. 教师不能操作他人课程或考试。
14. 学生不能访问教师解析接口。
15. 临时模型 Key 不入库、不完整进日志。
16. `issues` 无问题时返回 `[]`，不是 `null`。
17. 前端 UI 字段不进入确认导入 payload。

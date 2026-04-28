# CourseArk LLM 功能详细设计

## 0. 文档定位

本文档给后续 AI coding agent 使用，用于直接指导实现、补测试和验收。

优先级：

1. 先遵守 `docs/LLM/01-需求分析.md`。
2. 再遵守本文档。
3. 最后结合当前代码真实状态落地实现。

核心目标：

1. 课程大纲解析：LLM 优先，规则回退。
2. 试题解析/生成：LLM 优先，规则回退。
3. RAG 问答：保留既有能力，不重写。
4. 数据写入：LLM 结果必须经教师确认后入库。

## 1. 可修改文件边界

优先修改：

| 文件 | 任务 |
| --- | --- |
| `backend/handlers/outline.go` | 课程大纲 LLM 解析、规则回退、响应字段、日志 |
| `backend/handlers/ai.go` | 试题 LLM 解析/生成、规则回退、字段校验 |
| `backend/handlers/llm_parse.go` | LLM 调用封装、JSON 提取公共函数 |
| `backend/rag/generator.go` | 仅增加 OpenAI 兼容生成客户端的 HTTP 超时控制，不改 RAG prompt、检索和响应结构 |
| `frontend/src/services/courseService.ts` | 大纲解析请求携带临时模型 Key |
| `frontend/src/services/examService.ts` | 试题解析请求携带临时模型 Key |
| `frontend/src/services/ragService.ts` | 必要时导出临时 Key 请求头工具 |

按需修改：

| 文件范围 | 任务 |
| --- | --- |
| `frontend/src/pages/teacher/**` | 展示 `parseMode`、`confidence`、`issues` |
| `backend/main.go` | 仅当路由缺失或挂错时修改 |
| `env.example` | 仅当缺少 LLM 配置说明时补充 |

不要修改：

| 文件范围 | 原因 |
| --- | --- |
| RAG 数据库表结构 | 本轮不重写 RAG |
| 考试提交评分主流程 | 与本轮 LLM 导入无关 |
| 学生练习推荐相关逻辑 | 本轮非目标 |

## 2. 已有代码事实

后端现状：

1. `backend/handlers/outline.go` 已有 `ParseCourseOutline()`。
2. `ParseCourseOutline()` 当前已具备 LLM 优先和 `parseOutline()` 规则回退雏形。
3. `backend/handlers/ai.go` 已有 `ParseQuestionsWithAI()`，但当前主要调用本地 `parseQuestions()`。
4. `backend/handlers/ai.go` 已有 `ConfirmParsedQuestions()`，用于教师确认导入题库。
5. `backend/handlers/llm_parse.go` 已有 `completeWithConfiguredLLM()` 和 `extractJSONObject()`。
6. `backend/handlers/rag.go` 已有 `getRAGConfig()`，读取 `X-RAG-API-Key`、`X-RAG-Provider` 和环境变量。
7. `backend/rag/generator.go` 已有 `GenClient.Complete()`。

前端现状：

1. `frontend/src/services/courseService.ts` 已有 `parseOutline(courseId, file)`。
2. `frontend/src/services/examService.ts` 已有 `parseQuestionsFromFile(examId, file)`。
3. `frontend/src/services/ragService.ts` 已有临时 Key 存取逻辑。
4. 临时 Key 存在 `sessionStorage`，请求头为 `X-RAG-API-Key`、`X-RAG-Provider`。

## 3. 功能边界

### 3.1 本轮必须实现

1. 大纲解析接口优先调用 LLM。
2. 大纲 LLM 成功时返回 `parseMode: "llm"`。
3. 大纲 LLM 失败时回退 `parseOutline()`。
4. 大纲规则回退成功时返回 `parseMode: "rule_fallback"`。
5. 试题解析接口优先调用 LLM。
6. 试题 LLM 支持两类输入：
   - 已有题目文本。
   - 自然语言出题要求。
7. 试题 LLM 成功时返回 `parseMode: "llm"`。
8. 试题 LLM 失败时回退 `parseQuestions()`。
9. 试题规则回退成功时返回 `parseMode: "rule_fallback"`。
10. 大纲和试题解析请求可携带临时模型 Key。
11. 所有 LLM 输出必须后端校验。
12. 解析接口不得直接写入章节、课时或题库。

### 3.2 本轮禁止实现

1. 禁止实现自动薄弱知识点识别。
2. 禁止实现专项练习自动生成。
3. 禁止实现学生个性化学习路径推荐。
4. 禁止新增题目知识点标签体系。
5. 禁止重写 RAG 知识库架构。
6. 禁止新增 LLM 调用记录表。
7. 禁止把 LLM 生成题目直接写入 `exam_questions`。
8. 禁止把用户临时模型 Key 持久化。
9. 禁止在日志中打印完整模型 Key。
10. 禁止删除现有规则解析逻辑。

## 4. API 规格

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

| 字段 | 要求 |
| --- | --- |
| `file` | 必填 |
| 文件类型 | `.txt`、`.md` |
| 文件大小 | 不超过 2MB |

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

字段断言：

1. `parseMode` 必须存在。
2. `parseMode` 只能是 `llm` 或 `rule_fallback`。
3. `fallbackReason` 可选；建议仅在回退时返回；如果返回，必须是短字符串，不包含 Key 或原文。
4. `chapterCount == len(chapters)`。
5. `sectionCount == 所有 chapters.sections 数量之和`。

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

| 字段 | 要求 |
| --- | --- |
| `file` | 必填 |
| 文件类型 | `.txt`、`.md`、`.csv` |
| 文件大小 | 不超过 2MB |

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

字段断言：

1. `parseMode` 必须存在。
2. `count == len(questions)`。
3. `questions[*].type` 必须合法。
4. `questions[*].stem` 不得为空。
5. `questions[*].score > 0`。
6. `questions[*].issues` 必须存在；无问题时为空数组 `[]`，不得序列化为 `null`。
7. `questions[*].confidence` 范围为 `0.0 <= confidence <= 1.0`。

### 4.3 试题确认导入

沿用现有接口：

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

断言：

1. 只有该接口可以把解析题目写入 `exam_questions`。
2. `parse-questions` 不得写入 `exam_questions`。
3. 写入前必须校验教师或管理员权限。
4. 路径参数 `:id` 必须与请求体 `examId` 一致。
5. `:id` 与 `examId` 不一致时返回 400。

## 5. 后端实现步骤

### 5.1 通用 LLM 调用

修改位置：

1. `backend/rag/generator.go`
2. `backend/handlers/llm_parse.go`

步骤：

1. 为 `GenClient` 增加带超时的 HTTP client。
2. 超时建议 10 到 15 秒。
3. 保持 OpenAI 兼容接口：`POST {baseURL}/chat/completions`。
4. 保持 `Complete(system, user)` 签名不变，除非必须改。
5. `completeWithConfiguredLLM()` 继续复用 `getRAGConfig(c)`。
6. 无 Key 时返回 error，由业务 handler 回退规则解析。
7. 只增加 HTTP 超时，不修改 RAG prompt、检索流程、上下文拼接方式和响应结构。

断言：

1. LLM 调用失败只返回 error，不直接写响应。
2. `completeWithConfiguredLLM()` 不记录 API Key。
3. 超时错误能被上层识别为回退原因。

### 5.2 JSON 提取

修改位置：

1. `backend/handlers/llm_parse.go`

步骤：

1. 保留 `extractJSONObject(raw string)`。
2. 支持去除 ```json 代码块。
3. 从第一个 `{` 到最后一个 `}` 截取。
4. 提取失败返回 error。

断言：

1. 非 JSON 文本触发规则回退。
2. JSON 反序列化失败触发规则回退。
3. 不接受模型解释文本作为有效结果。

### 5.3 课程大纲解析

修改位置：

1. `backend/handlers/outline.go`

步骤：

1. 保留 `ParseCourseOutline()` 路由和请求方式。
2. 保留教师/管理员权限校验。
3. 保留 `.txt`、`.md`、2MB 校验。
4. 读取文本后先调用 `parseOutlineWithLLM(c, text)`。
5. 成功时 `parseMode = "llm"`。
6. 失败时记录短日志，调用 `parseOutline(text)`。
7. 回退成功时 `parseMode = "rule_fallback"`。
8. LLM 和规则解析都失败时返回 400。
9. 响应增加可选 `fallbackReason`。
10. 不创建章节或课时。

校验规则：

1. `chapters` 至少 1 个有效章节。
2. 章节 `title` 非空。
3. 章节 `orderIndex` 后端重新连续编号。
4. `sections` 可为空数组。
5. 课时 `title` 非空。
6. 课时 `type` 只能是 `VIDEO` 或 `TEXT`。
7. 非法课时 `type` 按标题关键词修正，无法修正则 `VIDEO`。
8. 课时 `orderIndex` 后端重新连续编号。

### 5.4 试题解析/生成

修改位置：

1. `backend/handlers/ai.go`

步骤：

1. 保留 `ParseQuestionsWithAI()` 路由绑定。
2. 保留教师/管理员权限校验。
3. 增加考试归属权限校验：
   - `exams.id -> exams.course_id -> courses.instructor_id`
   - 教师只能操作自己的课程考试。
   - 管理员可操作全部考试。
4. 保留 `.txt`、`.md`、`.csv`、2MB 校验。
5. 读取文本后先调用 `parseQuestionsWithLLM(c, text)`。
6. 成功时返回 `parseMode = "llm"`。
7. 失败时记录短日志，调用 `parseQuestions(text)`。
8. 回退成功时返回 `parseMode = "rule_fallback"`。
9. LLM 和规则解析都失败时返回 400。
10. 不写入 `exam_questions`。

新增函数建议：

```go
func parseQuestionsWithLLM(c *gin.Context, text string) ([]ParsedQuestion, error)
func normalizeParsedQuestions(input []ParsedQuestion) ([]ParsedQuestion, error)
func validateParsedQuestion(q ParsedQuestion) (ParsedQuestion, bool)
```

试题校验规则：

1. 合法题型：
   - `SINGLE_CHOICE`
   - `MULTIPLE_CHOICE`
   - `TRUE_FALSE`
   - `SHORT_ANSWER`
2. `stem` 非空。
3. `score > 0`，否则使用默认分值并写入 `issues`。
4. 单选题至少 2 个选项。
5. 单选题答案归一化为一个合法选项字母。
6. 多选题至少 2 个选项。
7. 多选题答案归一化为 `A,C` 格式。
8. 判断题答案归一化为 `true` 或 `false`。
9. 简答题可无选项，但必须有参考答案。
10. 严重非法题过滤。
11. 轻微问题保留并写入 `issues`。
12. 每题重新计算 `confidence`。
13. 归一化后必须初始化 `Issues`；无问题时返回 `[]`，不得返回 `null`。

严重非法：

1. 题干为空。
2. 题型非法且无法修正。
3. 选择题无选项或选项少于 2 个。
4. 判断题答案无法归一化。
5. 简答题答案为空。

轻微问题：

1. 分值缺失。
2. 多选答案为 `AC`，可修正为 `A,C`。
3. 题型大小写不规范但可修正。
4. 选择题答案带括号或中文说明但可提取。

## 6. Prompt 规格

### 6.1 大纲 Prompt

必须包含：

1. 只输出 JSON。
2. 不输出 Markdown。
3. 根对象为 `{ "chapters": [...] }`。
4. `type` 只能是 `VIDEO` 或 `TEXT`。
5. `orderIndex` 从 1 开始。
6. `sections` 可以为空数组。

禁止：

1. 禁止要求模型直接写数据库。
2. 禁止要求模型返回自然语言解释。
3. 禁止要求模型输出多个候选方案。

### 6.2 试题 Prompt

必须包含：

1. 只输出 JSON。
2. 根对象为 `{ "questions": [...] }`。
3. 支持“解析已有题目”和“根据自然语言要求生成题目”。
4. 题型枚举固定。
5. `options` 只放选项正文，不带 `A.`。
6. 单选答案格式为 `A`。
7. 多选答案格式为 `A,C`。
8. 判断答案格式为 `true` 或 `false`。
9. 简答答案为参考答案文本。
10. 每题必须有 `score`。
11. 每题必须有 `issues` 数组。

禁止：

1. 禁止模型返回题目之外的教学建议。
2. 禁止模型返回 Markdown 表格。
3. 禁止模型省略答案。

## 7. 前端实现步骤

### 7.1 临时 Key 请求头

修改位置：

1. `frontend/src/services/ragService.ts`
2. `frontend/src/services/courseService.ts`
3. `frontend/src/services/examService.ts`

步骤：

1. 将 `ragCredentialHeaders()` 导出，或在不破坏现有代码的前提下复用其逻辑。
2. `courseService.parseOutline()` 请求头增加：
   - `X-RAG-API-Key`
   - `X-RAG-Provider`
3. `examService.parseQuestionsFromFile()` 请求头增加：
   - `X-RAG-API-Key`
   - `X-RAG-Provider`
4. 没有临时 Key 时不要阻止请求。

断言：

1. 有临时 Key 时两个解析请求都带模型请求头。
2. 无临时 Key 时请求仍正常发送。
3. `Content-Type: multipart/form-data` 保持。

### 7.2 大纲预览

按需修改教师课程页面。

要求：

1. 展示章节和课时树。
2. 展示 `parseMode`。
3. `parseMode=llm` 时提示 AI 解析成功。
4. `parseMode=rule_fallback` 时提示已使用规则解析兜底。
5. 不阻止教师确认导入。

### 7.3 试题预览

按需修改教师考试页面。

要求：

1. 展示题型、题干、选项、答案、分值。
2. 展示 `confidence`。
3. 展示 `issues`。
4. `issues` 非空时突出提示。
5. 教师可编辑、删除、确认导入。
6. 确认导入仍调用现有 `questions/confirm`。

## 8. 回退原因枚举

建议内部使用短字符串：

| 原因 | 含义 |
| --- | --- |
| `missing_key` | 未配置模型 Key |
| `request_failed` | HTTP 请求失败 |
| `timeout` | LLM 调用超时 |
| `bad_status` | LLM 返回错误状态 |
| `empty_response` | LLM 返回空内容 |
| `json_not_found` | 无法提取 JSON |
| `json_unmarshal_failed` | JSON 反序列化失败 |
| `validation_failed` | 字段校验后无有效数据 |
| `rule_parse_failed` | 规则解析也失败 |

要求：

1. `fallbackReason` 可返回给前端。
2. `fallbackReason` 不得包含 API Key。
3. `fallbackReason` 不得包含上传原文。
4. 示例响应可以不展示该字段；实现可选择仅在回退时返回。
5. 日志可以记录该枚举和错误摘要。

## 9. 权限断言

课程大纲解析：

1. 学生：403。
2. 教师：只能解析自己课程。
3. 管理员：可解析全部课程。
4. 课程不存在：404 或现有 NotFound 语义。

试题解析：

1. 学生：403。
2. 教师：只能解析自己课程下考试。
3. 管理员：可解析全部考试。
4. 考试不存在：404。

确认导入：

1. 教师导入题目仍需校验考试归属。
2. 不能只信任请求体 `examId`。
3. 路径中的 `:id` 必须与请求体 `examId` 一致；不一致返回 400。

## 10. 数据库断言

本轮不新增表。

解析接口数据库写入断言：

| 接口 | 是否允许写库 |
| --- | --- |
| `POST /courses/:id/parse-outline` | 否 |
| `POST /exams/:id/parse-questions` | 否 |
| `POST /exams/:id/questions/confirm` | 是 |

允许写入的表：

| 表 | 场景 |
| --- | --- |
| `course_chapters` | 教师确认大纲后，通过既有章节创建接口 |
| `course_sections` | 教师确认大纲后，通过既有课时创建接口 |
| `exam_questions` | 教师确认题目后，通过确认导入接口 |
| `ai_corrections` | 题目确认导入时记录修订差异 |

## 11. 测试断言

### 11.1 后端必测

1. 大纲 LLM 成功：返回 `parseMode=llm`。
2. 大纲无 Key：返回 `parseMode=rule_fallback`，不 500。
3. 大纲非法 JSON：返回 `parseMode=rule_fallback`。
4. 大纲空文件：返回 400。
5. 试题 LLM 成功：返回 `parseMode=llm`。
6. 试题无 Key且输入规则题目：返回 `parseMode=rule_fallback`。
7. 试题非法 JSON：返回 `parseMode=rule_fallback`。
8. 试题严重非法题：被过滤。
9. 学生访问大纲解析：403。
10. 学生访问试题解析：403。
11. 教师访问他人课程或考试：403。
12. 确认导入接口中路径 `:id` 与请求体 `examId` 不一致：400。

### 11.2 前端必测

1. 有临时 Key 时大纲解析请求带 `X-RAG-API-Key`。
2. 有临时 Key 时试题解析请求带 `X-RAG-API-Key`。
3. 无临时 Key 时仍能提交文件。
4. 大纲页面能展示 `parseMode`。
5. 试题页面能展示 `confidence` 和 `issues`。
6. 教师确认导入流程不受 `parseMode` 影响。

### 11.3 推荐命令

后端：

```bash
cd backend
go test ./...
```

前端：

```bash
cd frontend
npm run build
```

如果测试因环境、网络或依赖失败，最终说明必须写明失败原因。

## 12. 验收断言

完成后必须满足：

1. `parse-outline` 可走真实或 mock LLM 成功路径。
2. `parse-outline` 可走无 Key 回退路径。
3. `parse-questions` 可走真实或 mock LLM 成功路径。
4. `parse-questions` 可走无 Key 回退路径。
5. 两个解析接口都返回 `parseMode`。
6. 两个解析接口都不会因无 Key 直接 500。
7. 试题 LLM 结果必须经教师确认接口才写入题库。
8. 前端解析请求能复用临时模型 Key。
9. 现有 RAG 问答接口不被破坏。
10. 论文只能描述“初步评-辅闭环”，不得描述完整自动个性化闭环。
11. 确认导入接口中路径 `:id` 与请求体 `examId` 不一致时返回 400。
12. 题目 `issues` 无问题时序列化为 `[]`，不得为 `null`。

## 13. 论文口径限制

允许表述：

1. 系统实现了基于 LLM 的课程大纲结构化解析。
2. 系统在 LLM 不可用时回退至规则解析。
3. 系统实现了 LLM 辅助试题结构化生成/解析。
4. 教师可确认和修订后批量导入题库。
5. 系统通过 RAG 检索课程资料，并调用 LLM 生成可溯源问答。
6. 系统形成“考试/作业评估 + 课程知识库问答 + 教师辅助出题”的初步评-辅闭环。

禁止表述：

1. 自动识别学生薄弱知识点。
2. 自动生成专项练习并推送。
3. 全自动个性化学习路径推荐。
4. 错题知识点归因与自适应练习。
5. LLM 直接完成题库入库。
6. JSON Schema 强制校验，除非代码真实引入 JSON Schema 校验库。

## 14. 最小实现顺序

按以下顺序执行：

1. 读 `backend/handlers/outline.go`，确认大纲解析现状。
2. 读 `backend/handlers/ai.go`，确认试题解析现状。
3. 读 `backend/handlers/llm_parse.go` 和 `backend/rag/generator.go`，确认 LLM 调用方式。
4. 给 LLM HTTP 调用补超时。
5. 补大纲解析 `fallbackReason` 和日志。
6. 给试题解析增加 LLM 调用路径。
7. 给试题 LLM 输出增加校验归一化。
8. 给试题解析增加考试归属权限校验。
9. 让前端大纲解析携带临时 Key。
10. 让前端试题解析携带临时 Key。
11. 补后端测试。
12. 补前端构建或类型检查。
13. 输出最终变更总结和测试结果。

## 15. 最终检查清单

提交前逐项检查：

1. 是否未新增数据库表。
2. 是否未删除规则解析。
3. 是否所有 LLM 输出都经过校验。
4. 是否无 Key 时能回退。
5. 是否非法 JSON 时能回退。
6. 是否解析接口不直接写库。
7. 是否教师确认导入仍可用。
8. 是否临时 Key 不持久化。
9. 是否日志不含完整 Key。
10. 是否前端不因 `parseMode` 新字段报错。
11. 是否 RAG 问答未被无关改动影响。
12. 是否测试或构建结果已记录。

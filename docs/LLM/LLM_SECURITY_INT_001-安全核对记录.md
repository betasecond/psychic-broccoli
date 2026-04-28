# LLM_SECURITY_INT_001 安全核对记录

日期：2026-04-28

## 任务目标

核对以下约束是否满足：

- 日志不输出完整模型 Key
- 错误响应不包含完整 Key
- 数据库不保存上传全文
- 数据库不保存 LLM 原始响应全文
- `ai_corrections` 只保存结构化题目快照

## 核对范围

主要核对文件：

- `backend/handlers/llm_parse.go`
- `backend/handlers/rag.go`
- `backend/handlers/outline.go`
- `backend/handlers/ai.go`
- `backend/rag/generator.go`
- `backend/rag/embedder.go`
- `backend/utils/response.go`
- `frontend/src/services/ragService.ts`
- `frontend/src/pages/teacher/exams/parsedQuestionHelpers.ts`

辅助核对对象：

- `backend/database/education.db`
- 现有后端/前端运行日志文件

## 核对结果

### 1. 临时模型 Key 不持久化到数据库

结论：满足

证据：

1. 前端临时模型 Key 仅通过 `sessionStorage` 保存：
   - `frontend/src/services/ragService.ts`
   - 键名为 `courseark.rag.apiKey` / `courseark.rag.provider`
2. 未发现将临时模型 Key 写入 `localStorage`、数据库字段或后端持久化表的实现。
3. 当前本地数据库中不存在 `model_keys`、`llm_logs`、`llm_parse_records`、`temporary_questions`、`ai_import_sessions` 等持久化表。

补充说明：

- 临时模型 Key 会通过请求头 `X-RAG-API-Key` / `X-RAG-Provider` 发送给后端。
- 这是运行时传输，不属于数据库持久化。

### 2. 日志不输出完整模型 Key

结论：满足

证据：

1. `getRAGConfig()` 只读取 `X-RAG-API-Key` 和环境变量，不记录 Key 值。
2. `completeWithConfiguredLLM()` / `mapLLMRequestError()` 仅返回枚举化回退原因，不拼接 Key 内容。
3. `backend/rag/generator.go` 与 `backend/rag/embedder.go` 虽然在请求头中设置 `Authorization`，但错误分支只返回：
   - `missing OPENAI_API_KEY`
   - `generation API returned status ...`
   - `generation API error: ...`
   - `embedding API returned status ...`
   不包含实际 Key。
4. 对现有日志文件进行了 `sk-` 关键词扫描，未发现运行日志中落出完整模型 Key。

### 3. 错误响应不包含完整 Key

结论：满足

证据：

1. 统一错误响应由 `backend/utils/response.go` 输出，仅包含 `code` 和 `message`。
2. 课程大纲解析与试题解析链路在 LLM 不可用时返回：
   - 通用业务错误文案，或
   - `fallbackReason` 枚举
   不返回原始 Key、不返回请求头、不返回环境变量内容。
3. `llm_parse.go` 中缺 Key、超时、请求失败、非法 JSON 等情况都被映射为：
   - `missing_key`
   - `timeout`
   - `request_failed`
   - `json_not_found`
   - `json_unmarshal_failed`
   - `validation_failed`
   前端只展示枚举含义，不展示底层错误堆栈。

### 4. 数据库不保存上传全文

结论：满足

证据：

1. `outline.go` 和 `ai.go` 在解析接口中会读取上传文件内容到内存用于解析，但未写入业务表。
2. `parse-outline` 与 `parse-questions` 接口本身只返回预览结果，不直接写库。
3. `ai.go` 中 `ai_corrections.original_json` 写入的是 `req.OriginalQuestions` 的结构化 JSON：
   - 来源是前端构造的题目快照
   - 不是上传文件全文
4. 本地数据库中 `ai_corrections` 表当前无存量行；从实现路径上看，也没有把原始上传文本作为字段写入。

### 5. 数据库不保存 LLM 原始响应全文

结论：满足

证据：

1. `outline.go` / `ai.go` 中，LLM 返回值 `raw` 只在内存中经过 `extractJSONObject()` 和 `json.Unmarshal()` 处理。
2. 未发现将 `raw` 或 provider 原始响应 body 写入数据库的代码路径。
3. `backend/rag/generator.go` / `embedder.go` 的原始响应 body 仅用于本次反序列化，不参与持久化。

### 6. ai_corrections 只保存结构化题目快照

结论：满足

证据：

1. `ai.go` 中：
   - `original_json` = `json.Marshal(req.OriginalQuestions)`
   - `corrected_json` = `json.Marshal(successfulQuestions)`
2. `successfulQuestions` 来自后端 `normalizeParsedQuestion()` 的结构化结果，不包含 UI 本地字段。
3. 前端 `buildConfirmParsedQuestionsPayload()` 与 `stripQuestionUIFields()` 会在提交前剥离：
   - `_selected`
   - `_editing`
   - `_error`
4. 后端测试 `backend/handlers/ai_test.go` 已覆盖：
   - `ai_corrections.corrected_json` 只包含成功写入题目
   - `exam_questions` 写入结果不包含 UI 字段和解析元字段

## 接受标准核对

### 关键请求失败时响应不泄露敏感信息

满足。

当前解析链路失败时暴露给前端的是通用业务文案或 `fallbackReason` 枚举，不包含完整模型 Key、上传全文或 LLM 原始响应全文。

### ai_corrections.original_json 不包含上传文件全文

满足。

`original_json` 保存的是结构化题目快照，不是上传文本。

### ai_corrections.corrected_json 不包含 UI 字段

满足。

前端提交前先剥离 `_selected` / `_editing` / `_error`，后端入库时再次基于结构化题目对象重建 `successfulQuestions`。

## 补充观察

1. 前端 `api.ts` 在开发环境下会 `console.log` 成功响应数据，但响应体中并不会回显模型 Key。
2. 浏览器开发者工具当然可以看到当前请求头里的 `X-RAG-API-Key`，这是运行时传输现象，不属于日志或数据库持久化泄露。
3. 本任务范围内未发现需要新增审计表或追加数据库迁移的地方。

## 结论

`LLM_SECURITY_INT_001` 当前结论为：通过。

本轮未发现以下问题：

- 完整模型 Key 落日志
- 完整模型 Key 落错误响应
- 上传全文落数据库
- LLM 原始响应全文落数据库
- `ai_corrections.corrected_json` 混入 UI 字段

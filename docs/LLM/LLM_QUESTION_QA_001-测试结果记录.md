# LLM_QUESTION_QA_001 测试结果记录

日期：2026-04-28

## 任务目标

验证“试题解析/生成与确认导入”闭环，包括：

- LLM 生成题目成功路径
- LLM 解析已有题目成功路径
- 无 Key 规则回退路径
- 非法 JSON 回退路径
- 严重非法题目过滤
- `issues=[]` 初始化
- 题目编辑后确认导入
- 部分成功导入
- 全部非法返回 `400`
- 教师访问他人考试返回 `403`
- 路径 `id` 与 `body.examId` 不一致返回 `400`
- `parse-questions` 不写库
- `questions/confirm` 写入 `exam_questions` 与 `ai_corrections`

## 自动化验证结果

### 1. 后端模块测试

执行命令：

```powershell
docker run --rm -v "${PWD}:/app" -w /app/backend golang:1.24.9 sh -lc "/usr/local/go/bin/go test ./handlers -run 'TestParseQuestionsWithAI|TestNormalizeParsedQuestions|TestConfirmParsedQuestions'"
```

结果：通过

覆盖结论：

- `ParseQuestionsWithAI` 覆盖了 LLM 成功返回、无 Key 规则回退、非法 JSON 后规则也失败返回 `400`
- 权限覆盖了教师访问他人考试返回 `403`
- `ConfirmParsedQuestions` 覆盖了路径 `id` 与 `body.examId` 不一致返回 `400`
- `ConfirmParsedQuestions` 覆盖了部分成功导入 `inserted=2,total=3`
- `ConfirmParsedQuestions` 覆盖了全部非法返回 `400`
- 数据库断言覆盖了：
  - `parse-questions` 本身不写业务表
  - `questions/confirm` 写入 `exam_questions`
  - `ai_corrections.corrected_json` 只包含实际成功写入的题目
  - 新写入题目不包含 UI 字段和解析元字段

对应测试文件：

- `backend/handlers/ai_test.go`

### 2. 后端全量测试

执行命令：

```powershell
docker run --rm -v "${PWD}:/app" -w /app/backend golang:1.24.9 sh -lc "/usr/local/go/bin/go test ./..."
```

结果：未通过

明确原因：

- Go 工具链在执行全量测试前提示 `go.mod` 需要 `go mod tidy`
- 这是当前仓库依赖声明状态导致的阻塞，不是本轮“试题解析/生成与确认导入”功能链路的测试失败

原始关键输出：

```text
go: updates to go.mod needed; to update it:
    go mod tidy
```

### 3. 前端模块测试

执行命令：

```powershell
npm run test:run -- src/pages/__tests__/parsedQuestionHelpers.test.ts src/services/__tests__/examService.test.ts
```

结果：通过

覆盖结论：

- `parsedQuestionHelpers` 覆盖了：
  - UI 归一化
  - 剥离 `_selected`、`_editing`、`_error` 等 UI 字段
  - 构造 `confirmParsedQuestions` payload
  - `fallbackReason` 友好文案
  - `confidence` 展示映射
  - 文件校验
- `examService` 覆盖了：
  - `parseQuestionsFromFile()` 携带临时模型 Key
  - 无临时 Key 时不发送空头
  - `confirmParsedQuestions()` 调用 `/exams/:id/questions/confirm`

### 4. 前端构建

执行命令：

```powershell
npm run build
```

结果：通过

补充说明：

- Vite 生产构建成功输出 `dist/`
- 构建仅出现 chunk size warning，不影响本任务验收

## 验收结论

本任务验收项结论如下：

1. 后端测试通过或有明确验证记录：满足
2. 前端构建通过：满足
3. 题库新增题目不包含 UI 字段、`confidence`、`issues`、`parseMode`、`fallbackReason`：满足

其中第 3 项由以下两部分共同支撑：

- 后端测试断言 `exam_questions` 和 `ai_corrections.corrected_json` 的实际写入结果
- 前端 `buildConfirmParsedQuestionsPayload()` / `stripQuestionUIFields()` 在提交前剥离本地 UI 字段

## 回归风险说明

当前剩余风险主要有：

1. 后端全量测试仍被 `go mod tidy` 阻塞，说明仓库整体依赖状态还未完全收敛。
2. 本轮重点验证的是“试题解析/确认导入”模块，没有额外补跑完整的教师端手工回归。
3. 课程大纲导入、RAG 问答、手动题目管理虽然没有发现本轮直接破坏证据，但仍建议在最终总回归任务中统一复核。

## 变更摘要

本轮 QA 结论支持以下实现已形成闭环：

- 后端：LLM 优先解析、规则回退、字段归一化、权限控制、确认导入、审计写入
- 前端：临时模型 Key、`parseMode` / `fallbackReason` 展示、`confidence` / `issues` 展示、本地编辑、统一确认导入

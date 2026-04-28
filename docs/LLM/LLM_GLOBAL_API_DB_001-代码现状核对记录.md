# LLM_GLOBAL_API_DB_001 代码现状核对记录

## 任务信息

| 字段 | 内容 |
| --- | --- |
| task_id | `LLM_GLOBAL_API_DB_001` |
| 模块 | 全局 LLM 基础能力 |
| 阶段 | API/DB |
| 任务 | 核对 LLM API 与数据库冻结基线 |
| 核对日期 | 2026-04-28 |

## 核对结论

本任务验收通过。

1. 三个冻结接口路径均存在，且继续挂载在 `/api/v1` 前缀下。
2. 两个解析接口当前均不向业务表写入解析结果。
3. 题目确认导入接口当前写入 `exam_questions` 与 `ai_corrections`，符合数据库写库边界。
4. 本轮不需要新增数据库迁移；未修改 `backend/database/schema.sql`，未新增 LLM 临时表或日志表。
5. 未发现路由缺失，因此无需生成“路由缺失”类后续 BE 修复任务。

## API 路由核对

| 冻结接口 | 当前代码位置 | 核对结果 |
| --- | --- | --- |
| `POST /api/v1/courses/:id/parse-outline` | `backend/main.go:100` 定义 `/api/v1`，`backend/main.go:153` 注册 `/:id/parse-outline` | 通过 |
| `POST /api/v1/exams/:id/parse-questions` | `backend/main.go:100` 定义 `/api/v1`，`backend/main.go:220` 注册 `/:id/parse-questions` | 通过 |
| `POST /api/v1/exams/:id/questions/confirm` | `backend/main.go:100` 定义 `/api/v1`，`backend/main.go:224` 注册 `/:id/questions/confirm` | 通过 |

补充观察：`backend/main.go:222` 另有 `POST /api/v1/exams/:id/parse-questions/stream`，该接口属于既有扩展路由，不影响本任务三个冻结接口的路径核对。

## 写库边界核对

| 接口 | Handler | 写库行为 | 核对结果 |
| --- | --- | --- | --- |
| `parse-outline` | `backend/handlers/outline.go:45` `ParseCourseOutline` | 仅在 `backend/handlers/outline.go:58` 查询课程归属；`backend/handlers/outline.go:96` 调用 LLM 解析，失败后 `backend/handlers/outline.go:100` 规则解析；`backend/handlers/outline.go:108` 返回预览结果。未发现 `Exec` 写入业务表。 | 通过 |
| `parse-questions` | `backend/handlers/ai.go:66` `ParseQuestionsWithAI` | `backend/handlers/ai.go:105` 使用规则解析题目；`backend/handlers/ai.go:111` 返回预览结果。未发现 `Exec` 写入业务表。 | 通过 |
| `questions/confirm` | `backend/handlers/ai.go:200` `ConfirmParsedQuestions` | `backend/handlers/ai.go:220` 查询考试存在性，`backend/handlers/ai.go:228` 查询最大题序；`backend/handlers/ai.go:241` 写入 `exam_questions`，`backend/handlers/ai.go:257` 写入 `ai_corrections`。 | 通过 |

## 数据库与迁移核对

| 项目 | 当前状态 | 核对结果 |
| --- | --- | --- |
| 迁移目录 | `backend/database/migrations` 当前仅有 `003_add_chapter_completions.sql`、`004_add_live_and_discussion_tables.sql`、`005_social_features.sql` | 本轮无新增迁移 |
| 业务表复用 | `backend/database/schema.sql:51` `course_chapters`，`:59` `course_sections`，`:104` `exam_questions`，`:245` `ai_corrections` | 符合复用现有表要求 |
| 禁止新增表 | 未发现 `llm_logs`、`llm_parse_records`、`temporary_questions`、`model_keys`、`ai_import_sessions` | 通过 |
| schema 修改 | 本任务未修改 `backend/database/schema.sql` | 通过 |

## 后续任务提示

本任务不阻塞后续 BE 编码任务。

非本任务范围但建议后续在对应 BE 任务中继续核对：

1. `parse-questions` 当前实现仍是本地规则解析，后续应在 LLM 题目解析任务中补齐 LLM 优先与规则回退。
2. `questions/confirm` 后续应按 API 文档继续核对路径 `:id` 与请求体 `examId` 一致性、考试归属链路等细节。

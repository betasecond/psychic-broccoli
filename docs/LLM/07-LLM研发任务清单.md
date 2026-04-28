# CourseArk LLM 研发任务清单

## 0. 文档定位

本文档承接 `docs/LLM/01-需求分析.md` 至 `docs/LLM/06-LLM 数据库设计文档.md`，用于给后续 AI Coding Agent 直接执行、验收和回归。

任务拆解原则：

1. 以业务模块为主线垂直拆解，不按前端、后端、测试机械拆分。
2. 每个模块按 `DOC -> API/DB -> BE -> FE -> INT -> QA` 形成闭环。
3. API 与数据库设计已经冻结，编码任务可以进入 `ready` 状态。
4. 任何实现不得突破 `04`、`05`、`06` 中冻结的 API 路径、写库边界、数据库结构和安全约束。
5. 每个任务必须独立可执行、可验证、可回滚，不得合并成“实现 LLM 模块”这类大任务。

## 1. 上游文档索引

| 文档 | 用途 |
| --- | --- |
| `docs/LLM/01-需求分析.md` | 功能范围、非目标、验收标准 |
| `docs/LLM/02-LLM功能详细设计.md` | 后端、前端、Prompt、回退、权限、测试断言 |
| `docs/LLM/03-LLM前端设计文档.md` | 教师端入口、Modal、字段、状态、交互、前端验收 |
| `docs/LLM/04-LLM API与数据库设计基线冻结文档.md` | API 与数据库冻结基线 |
| `docs/LLM/05-LLM API设计文档.md` | 三个冻结接口、请求响应、错误码、前端对接 |
| `docs/LLM/06-LLM 数据库设计文档.md` | 表复用、写库边界、字段落库、安全与一致性 |

## 2. 模块就绪矩阵

| 模块 | API 状态 | DB 状态 | 是否允许编码 | 说明 |
| --- | --- | --- | --- | --- |
| 全局 LLM 调用与 JSON 提取 | ready | ready | 是 | 复用 `getRAGConfig()`、`completeWithConfiguredLLM()`、`extractJSONObject()` |
| 课程大纲解析与确认导入 | ready | ready | 是 | `parse-outline` 不写库，确认导入复用既有章节/课时接口 |
| 试题解析/生成与确认导入 | ready | ready | 是 | `parse-questions` 不写库，`questions/confirm` 写 `exam_questions` 和 `ai_corrections` |
| 前端临时模型 Key 与解析状态展示 | ready | ready | 是 | 复用 `sessionStorage` 与 `X-RAG-*` 请求头 |
| 权限、安全、日志与回归 | ready | ready | 是 | 禁止持久化 Key、上传全文、LLM 原始响应 |

## 3. 全局执行约束

后续 AI Coding Agent 必须遵守：

1. 不新增数据库表、字段、索引、软删除、乐观锁字段。
2. 不新增 `llm_logs`、`llm_parse_records`、`temporary_questions`、`model_keys`、`ai_import_sessions` 等临时表。
3. 不修改 RAG 问答主流程、RAG 数据库表结构、学生练习推荐逻辑、考试评分主流程。
4. 不把 `parseMode`、`fallbackReason`、`confidence`、`issues` 写入 `exam_questions`。
5. 不把临时模型 Key、上传文件全文、LLM 原始响应全文写入数据库、日志或错误响应。
6. 解析接口只返回预览结果，不直接写业务表。
7. 试题只有经过 `POST /api/v1/exams/:id/questions/confirm` 后才允许写入题库。
8. 大纲确认导入继续复用既有章节、课时创建接口，不新增批量写库接口。
9. LLM 失败、无 Key、超时、非法 JSON 或校验失败时必须尝试规则回退。
10. 所有 LLM 输出必须经过后端校验和归一化。

## 4. 闭环任务链

### 4.1 全局 LLM 基础能力

```yaml
task_id: LLM_GLOBAL_API_DB_001
module: 全局 LLM 基础能力
phase: API/DB
title: 核对 LLM API 与数据库冻结基线
status: ready
depends_on: []
input:
  docs:
    - docs/LLM/04-LLM API与数据库设计基线冻结文档.md
    - docs/LLM/05-LLM API设计文档.md
    - docs/LLM/06-LLM 数据库设计文档.md
scope:
  include:
    - 确认三个冻结接口路径未被改名
    - 确认解析接口禁止写库
    - 确认本轮不需要数据库迁移
  exclude:
    - 修改 schema.sql
    - 新增 LLM 日志表
acceptance_criteria:
  - /api/v1/courses/:id/parse-outline 路径保持不变
  - /api/v1/exams/:id/parse-questions 路径保持不变
  - /api/v1/exams/:id/questions/confirm 路径保持不变
  - 本轮无新增数据库迁移
deliverables:
  - 代码现状核对记录
  - 若发现路由缺失，生成后续 BE 修复任务
blockers: []
```

```yaml
task_id: LLM_GLOBAL_BE_001
module: 全局 LLM 基础能力
phase: BE
title: 完善 LLM 调用超时与错误回退语义
status: ready
depends_on:
  - LLM_GLOBAL_API_DB_001
input:
  files:
    - backend/rag/generator.go
    - backend/handlers/llm_parse.go
    - backend/handlers/rag.go
scope:
  include:
    - 为 OpenAI 兼容生成客户端增加 10 到 15 秒 HTTP 超时
    - 保持 GenClient.Complete(system, user) 调用语义稳定
    - 保持 completeWithConfiguredLLM() 只向业务层返回 error
    - 确保无 Key 时不直接写 HTTP 500 响应
  exclude:
    - 修改 RAG prompt
    - 修改 RAG 检索流程
    - 记录完整模型 Key
acceptance_criteria:
  - LLM 超时可被上层识别为 timeout 或等价错误
  - 无 Key、请求失败、空响应不会在通用层直接写业务响应
  - 现有 RAG 问答接口行为不被破坏
deliverables:
  - 后端 LLM 调用超时实现
  - 必要的单元测试或可复现验证说明
blockers: []
```

```yaml
task_id: LLM_GLOBAL_BE_002
module: 全局 LLM 基础能力
phase: BE
title: 稳定 JSON 提取与错误类型工具
status: ready
depends_on:
  - LLM_GLOBAL_BE_001
input:
  files:
    - backend/handlers/llm_parse.go
scope:
  include:
    - 保留 extractJSONObject(raw string)
    - 支持提取 Markdown json 代码块中的 JSON
    - 支持从首个 { 到最后一个 } 截取 JSON 对象
    - 提供 JSON 提取失败等可被业务 handler 映射的错误类型或错误原因
    - 明确 json_unmarshal_failed 由课程大纲、试题解析等业务 handler 在反序列化失败处映射
  exclude:
    - 接受 Markdown 表格作为有效业务结果
    - 接受模型自然语言解释作为有效业务结果
acceptance_criteria:
  - 非 JSON 文本返回可映射为 json_not_found 的提取错误
  - 非法 JSON 的 json_unmarshal_failed 不在 llm_parse.go 中强行判定，由业务 handler 映射
  - fallbackReason 不包含 Key、上传全文、原始响应全文或堆栈
deliverables:
  - JSON 提取公共逻辑
  - 可复用的 JSON 提取错误类型或错误原因
blockers: []
```

### 4.2 课程大纲解析与确认导入

```yaml
task_id: LLM_OUTLINE_BE_001
module: 课程大纲解析与确认导入
phase: BE
title: 实现课程大纲 LLM 优先解析与规则回退
status: ready
depends_on:
  - LLM_GLOBAL_BE_001
  - LLM_GLOBAL_BE_002
input:
  docs:
    - docs/LLM/02-LLM功能详细设计.md
    - docs/LLM/05-LLM API设计文档.md
  files:
    - backend/handlers/outline.go
api:
  - POST /api/v1/courses/:id/parse-outline
db:
  write: []
scope:
  include:
    - 保留现有 ParseCourseOutline() 路由和 multipart/form-data 上传方式
    - 校验 .txt/.md 后缀和 2MB 文件大小
    - 先调用 LLM 解析大纲
    - LLM 成功时返回 parseMode=llm
    - LLM 失败时调用现有 parseOutline() 规则解析
    - 规则回退成功时返回 parseMode=rule_fallback 和 fallbackReason
    - 返回 chapters、chapterCount、sectionCount
  exclude:
    - 创建章节
    - 创建课时
    - 写入 ai_corrections
acceptance_criteria:
  - LLM 成功时返回 parseMode=llm
  - 无 Key 且规则可解析时返回 parseMode=rule_fallback
  - LLM 请求失败、超时、非 JSON 输出等基础 fallback 通路可用
  - LLM 和规则解析均失败时返回 400
  - 调用 parse-outline 前后 course_chapters、course_sections 数量不变
deliverables:
  - 大纲解析后端实现
  - 后端测试或手工验证记录
blockers: []
```

```yaml
task_id: LLM_OUTLINE_BE_002
module: 课程大纲解析与确认导入
phase: BE
title: 实现大纲解析结果校验与归一化
status: ready
depends_on:
  - LLM_OUTLINE_BE_001
input:
  files:
    - backend/handlers/outline.go
scope:
  include:
    - 过滤标题为空的章节
    - sections 缺失时归一化为 []
    - 过滤标题为空的课时
    - 章节 orderIndex 后端重新连续编号
    - 课时 orderIndex 后端重新连续编号
    - section.type 只允许 VIDEO 或 TEXT
    - 非法 type 可按标题关键词修正，无法修正时默认 VIDEO
  exclude:
    - 返回数据库 ID
    - 收窄 course_sections.type 数据库枚举
acceptance_criteria:
  - chapterCount 等于 chapters.length
  - sectionCount 等于所有 sections 数量之和
  - 空章节被过滤
  - 无有效章节时触发 validation_failed 并进入规则回退
deliverables:
  - 大纲解析校验与归一化逻辑
blockers: []
```

```yaml
task_id: LLM_OUTLINE_FE_001
module: 课程大纲解析与确认导入
phase: FE
title: 大纲解析请求携带临时模型 Key
status: ready
depends_on:
  - LLM_GLOBAL_API_DB_001
input:
  docs:
    - docs/LLM/03-LLM前端设计文档.md
    - docs/LLM/05-LLM API设计文档.md
  files:
    - frontend/src/services/ragService.ts
    - frontend/src/services/courseService.ts
scope:
  include:
    - 导出或复用 ragCredentialHeaders()
    - courseService.parseOutline() 合并 X-RAG-API-Key 与 X-RAG-Provider
    - 无临时 Key 时仍正常提交
    - 保留 Content-Type: multipart/form-data
  exclude:
    - 将 Key 存入 localStorage
    - 在 console 或 UI 中输出完整 Key
acceptance_criteria:
  - 有临时 Key 时请求头包含 X-RAG-API-Key
  - 无临时 Key 时请求头不包含空 Key，且请求仍可发送
deliverables:
  - 前端 service 更新
  - 类型定义更新
blockers: []
```

```yaml
task_id: LLM_OUTLINE_FE_002
module: 课程大纲解析与确认导入
phase: FE
title: 完善大纲解析预览、编辑、选择与导入保护
status: ready
depends_on:
  - LLM_OUTLINE_FE_001
input:
  docs:
    - docs/LLM/03-LLM前端设计文档.md
  files:
    - frontend/src/pages/teacher/courses/CourseEditPage.tsx
    - frontend/src/components/RagApiKeyControl.tsx
scope:
  include:
    - 在 AI 大纲导入 Modal 接入 RagApiKeyControl
    - 将 Key 控件相关文案泛化为“模型相关请求”，不称为 RAG Key 或问答请求
    - 在 AI 大纲导入 Modal 展示 parseMode Tag
    - parseMode=rule_fallback 时展示 fallbackReason 友好文案
    - 支持章节、课时默认选中
    - 支持导入前编辑和删除章节/课时
    - 导入时逐章调用既有 createChapter，再用真实 chapterId 调用 createSection
    - 记录 _saved、_saving、_createdChapterId 等 UI 状态以支持部分失败重试
  exclude:
    - 新增大纲批量导入后端接口
    - 将 UI 状态传入后端业务接口
acceptance_criteria:
  - 大纲弹窗展示临时模型 Key 控件，且控件文案适用于模型解析请求
  - 上传前按文件扩展名和 file.size 校验 .txt/.md 与 2MB 上限，不依赖 MIME
  - 教师可看到 AI 解析或规则解析状态
  - 教师可取消某个章节或课时导入
  - 课时创建必须使用真实创建后的 chapterId
  - 导入中禁用重复提交
  - 部分失败时保留失败项并避免重复创建已成功章节
deliverables:
  - 大纲导入 Modal 更新
  - 必要的前端纯函数
blockers: []
```

```yaml
task_id: LLM_OUTLINE_QA_001
module: 课程大纲解析与确认导入
phase: QA
title: 验证课程大纲解析闭环
status: ready
depends_on:
  - LLM_OUTLINE_BE_002
  - LLM_OUTLINE_FE_002
scope:
  include:
    - LLM 成功路径
    - 无 Key 规则回退路径
    - 非法 JSON 规则回退路径
    - 空文件、超大文件、非法后缀
    - 学生访问 403
    - 教师访问他人课程 403
    - parse-outline 禁止写库
    - 教师确认导入后章节/课时写库
acceptance_criteria:
  - 后端测试通过或有明确手工验证记录
  - 前端构建通过
  - 大纲导入不会破坏手动章节/课时管理
deliverables:
  - 测试结果记录
  - 回归风险说明
blockers: []
```

### 4.3 试题解析/生成与确认导入

```yaml
task_id: LLM_QUESTION_BE_001
module: 试题解析/生成与确认导入
phase: BE
title: 实现试题 LLM 解析/生成与规则回退
status: ready
depends_on:
  - LLM_GLOBAL_BE_001
  - LLM_GLOBAL_BE_002
input:
  files:
    - backend/handlers/ai.go
api:
  - POST /api/v1/exams/:id/parse-questions
db:
  write: []
scope:
  include:
    - 保留 ParseQuestionsWithAI() 路由绑定
    - 校验 .txt/.md/.csv 后缀和 2MB 文件大小
    - 支持已有题目文本解析
    - 支持自然语言出题要求生成结构化题目
    - LLM 成功时返回 parseMode=llm
    - LLM 失败时调用现有 parseQuestions() 规则回退
    - 规则回退成功时返回 parseMode=rule_fallback 和 fallbackReason
  exclude:
    - 写入 exam_questions
    - 写入 ai_corrections
    - 修改考试评分主流程
acceptance_criteria:
  - parse-questions 成功响应包含 questions、count、parseMode
  - 无 Key 且规则可解析时不返回 500
  - 调用 parse-questions 前后 exam_questions、ai_corrections 数量不变
deliverables:
  - 试题解析后端实现
blockers: []
```

```yaml
task_id: LLM_QUESTION_BE_002
module: 试题解析/生成与确认导入
phase: BE
title: 实现试题字段校验、归一化、过滤与 issues
status: ready
depends_on:
  - LLM_QUESTION_BE_001
input:
  files:
    - backend/handlers/ai.go
scope:
  include:
    - 题型归一化为 SINGLE_CHOICE、MULTIPLE_CHOICE、TRUE_FALSE、SHORT_ANSWER
    - stem 去空后不能为空
    - options 缺失时归一化为 []
    - 选择题 options 至少 2 项
    - 单选答案归一化为单个合法字母
    - 多选答案归一化为升序逗号分隔字母
    - 判断题答案归一化为 true 或 false
    - 简答题答案不能为空
    - score 缺失或非法时使用默认分值并写入 issues
    - confidence 缺失时给出默认值并限制在 0 到 1
    - issues 缺失时归一化为 []
    - 严重非法题目过滤
  exclude:
    - 因轻微问题直接过滤题目
    - 返回 issues=null
acceptance_criteria:
  - count 等于归一化后的 questions.length
  - 严重非法题目不会出现在响应中
  - 轻微问题题目保留且 issues 非空
  - issues 无问题时序列化为 []
deliverables:
  - normalizeParsedQuestions / validateParsedQuestion 或等价逻辑
  - 单元测试或验证样例
blockers: []
```

```yaml
task_id: LLM_QUESTION_BE_003
module: 试题解析/生成与确认导入
phase: BE
title: 完善试题解析与确认导入权限校验
status: ready
depends_on:
  - LLM_QUESTION_BE_001
input:
  files:
    - backend/handlers/ai.go
scope:
  include:
    - 学生调用 parse-questions 返回 403
    - 教师只能解析自己课程下的考试
    - 管理员可解析全部考试
    - questions/confirm 复用同等考试归属校验
    - questions/confirm 校验路径 :id 与 body.examId 一致
  exclude:
    - 只信任请求体 examId
    - 放宽学生端权限
acceptance_criteria:
  - 教师访问他人考试 parse-questions 返回 403
  - 教师访问他人考试 questions/confirm 返回 403
  - 路径 examId 与 body examId 不一致返回 400
deliverables:
  - 权限校验实现
  - 权限测试或验证记录
blockers: []
```

```yaml
task_id: LLM_QUESTION_BE_004
module: 试题解析/生成与确认导入
phase: BE
title: 实现题目确认导入、部分成功与修订审计
status: ready
depends_on:
  - LLM_QUESTION_BE_002
  - LLM_QUESTION_BE_003
input:
  docs:
    - docs/LLM/05-LLM API设计文档.md
    - docs/LLM/06-LLM 数据库设计文档.md
  files:
    - backend/handlers/ai.go
api:
  - POST /api/v1/exams/:id/questions/confirm
db:
  write:
    - exam_questions
    - ai_corrections
scope:
  include:
    - 校验 confirmedQuestions 至少包含 1 道题
    - 写入前再次校验并归一化每道题
    - options 序列化为 JSON 数组字符串
    - answer 保存裸答案字符串，不额外 JSON 序列化
    - 读取、展示、判分相关逻辑兼容历史 JSON 字符串答案，例如 "A"
    - order_index 从当前最大值后递增
    - 单题失败跳过并继续处理后续题
    - 至少 1 道题成功时返回 200 和 inserted/total
    - 0 道题成功时返回 400
    - ai_corrections 记录 original_json、corrected_json、diff_summary
    - ai_corrections 写入失败不回滚已插入题目
  exclude:
    - 把 confidence、issues、parseMode、fallbackReason 写入 exam_questions
    - 把 _selected、_saved、_saving、_editing、_error 写入数据库
    - 改为全成功或全回滚事务语义
acceptance_criteria:
  - 合法 3 题返回 inserted=3,total=3
  - 2 合法 1 非法返回 inserted=2,total=3
  - 全部非法返回 400
  - 新写入答案为裸字符串，同时历史 JSON 字符串答案仍可被读取、展示和判分兼容
  - ai_corrections.corrected_json 只包含实际成功插入题目
  - 数据库中不存在 UI 字段和解析元字段
deliverables:
  - 确认导入实现
  - 数据库写入验证
blockers: []
```

```yaml
task_id: LLM_QUESTION_FE_001
module: 试题解析/生成与确认导入
phase: FE
title: 试题解析请求携带临时模型 Key 并补充确认导入 service
status: ready
depends_on:
  - LLM_GLOBAL_API_DB_001
input:
  docs:
    - docs/LLM/03-LLM前端设计文档.md
    - docs/LLM/05-LLM API设计文档.md
  files:
    - frontend/src/services/ragService.ts
    - frontend/src/services/examService.ts
scope:
  include:
    - examService.parseQuestionsFromFile() 合并 ragCredentialHeaders()
    - 新增 examService.confirmParsedQuestions()
    - 补充 ParseQuestionsResponse、ConfirmParsedQuestionsRequest 类型
    - service 返回 { inserted, total }
  exclude:
    - 让 parse-questions 直接写库
    - 继续让 AI 批量导入逐题调用 addQuestion()
acceptance_criteria:
  - 有临时 Key 时 parse-questions 请求头包含 X-RAG-API-Key
  - confirmParsedQuestions 调用 /exams/:id/questions/confirm
  - 无临时 Key 时仍可上传解析
deliverables:
  - 前端考试 service 更新
blockers: []
```

```yaml
task_id: LLM_QUESTION_FE_002
module: 试题解析/生成与确认导入
phase: FE
title: 完善试题解析预览、编辑、选择、issues 与 confidence 展示
status: ready
depends_on:
  - LLM_QUESTION_FE_001
input:
  docs:
    - docs/LLM/03-LLM前端设计文档.md
  files:
    - frontend/src/pages/teacher/exams/EditExamPage.tsx
    - frontend/src/components/RagApiKeyControl.tsx
scope:
  include:
    - 在 AI 题目解析 Modal 接入 RagApiKeyControl
    - 将 Key 控件相关文案泛化为“模型相关请求”，不称为 RAG Key 或问答请求
    - 在 AI 题目解析 Modal 展示 parseMode Tag
    - 展示 fallbackReason 友好文案
    - 展示 confidence 分级
    - 展示 issues 警告
    - 支持题目选择、编辑、删除
    - 解析完成瞬间保存不含 UI 字段的 originalQuestions deep copy
    - 本地编辑不立即写库
  exclude:
    - 新增学生端入口
    - 新增知识点标签编辑器
acceptance_criteria:
  - 试题弹窗展示临时模型 Key 控件，且控件文案适用于模型解析请求
  - 上传前按文件扩展名和 file.size 校验 .txt/.md/.csv 与 2MB 上限，不依赖 MIME
  - 教师可在导入前修改题干、选项、答案、分值
  - issues 非空题目导入前触发二次确认
  - confidence 缺失时展示为未知或 -
  - 前端本地 UI 字段不进入业务 payload
deliverables:
  - 试题解析 Modal 更新
  - stripQuestionUIFields / buildConfirmParsedQuestionsPayload 或等价纯函数
blockers: []
```

```yaml
task_id: LLM_QUESTION_FE_003
module: 试题解析/生成与确认导入
phase: FE
title: 将 AI 题目批量保存改为统一确认导入接口
status: ready
depends_on:
  - LLM_QUESTION_FE_002
scope:
  include:
    - 导入时构造 examId、originalQuestions、confirmedQuestions
    - confirmedQuestions 只包含选中题目
    - 提交前剥离所有 _ 开头 UI 字段
    - 调用 examService.confirmParsedQuestions()
    - 成功后关闭 Modal 并刷新考试题目列表
    - inserted < total 时提示部分成功
    - 导入中禁用关闭、编辑和重复提交
  exclude:
    - AI 批量导入继续逐题调用 addQuestion()
    - 把未选中题目提交到 confirmedQuestions
acceptance_criteria:
  - AI 导入题目只调用 questions/confirm
  - 手动新增题目仍继续使用既有 addQuestion()
  - 部分成功时前端不提示完全成功
deliverables:
  - 批量导入流程更新
blockers: []
```

```yaml
task_id: LLM_QUESTION_QA_001
module: 试题解析/生成与确认导入
phase: QA
title: 验证试题解析、编辑、确认导入闭环
status: ready
depends_on:
  - LLM_QUESTION_BE_004
  - LLM_QUESTION_FE_003
scope:
  include:
    - LLM 生成题目成功路径
    - LLM 解析已有题目成功路径
    - 无 Key 规则回退路径
    - 非法 JSON 回退路径
    - 严重非法题目过滤
    - issues=[] 初始化
    - 题目编辑后确认导入
    - 部分成功导入
    - 全部非法返回 400
    - 学生访问 403
    - 教师访问他人考试 403
    - 路径 id 与 body examId 不一致返回 400
    - parse-questions 禁止写库
    - questions/confirm 写 exam_questions 与 ai_corrections
acceptance_criteria:
  - 后端测试通过或有明确验证记录
  - 前端构建通过
  - 题库新增题目不包含 UI 字段、confidence、issues、parseMode、fallbackReason
deliverables:
  - 测试结果记录
  - 回归风险说明
blockers: []
```

### 4.4 安全、观测与回归

```yaml
task_id: LLM_SECURITY_INT_001
module: 安全、观测与回归
phase: INT
title: 校验临时模型 Key、上传全文和 LLM 原始响应不持久化
status: ready
depends_on:
  - LLM_OUTLINE_BE_001
  - LLM_QUESTION_BE_004
  - LLM_OUTLINE_FE_001
  - LLM_QUESTION_FE_001
scope:
  include:
    - 检查日志不输出完整模型 Key
    - 检查错误响应不包含完整 Key
    - 检查数据库不保存上传全文
    - 检查数据库不保存 LLM 原始响应全文
    - 检查 ai_corrections 只保存结构化题目快照
  exclude:
    - 新增持久化审计表
acceptance_criteria:
  - 关键请求失败时响应不泄露敏感信息
  - ai_corrections.original_json 不包含上传文件全文
  - ai_corrections.corrected_json 不包含 UI 字段
deliverables:
  - 安全核对记录
blockers: []
```

```yaml
task_id: LLM_REGRESSION_QA_001
module: 安全、观测与回归
phase: QA
title: 执行后端、前端与既有能力回归
status: ready
depends_on:
  - LLM_OUTLINE_QA_001
  - LLM_QUESTION_QA_001
  - LLM_SECURITY_INT_001
scope:
  include:
    - 运行后端测试
    - 运行前端构建
    - 验证 RAG 问答不被破坏
    - 验证手动章节/课时管理不被破坏
    - 验证手动新增/编辑题目不被破坏
    - 汇总未覆盖风险
commands:
  backend:
    - cd backend
    - go test ./...
  frontend:
    - cd frontend
    - npm run build
acceptance_criteria:
  - 后端测试通过，或记录明确失败原因
  - 前端构建通过，或记录明确失败原因
  - 既有 RAG 问答、手动课程管理、手动题目管理无回归
deliverables:
  - 最终测试记录
  - 变更摘要
  - 未覆盖风险清单
blockers: []
```

## 5. 推荐执行顺序

推荐按依赖分批执行。完成 `LLM_GLOBAL_API_DB_001` 后，前端 service 与页面任务可以基于冻结 API 文档并行开发，不必等待后端实现完成；真正依赖后端完成的是联调、QA 和安全验证。

1. 基线核对：`LLM_GLOBAL_API_DB_001`
2. 后端基础能力：`LLM_GLOBAL_BE_001`、`LLM_GLOBAL_BE_002`
3. 前端 service 可并行启动：`LLM_OUTLINE_FE_001`、`LLM_QUESTION_FE_001`
4. 大纲后端链路：`LLM_OUTLINE_BE_001`、`LLM_OUTLINE_BE_002`
5. 试题后端链路：`LLM_QUESTION_BE_001`、`LLM_QUESTION_BE_002`、`LLM_QUESTION_BE_003`、`LLM_QUESTION_BE_004`
6. 前端页面链路：`LLM_OUTLINE_FE_002`、`LLM_QUESTION_FE_002`、`LLM_QUESTION_FE_003`
7. 模块 QA：`LLM_OUTLINE_QA_001`、`LLM_QUESTION_QA_001`
8. 安全与最终回归：`LLM_SECURITY_INT_001`、`LLM_REGRESSION_QA_001`

## 6. 任务状态定义

| 状态 | 含义 |
| --- | --- |
| `blocked_design` | API/DB 或业务规则不足，不能编码 |
| `ready` | 已具备实现条件 |
| `in_progress` | 执行中 |
| `implemented` | 已实现，尚未完成联调 |
| `integrated` | 已完成联调 |
| `verified` | 已测试通过 |

## 7. 最终交付要求

后续 AI Coding Agent 完成实现后，必须输出：

1. 已完成的 task_id 列表。
2. 修改文件列表。
3. 后端测试结果。
4. 前端构建结果。
5. 未覆盖风险。
6. 是否遵守数据库冻结约束。
7. 是否验证临时模型 Key 未持久化、未完整入日志。

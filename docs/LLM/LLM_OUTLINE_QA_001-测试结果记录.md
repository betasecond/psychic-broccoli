# LLM_OUTLINE_QA_001 测试结果记录

日期：2026-04-28

## 任务目标

验证“课程大纲解析与确认导入”闭环，包括：

- LLM 成功路径
- 无 Key 规则回退路径
- 非法 JSON 规则回退路径
- 空文件、超大文件、非法后缀
- 学生访问返回 `403`
- 教师访问他人课程返回 `403`
- `parse-outline` 预览接口不写库
- 教师确认导入后章节/课时写库
- 大纲导入不会破坏手动章节/课时管理

## 自动化验证结果

### 1. 后端大纲测试

执行命令：

```powershell
docker run --rm -v "${PWD}:/app" -w /app/backend golang:1.24.9 sh -lc "/usr/local/go/bin/gofmt -w handlers/outline_test.go && /usr/local/go/bin/go test ./handlers -run 'TestParseCourseOutline'"
```

结果：通过

覆盖结论：

- `TestParseCourseOutlineReturnsLLMResult` 覆盖了 LLM 成功路径，断言响应包含 `parseMode=llm`
- `TestParseCourseOutlineReturnsFallbackReasonWhenKeyMissing` 覆盖了无 Key 规则回退路径，断言返回 `parseMode=rule_fallback` 与 `fallbackReason=missing_key`
- `TestParseCourseOutlineReturnsFallbackReason` 覆盖了非法 JSON 回退路径，断言返回 `fallbackReason=json_unmarshal_failed`
- `TestParseCourseOutlineReturnsBadRequestForEmptyFile` 覆盖空文件返回 `400`
- `TestParseCourseOutlineReturnsBadRequestForOversizedFile` 覆盖超大文件返回 `400`
- `TestParseCourseOutlineReturnsBadRequestForInvalidSuffix` 覆盖非法后缀返回 `400`
- `TestParseCourseOutlineReturnsForbiddenForStudent` 覆盖学生访问返回 `403`
- `TestParseCourseOutlineReturnsForbiddenForOtherInstructor` 覆盖教师访问他人课程返回 `403`
- `TestParseCourseOutlineDoesNotWriteCourseTables` 覆盖 `parse-outline` 调用前后 `course_chapters`、`course_sections` 记录数不变

对应测试文件：

- `backend/handlers/outline_test.go`

### 2. 前端模块测试

执行命令：

```powershell
npm run test:run -- src/pages/__tests__/parsedOutlineHelpers.test.ts src/services/__tests__/courseService.test.ts
```

结果：通过

覆盖结论：

- `parsedOutlineHelpers` 覆盖了：
  - 大纲预览 UI 归一化
  - 已选章节/课时计数
  - 导入前校验
  - 未完成导入项识别
  - `fallbackReason` 友好文案
  - `.txt / .md` 与 `2MB` 文件校验
- `courseService` 覆盖了：
  - `parseOutline()` 在有临时模型 Key 时携带 `X-RAG-API-Key` / `X-RAG-Provider`
  - 无临时模型 Key 时不发送空请求头

对应测试文件：

- `frontend/src/pages/__tests__/parsedOutlineHelpers.test.ts`
- `frontend/src/services/__tests__/courseService.test.ts`

### 3. 前端构建

执行命令：

```powershell
npm run build
```

结果：通过

补充说明：

- Vite 生产构建成功输出 `dist/`
- 构建过程中仅出现 chunk size warning，不影响本任务验收

## 真实接口手工验证

验证环境：

- 前端代理目标：`http://127.0.0.1:18080`
- 后端：本地当前源码对应容器 `psychic-backend-localdb`
- 数据库：`backend/database/education.regression-20260428.db`

验证步骤摘要：

1. 以教师账号 `fengranran` 登录本地后端
2. 创建一门临时课程用于 QA
3. 先手动创建 1 个章节、1 个课时
4. 调用 `POST /api/v1/courses/:id/parse-outline` 上传 `.txt` 大纲文件
5. 确认解析成功且返回 `parseMode=rule_fallback`、`fallbackReason=missing_key`
6. 再次查询章节列表，确认预览解析前后章节数不变
7. 按解析结果调用现有 `createChapter()` / `createSection()` 导入 1 个章节、1 个课时
8. 再次查询章节与课时，确认：
   - 原手动章节/课时仍在
   - 导入后的章节/课时新增成功
9. 删除临时课程，清理验证数据

关键结果：

- `parse-outline` 返回状态：`200`
- 解析模式：`rule_fallback`
- 回退原因：`missing_key`
- 解析前章节数：`1`
- 解析后章节数：`1`
- 导入后章节数：`2`
- 手动章节课时数：`1`
- 导入章节课时数：`1`

手工验证结论：

- `parse-outline` 仅返回预览结果，不直接写入 `course_chapters` / `course_sections`
- 教师确认导入后，章节和课时通过现有创建接口正常写库
- 已有手动章节/课时未被覆盖或破坏

## 验收结论

本任务验收项结论如下：

1. 后端测试通过或有明确手工验证记录：满足
2. 前端构建通过：满足
3. 大纲导入不会破坏手动章节/课时管理：满足

## 回归风险说明

当前剩余风险主要有：

1. 本轮后端重点跑的是大纲相关定向测试，没有补跑后端全量 `go test ./...`。
2. 真实接口手工验证使用的是本地数据库副本 `education.regression-20260428.db`，结论适用于当前源码与本地联调环境。
3. 课程编辑页此前有历史乱码，本轮已修复当前可见文案，但最终总回归时仍建议再做一次教师端课程编辑页走查。

## 变更摘要

本轮新增和确认了以下 QA 支撑：

- 后端补齐了课程大纲解析的权限、文件校验、回退原因与“不写库”测试
- 前端确认了临时模型 Key 透传、预览归一化、导入前校验与构建产物
- 真实接口验证了“手动管理 + 大纲导入”可以共存，闭环成立

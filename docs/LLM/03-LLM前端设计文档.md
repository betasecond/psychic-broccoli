# CourseArk LLM 前端设计文档

## 0. 文档定位

本文档用于指导 CourseArk 前端实现 LLM 课程大纲解析与 LLM 试题结构化生成/解析能力。读者包括产品、前端开发、后端开发、测试人员和后续 AI coding agent。

阅读优先级：

1. 先遵守 `docs/LLM/01-需求分析.md`。
2. 再遵守 `docs/LLM/02-LLM功能详细设计.md`。
3. 最后遵守本文档。

本文档只设计前端交互、页面状态、字段规则和异常反馈，不改变后端功能边界。

本轮前端目标：

1. 保持现有教师端入口基本不变。
2. 大纲解析和试题解析请求携带临时模型 Key。
3. 清晰展示 `parseMode`、`fallbackReason`、`confidence`、`issues`。
4. LLM 结果必须经过教师预览、修订和确认后才写入业务数据。
5. 无 Key、LLM 失败或规则回退时，前端仍可完成现有导入流程。

本轮前端非目标：

1. 不新增学生端 LLM 大纲解析入口。
2. 不新增自动薄弱点练习生成入口。
3. 不新增知识点标签编辑器。
4. 不新增完整模型配置管理后台。
5. 不将临时模型 Key 持久化到数据库。

## 1. 当前前端事实

相关文件：

| 文件 | 当前职责 | 本轮设计影响 |
| --- | --- | --- |
| `frontend/src/pages/teacher/courses/CourseEditPage.tsx` | 课程编辑、章节课时管理、AI 大纲导入弹窗 | 增加解析模式展示、回退提示、预览编辑能力 |
| `frontend/src/pages/teacher/exams/EditExamPage.tsx` | 考试题目编辑、AI 题目解析导入弹窗 | 增加解析模式、置信度、问题提示，确认导入改为统一确认接口 |
| `frontend/src/services/courseService.ts` | 课程、章节、课时 API | `parseOutline()` 增加临时 Key 请求头和响应类型 |
| `frontend/src/services/examService.ts` | 考试、题目 API | `parseQuestionsFromFile()` 增加临时 Key 请求头、补确认导入 API |
| `frontend/src/services/ragService.ts` | RAG 文档、问答、临时 Key 存取 | 导出 `ragCredentialHeaders()` 供 LLM 解析请求复用 |
| `frontend/src/components/RagApiKeyControl.tsx` | 临时模型 Key 输入控件 | 可复用于 AI 导入弹窗，不新增 Key 表单；文案需泛化为模型相关请求 |

现有行为中需要修正的点：

1. `CourseEditPage` 已有 AI 大纲导入弹窗，但未展示 `parseMode`。
2. `CourseEditPage` 解析后只能整体导入，缺少导入前编辑与删除控制。
3. `EditExamPage` 已有 AI 题目解析弹窗，但未展示 `parseMode`、`confidence`、`issues`。
4. `EditExamPage` 当前批量保存逐题调用 `addQuestion()`，本轮必须改为调用确认导入接口，避免绕过“教师确认后入库”的后端设计。
5. `courseService.parseOutline()` 和 `examService.parseQuestionsFromFile()` 当前未携带临时模型 Key。

## 2. 信息架构

本轮只改教师端两个既有入口。

```text
Teacher
├─ 课程管理
│  └─ 编辑课程 /teacher/courses/:id/edit
│     └─ Tab: 课程内容
│        └─ Button: AI 导入大纲
│           └─ Modal: LLM 大纲解析与确认导入
│
└─ 考试管理
   └─ 编辑题目 /teacher/exams/:id/edit
      └─ Button: AI 解析导入
         └─ Modal: LLM 试题解析/生成与确认导入
```

共享能力：

```text
临时模型 Key
├─ 存储位置：sessionStorage
├─ 控件：RagApiKeyControl
├─ Header: X-RAG-API-Key
└─ Header: X-RAG-Provider
```

说明：

1. `X-RAG-*` 是历史命名，前端文案中应称为“临时模型 Key”或“模型 Key”，不要在新增文案里称为“RAG Key”。
2. 未填写临时模型 Key 时仍允许上传解析，由后端使用环境变量或规则回退。
3. `RagApiKeyControl` 复用于 AI 大纲/试题导入弹窗时，说明文案不要写“问答请求”，应使用“随模型相关请求发送给后端”等泛化表达。

## 3. 通用前端规则

### 3.1 请求头规则

`ragService.ts` 需要导出：

```ts
export const ragCredentialHeaders = () => Record<string, string>
```

调用规则：

1. `courseService.parseOutline()` 必须合并 `ragCredentialHeaders()`。
2. `examService.parseQuestionsFromFile()` 必须合并 `ragCredentialHeaders()`。
3. 无临时 Key 时，`ragCredentialHeaders()` 返回空对象。
4. `Content-Type: multipart/form-data` 必须保留。
5. 不在 console、message、Modal、URL、localStorage 中输出完整 Key。

### 3.2 解析模式展示规则

`parseMode` 展示为 Tag：

| parseMode | 文案 | 颜色 | 说明 |
| --- | --- | --- | --- |
| `llm` | AI 解析 | blue | LLM 成功返回结构化结果 |
| `rule_fallback` | 规则解析 | orange | LLM 不可用或校验失败，后端已兜底 |
| 空值 | 未知来源 | default | 兼容旧接口或异常响应 |

`fallbackReason` 只在 `parseMode=rule_fallback` 且后端返回时展示。前端只展示枚举含义，不展示原始错误堆栈。

枚举映射：

| fallbackReason | 前端文案 |
| --- | --- |
| `missing_key` | 未检测到可用模型 Key，已使用规则解析 |
| `request_failed` | 模型请求失败，已使用规则解析 |
| `timeout` | 模型响应超时，已使用规则解析 |
| `bad_status` | 模型服务返回异常，已使用规则解析 |
| `empty_response` | 模型返回为空，已使用规则解析 |
| `json_not_found` | 模型未返回有效 JSON，已使用规则解析 |
| `json_unmarshal_failed` | 模型 JSON 解析失败，已使用规则解析 |
| `validation_failed` | 模型结果校验未通过，已使用规则解析 |
| 其他 | AI 解析不可用，已使用规则解析 |

### 3.3 反馈分级

| 场景 | 组件 | 反馈 |
| --- | --- | --- |
| 上传前格式错误 | `message.warning` | `仅支持 .txt / .md` 或 `仅支持 .txt / .md / .csv` |
| 文件超过 2MB | `message.warning` | `文件大小不能超过 2MB` |
| 正在解析 | `Spin` + 按钮 loading | 禁用关闭外的危险操作 |
| LLM 成功 | `message.success` + `Tag` | 展示识别数量与 AI 解析 Tag |
| 规则回退成功 | `Alert type="warning"` + `Tag` | 明确“已使用规则解析兜底”，允许继续导入 |
| 解析无结果 | `Empty` 或 `Alert type="warning"` | 引导检查文件内容 |
| 导入成功 | `message.success` | 刷新章节或题目列表 |
| 导入部分失败 | `Alert type="error"` | 显示失败项数量，保留未导入项 |
| 权限错误 | 全局拦截 + Modal 内提示 | 不吞掉 403 |

### 3.4 Modal 操作保护

1. `parsing=true` 时禁用上传区、重新上传、确认导入。
2. `importing=true` 时禁用关闭、取消、重新上传、编辑、删除。
3. 用户点击右上角关闭时：
   - 未解析：直接关闭。
   - 已解析但未导入：弹出确认 `放弃当前解析结果？`。
   - 导入中：不允许关闭。
4. 弹窗关闭后清空临时解析结果，不清空临时模型 Key。

### 3.5 文件校验规则

前端文件校验只依赖文件名后缀和 `file.size`，不要依赖 `file.type`。浏览器对 `.txt`、`.md`、`.csv` 的 MIME 识别经常为空或不一致。

通用规则：

1. 大纲文件允许后缀：`.txt`、`.md`。
2. 试题文件允许后缀：`.txt`、`.md`、`.csv`。
3. 后缀比较应忽略大小写。
4. 文件大小使用 `file.size` 判断，不超过 `2 * 1024 * 1024`。
5. 前端校验只作为体验优化，后端仍必须做最终校验。

## 4. 课程大纲导入设计

### 4.1 页面入口

入口位置：

`frontend/src/pages/teacher/courses/CourseEditPage.tsx`

页面路径：

`/teacher/courses/:id/edit`

入口区域：

```text
┌────────────────────────────────────────────────────────────┐
│ Tab: 课程内容（N 章节）                                     │
├────────────────────────────────────────────────────────────┤
│ Card: 章节与课时管理                         [AI导入大纲] [添加章节] │
│                                                            │
│ ┌ Chapter 1 ─────────────────────────────────────────────┐ │
│ │ 章节标题                       [添加课时] [编辑] [删除] │ │
│ │   [视频] 课时标题                                      │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

入口按钮：

| 属性 | 规则 |
| --- | --- |
| 文案 | `AI 导入大纲` |
| 图标 | `RobotOutlined` |
| 可见角色 | 教师、管理员 |
| 禁用条件 | 课程不存在、课程加载中 |
| 点击动作 | 打开大纲解析 Modal，清空上一轮解析结果 |

### 4.2 大纲解析 Modal 布局

```text
┌──────────────────────────────────────────────────────────────┐
│ AI 智能导入大纲                                         [x]  │
├──────────────────────────────────────────────────────────────┤
│ 模型 Key 控件（可折叠或紧凑展示）                            │
│ [Provider: dashscope v] [临时模型 Key ********] [保存/清除]   │
│                                                              │
│ ┌ Upload.Dragger ──────────────────────────────────────────┐ │
│ │            [Robot / Loading Icon]                         │ │
│ │            点击或拖拽上传大纲文件                          │ │
│ │            支持 .txt / .md，大小不超过 2MB                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Alert: AI 解析 / 规则解析 / 回退原因                         │
│                                                              │
│ 识别结果：3 个章节，12 个课时                         [AI解析] │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [✓] 1 第一章 Go 语言基础                         [编辑][删] │ │
│ │     [视频] 变量与类型                            [编辑][删] │ │
│ │     [图文] 控制流程                              [编辑][删] │ │
│ │ [✓] 2 第二章 并发编程                            [编辑][删] │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                                      [取消] [导入已选 2 章节] │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 大纲数据模型

前端类型建议：

```ts
type ParseMode = 'llm' | 'rule_fallback'

interface ParsedOutlineSection {
  title: string
  orderIndex: number
  type: 'VIDEO' | 'TEXT'
  _selected?: boolean
  _editing?: boolean
  _saved?: boolean
  _error?: string
}

interface ParsedOutlineChapter {
  title: string
  orderIndex: number
  sections: ParsedOutlineSection[]
  _selected?: boolean
  _saved?: boolean
  _saving?: boolean
  _error?: string
  _createdChapterId?: number
}

interface ParseOutlineResponse {
  chapters: ParsedOutlineChapter[]
  chapterCount: number
  sectionCount: number
  parseMode: ParseMode
  fallbackReason?: string
}
```

前端初始化规则：

1. 后端返回章节后，为每个章节补 `_selected=true`。
2. 后端返回课时后，为每个课时补 `_selected=true`。
3. `sections` 缺失时归一化为空数组。
4. `type` 只接受 `VIDEO`、`TEXT`，异常值在前端显示为 `VIDEO`，但仍应在控制台以开发日志标记。

### 4.4 大纲字段规则

| 字段 | 控件 | 规则 | 错误提示 |
| --- | --- | --- | --- |
| 章节选择 | `Checkbox` | 默认选中；取消章节时其课时不导入 | 无 |
| 章节标题 | `Input` | 必填，1-100 字 | `请输入章节标题` |
| 章节顺序 | 只读 Tag 或 `InputNumber` | 默认使用列表顺序；可不开放编辑 | 无 |
| 课时选择 | `Checkbox` | 默认选中；章节未选中时禁用 | 无 |
| 课时标题 | `Input` | 必填，1-100 字 | `请输入课时标题` |
| 课时类型 | `Select` | `VIDEO`/`TEXT` | `请选择课时类型` |

导入前校验：

1. 至少选中 1 个章节。
2. 选中章节标题不能为空。
3. 选中课时标题不能为空。
4. 未选中章节下的课时不导入。
5. 空章节允许导入。

### 4.5 大纲页面状态

```text
closed
  └─ open
      ├─ idle
      │   └─ parsing
      │       ├─ parsed_empty
      │       ├─ parsed_llm
      │       ├─ parsed_fallback
      │       └─ parse_error
      └─ importing
          ├─ import_success
          ├─ import_partial_error
          └─ import_error
```

状态说明：

| 状态 | UI 表现 | 可操作项 |
| --- | --- | --- |
| `idle` | 显示上传区 | 上传、取消 |
| `parsing` | 上传区 loading | 不可重新上传，不可导入 |
| `parsed_empty` | Warning Alert | 重新上传、取消 |
| `parsed_llm` | Blue Tag `AI 解析` | 编辑、删除、选择、导入 |
| `parsed_fallback` | Orange Tag `规则解析` + warning | 编辑、删除、选择、导入 |
| `parse_error` | Error Alert | 重新上传、取消 |
| `importing` | Footer 主按钮 loading | 禁用编辑、关闭 |
| `import_partial_error` | 保留失败章节并显示错误 | 可重试导入未保存项 |

### 4.6 大纲交互动作

上传解析：

```text
用户选择文件
→ 前端校验扩展名和大小
→ 调用 courseService.parseOutline(courseId, file)
→ 后端返回 chapters + parseMode
→ 前端归一化 UI 状态
→ 展示解析结果
```

确认导入：

```text
用户点击 导入已选章节
→ 前端校验选中项
→ 按章节顺序循环 createChapter()
→ 每个章节创建成功后循环 createSection()
→ 标记章节 _saved=true
→ 全部成功后关闭 Modal
→ loadChapters() 刷新课程内容
```

部分失败处理：

1. 已成功创建的章节不回滚。
2. 当前失败章节标记 `_error`。
3. 如果章节创建成功但某个课时创建失败，前端必须记录该章节的 `_createdChapterId`。
4. 重试时如果存在 `_createdChapterId`，不得再次调用 `createChapter()` 创建同名章节，只补该章节下 `_saved !== true` 的课时。
5. 每个课时创建成功后标记 `_saved=true`；创建失败时标记 `_error` 并保留在预览中。
6. 后续未执行章节保留在弹窗中。
7. Footer 按钮改为 `继续导入未完成项`。
8. `message.error` 只提示摘要，详细失败原因显示在对应章节或课时行。
9. 如果实现不准备支持课时级重试，则必须明确禁用该章节的自动重试，并提示教师在章节已创建后手动补充失败课时；不得在重试时重复创建章节。

### 4.7 大纲异常反馈

文件校验说明：按文件名后缀和 `file.size` 校验，不依赖 MIME。

| 异常 | 前端处理 |
| --- | --- |
| 文件类型不是 `.txt`/`.md` | 阻止上传，`message.warning('仅支持 .txt / .md 文件')` |
| 文件超过 2MB | 阻止上传，`message.warning('文件大小不能超过 2MB')` |
| 后端 400 | 显示后端 message；保留上传区 |
| 后端 403 | 由全局拦截提示；Modal 显示 `无权限解析该课程` |
| 后端 500 | 显示 `解析失败，请稍后重试或检查文件内容` |
| `parseMode=rule_fallback` | 不算失败，显示 Warning Alert 后允许导入 |
| 导入章节失败 | 停止后续导入，标记失败章节 |
| 导入课时失败 | 标记当前章节部分失败；已创建章节保留 |

## 5. 试题解析/生成设计

### 5.1 页面入口

入口位置：

`frontend/src/pages/teacher/exams/EditExamPage.tsx`

页面路径：

`/teacher/exams/:id/edit`

入口区域：

```text
┌────────────────────────────────────────────────────────────┐
│ 编辑题目 / 考试标题                         [AI解析导入] [手动添加] │
├────────────────────────────────────────────────────────────┤
│ Table: 当前题库                                             │
│ # | 题型 | 题干 | 分值 | 操作                               │
└────────────────────────────────────────────────────────────┘
```

入口按钮：

| 属性 | 规则 |
| --- | --- |
| 文案 | `AI 解析导入` |
| 图标 | `RobotOutlined` |
| Tooltip | `上传文件，由 AI 识别或生成题目` |
| 可见角色 | 教师、管理员 |
| 禁用条件 | 考试加载中、考试不存在 |
| 点击动作 | 打开试题解析 Modal，清空上一轮解析结果 |

### 5.2 试题解析 Modal 布局

```text
┌────────────────────────────────────────────────────────────────┐
│ AI 智能解析题目                                           [x]  │
├────────────────────────────────────────────────────────────────┤
│ 模型 Key 控件（可折叠或紧凑展示）                              │
│                                                                │
│ ┌ Upload.Dragger ────────────────────────────────────────────┐ │
│ │             点击或拖拽上传题目文件                           │ │
│ │             支持 .txt / .md / .csv，大小不超过 2MB            │ │
│ └────────────────────────────────────────────────────────────┘ │
│ [开始 AI 解析]                                                  │
│                                                                │
│ Alert: AI 解析 / 规则解析 / 回退原因                           │
│                                                                │
│ 共识别 3 道题目                                      [AI解析]   │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ [✓] [单选题] 1. Go 中启动协程的关键字是？     [0.92] [编辑] │ │
│ │     A. go  B. func  C. defer  D. chan                       │ │
│ │     答案：A  分值：3                                        │ │
│ │                                                            │ │
│ │ [✓] [多选题] 2. 以下哪些是 channel 操作？     [0.78] [编辑] │ │
│ │     Warning: 多选答案已归一化为 A,C                         │ │
│ └────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                              [重新上传] [确认导入已选 3 题]    │
└────────────────────────────────────────────────────────────────┘
```

### 5.3 试题数据模型

前端类型建议：

```ts
type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'

interface ParsedQuestion {
  type: QuestionType
  stem: string
  options?: string[]
  answer: string
  score: number
  confidence: number
  issues: string[]
  _selected?: boolean
  _saved?: boolean
  _saving?: boolean
  _editing?: boolean
  _error?: string
}

interface ParseQuestionsResponse {
  questions: ParsedQuestion[]
  count: number
  parseMode: ParseMode
  fallbackReason?: string
}

interface ConfirmParsedQuestionsRequest {
  examId: number
  originalQuestions: ParsedQuestion[]
  confirmedQuestions: ParsedQuestion[]
}
```

前端归一化规则：

1. `questions` 缺失时按空数组处理。
2. 每题默认 `_selected=true`。
3. `issues` 缺失时归一化为 `[]`。
4. `confidence` 缺失时显示为 `-`，不得自行伪造高置信度。
5. `options` 对选择题必须显示为数组；如果后端返回字符串，前端尝试 JSON parse，失败则按空数组并提示问题。
6. 解析完成瞬间必须保存一份不含 UI 字段的 deep copy，作为后续 `originalQuestions`。
7. 所有 `_selected`、`_saved`、`_saving`、`_editing`、`_error` 等 `_` 开头 UI 字段不得进入确认导入 payload。

### 5.4 试题字段规则

| 字段 | 控件 | 规则 | 错误提示 |
| --- | --- | --- | --- |
| 是否导入 | `Checkbox` | 默认选中；已导入后禁用 | 无 |
| 题型 | `Select` | 四种枚举之一 | `请选择题型` |
| 题干 | `TextArea` | 必填，1-1000 字 | `请输入题干` |
| 选项 | `Input` 列表 | 单选/多选至少 2 项；最多 6 项 | `选择题至少需要 2 个选项` |
| 单选答案 | `Radio.Group` | 必须选中一个选项字母 | `请选择正确答案` |
| 多选答案 | `Checkbox.Group` | 至少选中一个选项字母 | `请选择至少一个正确答案` |
| 判断答案 | `Radio.Group` | `true`/`false` | `请选择正确答案` |
| 简答答案 | `TextArea` | 必填，1-2000 字 | `请输入参考答案` |
| 分值 | `InputNumber` | `1-100` | `请输入有效分值` |
| issues | `Alert` 或 `Tag` | 只读展示 | 无 |
| confidence | `Progress`/`Tag` | 只读展示，0-1 | 无 |

题型切换规则：

1. 从选择题切到判断题或简答题时，保留题干和分值，清空选项。
2. 从单选切到多选时，若原答案为 `A`，多选答案初始化为 `[A]`。
3. 从多选切到单选时，若原答案为 `A,C`，单选答案初始化为 `A` 并追加 issue `已从多选答案中保留第一个选项`。
4. 从非简答切到简答时，答案文本保留原答案字符串。

### 5.5 试题页面状态

```text
closed
  └─ open
      ├─ idle
      │   └─ parsing
      │       ├─ parsed_empty
      │       ├─ parsed_llm
      │       ├─ parsed_fallback
      │       └─ parse_error
      ├─ editing_question
      └─ confirming
          ├─ confirm_success
          └─ confirm_error
```

状态说明：

| 状态 | UI 表现 | 可操作项 |
| --- | --- | --- |
| `idle` | 上传区和开始解析按钮 | 上传、取消 |
| `parsing` | 开始按钮 loading | 不可重新上传 |
| `parsed_empty` | 未识别到题目提示 | 重新上传 |
| `parsed_llm` | Blue Tag `AI 解析` | 编辑、删除、选择、确认导入 |
| `parsed_fallback` | Orange Tag `规则解析` | 编辑、删除、选择、确认导入 |
| `editing_question` | 单题编辑表单 | 保存编辑、取消编辑 |
| `confirming` | Footer 主按钮 loading | 禁用关闭和编辑 |
| `confirm_error` | Error Alert | 保留当前题目，允许重试 |

### 5.6 试题交互动作

上传解析：

```text
用户选择文件
→ 前端校验扩展名和大小
→ 用户点击 开始 AI 解析
→ 调用 examService.parseQuestionsFromFile(examId, file)
→ 后端返回 questions + parseMode
→ 前端归一化 UI 状态
→ 展示题目预览
```

编辑单题：

```text
用户点击题目卡片中的 编辑
→ 展开或打开单题编辑表单
→ 按题型显示字段
→ 用户保存
→ 前端本地更新 parsedQuestions[index]
→ 不调用后端
```

确认导入：

```text
用户点击 确认导入已选 N 题
→ 前端校验选中题目字段
→ 从解析完成瞬间的 deep copy 读取 originalQuestions
→ 从当前选中并修订后的题目构造 confirmedQuestions
→ 剥离所有 _ 开头 UI 字段
→ 调用 POST /api/v1/exams/:id/questions/confirm
→ 成功后关闭 Modal
→ loadExam(examId) 刷新题目表格
```

重要断言：

1. 确认导入不得逐题调用 `addQuestion()`。
2. `parse-questions` 只负责返回预览数据，不直接写库。
3. 教师在前端修改后的题目进入 `confirmedQuestions`。
4. 后端原始解析快照进入 `originalQuestions`，用于记录修订差异；该快照必须是解析完成瞬间的 deep copy。
5. `originalQuestions` 和 `confirmedQuestions` 都必须剥离所有 `_` 开头 UI 字段。
6. 路径 `:id` 与请求体 `examId` 必须一致。
7. 只有 AI 解析结果批量导入走 `questions/confirm`；教师手动新增或编辑单题仍继续使用 `addQuestion()`、`updateQuestion()`。

### 5.7 试题卡片展示规则

每道题卡片至少展示：

```text
[Checkbox] [题型 Tag] 序号. 题干                    [confidence] [编辑] [删除]
选项列表（选择题）
答案：A,C / 正确 / 参考答案摘要
分值：3
issues 警告列表
```

`confidence` 展示规则：

| 范围 | 颜色 | 文案 |
| --- | --- | --- |
| `>= 0.85` | green | 高 |
| `0.6 - 0.84` | orange | 中 |
| `< 0.6` | red | 低 |
| 缺失 | default | - |

`issues` 展示规则：

1. `issues.length=0` 时不占用大块空间，可展示绿色小 Tag `无提示` 或不展示。
2. `issues.length>0` 时在题目卡片底部显示 `Alert type="warning"`。
3. issue 文本由后端提供，前端不拼接敏感信息。
4. 有 issue 的题目仍默认选中，但确认导入前应二次确认。

二次确认规则：

1. 如果选中题目中存在 `issues.length>0`，点击确认导入后弹出确认框。
2. 文案：`有 N 道题存在解析提示，确认导入前请确保已检查。`
3. 用户确认后继续调用确认导入接口。

### 5.8 试题异常反馈

文件校验说明：按文件名后缀和 `file.size` 校验，不依赖 MIME。

| 异常 | 前端处理 |
| --- | --- |
| 文件类型不是 `.txt`/`.md`/`.csv` | 阻止上传，`message.warning('仅支持 .txt / .md / .csv 文件')` |
| 文件超过 2MB | 阻止上传，`message.warning('文件大小不能超过 2MB')` |
| 后端返回空题目 | Warning Alert `未识别到题目，请检查文件内容` |
| `parseMode=rule_fallback` | Warning Alert，不阻止导入 |
| 有严重字段错误 | 前端校验阻止导入，并定位到第一道错误题 |
| 确认导入 400 | 展示后端 message，保留预览 |
| 确认导入 403 | 全局提示无权限，保留预览 |
| 确认导入 500 | Error Alert，允许重试 |

## 6. API 对接设计

### 6.1 `courseService.parseOutline`

请求：

```ts
api.post(`/courses/${courseId}/parse-outline`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    ...ragCredentialHeaders(),
  },
})
```

响应类型：

```ts
Promise<ParseOutlineResponse>
```

前端断言：

1. `chapterCount` 应等于 `chapters.length`，不一致时以前端实际长度展示，开发环境 console.warn。
2. `sectionCount` 应等于所有 `sections.length` 之和，不一致时以前端实际数量展示。
3. `parseMode` 缺失时兼容展示，但测试应覆盖新字段。

### 6.2 `examService.parseQuestionsFromFile`

请求：

```ts
api.post(`/exams/${examId}/parse-questions`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    ...ragCredentialHeaders(),
  },
})
```

响应类型：

```ts
Promise<ParseQuestionsResponse>
```

前端断言：

1. `count` 应等于 `questions.length`，不一致时以前端实际长度展示，开发环境 console.warn。
2. `issues` 必须归一化为数组。
3. `confidence` 只展示，不作为禁止导入条件。

### 6.3 `examService.confirmParsedQuestions`

新增 service：

```ts
async confirmParsedQuestions(
  examId: number,
  data: ConfirmParsedQuestionsRequest
): Promise<{ inserted: number; total: number }>
```

请求：

```ts
api.post(`/exams/${examId}/questions/confirm`, data)
```

请求体规则：

1. `data.examId = examId`。
2. `originalQuestions` 为后端刚返回的原始题目快照，必须来自解析完成瞬间保存的 deep copy。
3. `confirmedQuestions` 为教师选择并修订后的题目。
4. 未选中题目不进入 `confirmedQuestions`。
5. 两个数组都必须先通过 `stripQuestionUIFields()` 或同等逻辑移除所有 `_` 开头 UI 字段。
6. 当前 `api.ts` 会自动拆出响应中的 `data`，因此 service 返回值按 `{ inserted, total }` 设计；如果后端返回未包 `data` 的旧格式，前端可兼容读取同名字段。

## 7. 组件拆分建议

本轮可以先在页面内实现，但推荐拆分，降低后续 AI 修改风险。

```text
frontend/src/pages/teacher/courses/CourseEditPage.tsx
├─ OutlineImportModal
│  ├─ OutlineParseStatus
│  ├─ ParsedChapterList
│  └─ ParsedChapterEditor

frontend/src/pages/teacher/exams/EditExamPage.tsx
├─ QuestionImportModal
│  ├─ QuestionParseStatus
│  ├─ ParsedQuestionCard
│  └─ ParsedQuestionEditor
```

若时间有限，最小可接受实现：

1. 不拆文件，但必须抽出纯函数做字段归一化和校验。
2. 不新增复杂样式文件，优先使用 Ant Design 组件属性。
3. 不改动无关页面。

推荐纯函数：

```ts
normalizeParsedOutline(response): ParsedOutlineState
validateSelectedOutline(chapters): string | null
normalizeParsedQuestions(response): ParsedQuestionState
validateSelectedQuestions(questions): string | null
buildConfirmParsedQuestionsPayload(examId, original, current)
```

## 8. 可访问性与响应式

桌面端优先，最低兼容 1366px 宽度；弹窗在小屏仍需可滚动。

规则：

1. Modal 宽度：大纲 `720-800px`，试题 `800-920px`。
2. 预览列表最大高度使用 `maxHeight` + `overflowY: auto`。
3. 按钮文字不得在 1366px 桌面宽度下截断。
4. 图标按钮必须配 `Tooltip` 或可见文本。
5. 颜色提示必须同时有文字说明，不能只靠颜色区分。
6. 键盘可操作：上传、选择、编辑、确认导入均可通过 Tab 聚焦。

## 9. 测试设计

### 9.1 前端单元测试建议

覆盖纯函数：

1. `ragCredentialHeaders()` 有 Key 时返回两个 Header。
2. `ragCredentialHeaders()` 无 Key 时返回 `{}`。
3. 大纲响应缺少 `sections` 时归一化为空数组。
4. 大纲 `parseMode=rule_fallback` 时生成回退提示。
5. 试题 `issues=null` 时归一化为 `[]`。
6. 试题 `count` 与数组长度不一致时不影响展示。
7. 选择题选项少于 2 个时前端校验失败。
8. 确认导入 payload 只包含选中题目。

### 9.2 手工测试用例

大纲：

| 用例 | 步骤 | 预期 |
| --- | --- | --- |
| AI 解析成功 | 填临时 Key，上传结构清晰 `.md` | 展示 `AI 解析`，可导入章节课时 |
| 无 Key 回退 | 清空 Key，上传规则可识别 `.md` | 展示 `规则解析`，可继续导入 |
| 文件格式错误 | 上传 `.docx` | 前端阻止并提示格式错误 |
| 空内容 | 上传空 `.txt` | 后端 400 或无结果提示 |
| 部分取消 | 解析后取消一个章节 | 只导入选中章节 |

试题：

| 用例 | 步骤 | 预期 |
| --- | --- | --- |
| AI 生成题目 | 上传自然语言要求 `.txt` | 展示题目、置信度、issues |
| 规则回退 | 无 Key 上传规则题目文本 | 展示 `规则解析`，可确认导入 |
| 编辑后导入 | 修改题干、分值、答案后确认 | 题库展示修改后的题目 |
| issues 二次确认 | 解析结果含 issues | 点击导入出现二次确认 |
| 未选中题目 | 取消一题后导入 | 该题不写入题库 |

### 9.3 验收命令

前端：

```bash
cd frontend
npm run build
```

如项目已有测试脚本，可补充：

```bash
cd frontend
npm test
```

验收截图建议：

1. 大纲 `parseMode=llm` 成功截图。
2. 大纲 `parseMode=rule_fallback` 回退截图。
3. 试题预览含 `confidence` 和 `issues` 截图。
4. 试题确认导入后列表刷新截图。

## 10. 产品评审清单

产品评审时逐项确认：

1. 教师能从现有课程编辑页找到 AI 大纲导入入口。
2. 教师能从现有考试编辑页找到 AI 解析导入入口。
3. 页面明确区分 AI 解析和规则解析。
4. 规则回退不被描述成错误，不阻断教师导入。
5. 有问题的题目能被教师看到、编辑或删除。
6. 教师确认前，LLM 结果不会直接进入题库。
7. 未填写临时 Key 时，用户仍能尝试解析。
8. 新增文案不承诺自动薄弱点识别、专项练习推送或个性化路径。

## 11. 开发评审清单

开发评审时逐项确认：

1. `ragCredentialHeaders()` 已导出并被两个解析请求复用。
2. `parseOutline()` 类型包含 `parseMode` 和 `fallbackReason`。
3. `parseQuestionsFromFile()` 类型包含 `parseMode`、`confidence`、`issues`。
4. `EditExamPage` 确认导入调用 `questions/confirm`，不逐题调用 `addQuestion()`。
5. 前端本地编辑不会立即写库。
6. Modal loading 状态不会造成重复提交。
7. 异常响应不会清空用户已编辑的解析结果。
8. 没有打印完整临时模型 Key。
9. 未改动学生端 RAG 问答主流程。
10. 未引入新的全局状态库或无关依赖。

## 12. 测试评审清单

测试评审时逐项确认：

1. 有 Key 成功路径已验证或有 mock 证据。
2. 无 Key 回退路径已验证。
3. 非 JSON 或模型异常回退路径已验证。
4. 大纲导入前可取消章节或课时。
5. 试题导入前可编辑题型、题干、答案、分值。
6. 有 `issues` 的题目导入前有二次确认。
7. 403、400、500 均有可理解反馈。
8. 前端构建通过。
9. 现有手动添加章节、手动添加题目流程未回归。

## 13. AI Coding Agent 执行约束

后续 AI coding agent 实现本文档时必须遵守：

1. 先读 `01-需求分析.md`、`02-LLM功能详细设计.md` 和本文档。
2. 只修改本文档列出的前端相关文件，除非发现必要类型或路由缺失。
3. 不实现非目标能力。
4. 不把 `X-RAG-*` 改名为新 Header，除非后端同步修改。
5. 不把临时模型 Key 写入 localStorage 或后端。
6. 不删除现有规则解析提示和旧上传入口。
7. 不让 `parse-questions` 结果绕过确认接口直接入库。
8. 保持 Ant Design 现有视觉风格，不新增大面积自定义 UI。
9. 修改完成后至少运行 `npm run build`。
10. 最终说明必须写明测试结果和未覆盖风险。

## 14. 最小实现顺序

建议按以下顺序实现：

1. 导出 `ragCredentialHeaders()`。
2. 给 `courseService.parseOutline()` 增加临时 Key Header 和响应类型。
3. 给 `examService.parseQuestionsFromFile()` 增加临时 Key Header 和响应类型。
4. 新增 `examService.confirmParsedQuestions()`。
5. 在大纲 Modal 展示 `parseMode` 和 `fallbackReason`。
6. 在试题 Modal 展示 `parseMode`、`confidence`、`issues`。
7. 将试题批量保存改为确认导入接口。
8. 补前端本地字段校验。
9. 做无 Key 回退和正常解析的手工验证。
10. 运行前端构建。

## 15. 最终验收标准

本前端设计完成实现后，必须满足：

1. 大纲解析请求可携带临时模型 Key。
2. 试题解析请求可携带临时模型 Key。
3. 大纲解析结果展示 `parseMode`。
4. 试题解析结果展示 `parseMode`。
5. 试题解析结果展示 `confidence` 和 `issues`。
6. `rule_fallback` 时页面明确提示已使用规则解析兜底。
7. 教师可在导入前选择、编辑或删除解析结果。
8. 试题确认导入调用 `POST /exams/:id/questions/confirm`。
9. 无 Key 或 LLM 失败不会导致前端流程不可用。
10. 前端构建通过，现有手动管理流程不被破坏。

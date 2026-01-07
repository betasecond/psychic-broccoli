# 完善课堂讨论区功能后端API接口

## 当前现状
- ✅ 已实现 `GET /api/v1/discussions` - 获取讨论列表
- ✅ 已定义 `Discussion` 模型
- ✅ 已创建 `discussions` 表
- ❌ 缺少讨论回复相关的模型和表
- ❌ 缺少创建、编辑、删除讨论的API
- ❌ 缺少获取单个讨论详情的API
- ❌ 缺少回复讨论的API

## 实现计划

### 1. 数据库设计
- 添加 `discussion_replies` 表，用于存储讨论回复
- 修改 `discussions` 表结构，优化字段类型和关系

### 2. 模型定义
- 添加 `DiscussionReply` 模型
- 修改 `Discussion` 模型，优化字段映射

### 3. API接口实现
- `GET /api/v1/discussions/:id` - 获取单个讨论详情（包含回复）
- `POST /api/v1/discussions` - 创建新讨论
- `PUT /api/v1/discussions/:id` - 更新讨论
- `DELETE /api/v1/discussions/:id` - 删除讨论
- `GET /api/v1/discussions/:id/replies` - 获取讨论回复列表
- `POST /api/v1/discussions/:id/replies` - 回复讨论
- `PUT /api/v1/discussion-replies/:id` - 更新回复
- `DELETE /api/v1/discussion-replies/:id` - 删除回复

### 4. 代码结构优化
- 将讨论相关的处理函数从 `messages.go` 迁移到独立的 `discussions.go` 文件
- 确保所有API都有适当的权限控制
- 添加必要的请求验证和错误处理

## 预期效果
- 完整的课堂讨论区功能后端支持
- 支持创建、查看、编辑、删除讨论
- 支持回复讨论、编辑回复、删除回复
- 完善的权限控制，确保只有授权用户可以操作
- 与前端现有代码兼容

## 实现步骤
1. 修改数据库schema，添加讨论回复表
2. 更新模型定义
3. 实现讨论相关的处理函数
4. 配置路由
5. 测试API接口

这个计划将确保课堂讨论区功能的后端API接口完整实现，支持前端的所有功能需求。
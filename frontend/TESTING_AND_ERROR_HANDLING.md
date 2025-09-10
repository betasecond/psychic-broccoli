# 测试和错误处理文档

## 概述

本文档描述了用户认证系统中实现的测试策略和错误处理机制，旨在提高系统的可靠性、用户体验和可维护性。

## 测试策略

### 1. 单元测试

#### Redux Store 测试
- **位置**: `src/store/slices/__tests__/authSlice.test.ts`
- **覆盖范围**: 
  - 异步 actions (login, register, getCurrentUser, updateProfile, changePassword)
  - 同步 actions (logout, clearError)
  - 状态变化验证
  - 错误处理

#### 服务层测试
- **位置**: `src/services/__tests__/authService.test.ts`
- **覆盖范围**:
  - API 调用成功和失败场景
  - 错误消息处理
  - 网络错误处理
  - 参数验证

### 2. 组件测试

#### 页面组件测试
- **LoginPage**: `src/pages/__tests__/LoginPage.test.tsx`
  - 表单验证
  - 登录流程
  - 错误处理
  - 角色基础的导航

- **RegisterPage**: `src/pages/__tests__/RegisterPage.test.tsx`
  - 注册表单验证
  - 用户名/邮箱可用性检查
  - 密码确认验证
  - 角色选择

#### 通用组件测试
- **ProtectedRoute**: `src/components/__tests__/ProtectedRoute.test.tsx`
  - 认证状态检查
  - 角色权限验证
  - 重定向逻辑

- **UserAvatar**: `src/components/__tests__/UserAvatar.test.tsx`
  - 用户信息显示
  - 下拉菜单交互
  - 登出功能

### 3. 端到端测试

#### 完整认证流程测试
- **位置**: `src/test/e2e/auth-flow.test.tsx`
- **测试场景**:
  - 注册 → 登录 → 仪表板导航
  - 登录 → 个人资料 → 登出
  - 错误处理和恢复
  - 会话持久化
  - 令牌过期处理

### 4. 测试工具和配置

#### Vitest 配置
```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

#### 测试工具
- **Testing Library**: 组件渲染和交互测试
- **Vitest**: 测试运行器和断言库
- **Mock Service Worker**: API 模拟（可选）

## 错误处理机制

### 1. 全局错误处理器

#### ErrorHandler 类
- **位置**: `src/utils/errorHandler.ts`
- **功能**:
  - API 错误统一处理
  - 用户友好的错误消息
  - 错误分类和日志记录
  - 表单验证错误处理

```typescript
// 使用示例
try {
  await authService.login(credentials)
} catch (error) {
  ErrorHandler.showError(error, '登录失败，请重试')
}
```

### 2. React 错误边界

#### ErrorBoundary 组件
- **位置**: `src/components/ErrorBoundary.tsx`
- **功能**:
  - 捕获组件渲染错误
  - 显示友好的错误页面
  - 提供重试和刷新选项
  - 错误日志记录

### 3. API 错误处理

#### 增强的 API 服务
- **位置**: `src/services/api.ts`
- **功能**:
  - 自动重试机制
  - 请求/响应拦截器
  - 状态码特定处理
  - 认证错误自动处理

```typescript
// 重试配置
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// 自动重试网络错误
if (!error.response && config.__retryCount < MAX_RETRIES) {
  config.__retryCount = (config.__retryCount || 0) + 1
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config.__retryCount))
  return api(config)
}
```

### 4. 用户体验优化

#### 加载状态管理
- **LoadingSpinner 组件**: 统一的加载指示器
- **全局加载状态**: Redux 中的 loading 状态管理
- **按钮加载状态**: 表单提交时的视觉反馈

#### 错误消息优化
- **分类错误消息**: 根据错误类型显示不同消息
- **操作建议**: 提供具体的解决建议
- **自动消失**: 成功消息自动消失，错误消息需手动关闭

## 安全增强

### 1. 输入验证和清理

#### SecurityUtils 类
- **位置**: `src/utils/security.ts`
- **功能**:
  - HTML 转义防止 XSS
  - 输入格式验证
  - 密码强度检查
  - 文件类型和大小验证

```typescript
// 使用示例
const { isValid, feedback } = SecurityUtils.validatePassword(password)
if (!isValid) {
  setErrors(feedback)
}
```

### 2. 令牌管理
- **过期检查**: 自动检查令牌是否即将过期
- **自动刷新**: 在令牌过期前自动刷新
- **安全存储**: 使用 httpOnly cookies（推荐）或 localStorage

## 性能监控

### 1. PerformanceMonitor 类
- **位置**: `src/utils/performance.ts`
- **功能**:
  - 页面加载性能指标
  - 长任务检测
  - 内存使用监控
  - 自定义计时器

```typescript
// 使用示例
PerformanceMonitor.startTimer('api-call')
await authService.login(credentials)
PerformanceMonitor.endTimer('api-call')
```

### 2. 性能优化工具
- **防抖和节流**: 优化频繁操作
- **懒加载**: 按需加载组件
- **代码分割**: 减少初始包大小

## 运行测试

### 开发环境测试
```bash
# 运行所有测试
npm run test

# 运行测试并监听文件变化
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 持续集成
```bash
# 运行一次性测试（CI 环境）
npm run test:run
```

## 最佳实践

### 1. 测试编写
- **AAA 模式**: Arrange, Act, Assert
- **描述性测试名称**: 清楚描述测试场景
- **独立测试**: 每个测试应该独立运行
- **模拟外部依赖**: 使用 mock 隔离测试

### 2. 错误处理
- **用户友好**: 错误消息应该对用户有意义
- **可操作性**: 提供用户可以采取的行动
- **日志记录**: 记录详细错误信息用于调试
- **优雅降级**: 系统应该能够优雅地处理错误

### 3. 性能优化
- **监控关键指标**: FCP, LCP, CLS 等
- **优化长任务**: 避免阻塞主线程
- **内存管理**: 及时清理不需要的资源
- **网络优化**: 减少请求次数和大小

## 故障排除

### 常见问题

1. **测试失败**
   - 检查模拟配置
   - 验证异步操作的等待
   - 确认测试环境设置

2. **错误处理不生效**
   - 检查错误边界位置
   - 验证错误类型匹配
   - 确认拦截器配置

3. **性能问题**
   - 使用性能监控工具
   - 检查长任务和内存泄漏
   - 优化渲染和网络请求

### 调试技巧
- 使用浏览器开发者工具
- 启用详细日志记录
- 使用 React DevTools
- 监控网络请求

## 未来改进

1. **测试覆盖率**: 目标达到 90% 以上的代码覆盖率
2. **自动化测试**: 集成到 CI/CD 流水线
3. **性能预算**: 设置性能指标阈值
4. **错误上报**: 集成错误监控服务
5. **A/B 测试**: 支持功能开关和实验
# CourseArk TEST_CASES.md (GuoJia Strategy)

## 1. 权限测试 (RBAC)
- [ ] 学生只能发表选修课程的讨论。
- [ ] 非本课学生尝试回帖应返回 403 Forbidden。
- [ ] 讲师可关闭本课所有讨论，学生只能关闭自己的讨论。

## 2. 并发与异步处理 (Async Vanguard)
- [ ] 讨论发表后，API 应秒回 (Response Time < 50ms)。
- [ ] 检查 backend 日志，确认 `AnalyzeDiscussionAsync` 在独立 Goroutine 中执行。
- [ ] 并发压力测试：10 个并发 POST 发帖，不应出现死锁。

## 3. 限流与安全 (Security Refactor)
- [ ] 发帖接口频率限制 (Mock: 每分钟 5 次)。
- [ ] 数据库注入防御 (已使用 GORM/SQL Arguments，通过)。

## 4. 降级逻辑 (503 Fallback)
- [ ] 当 AI Service (Mock) 返回错误或延迟超过 5s 时，前端应显示“系统繁忙”提示。
- [ ] 核心业务逻辑 (发帖/回复) 不受 AI 服务故障影响。

## 5. 结果缓存与 TTL (15min Cache)
- [ ] 发表第一篇讨论，检查缓存 Key。
- [ ] 15 分钟内再次访问应命中缓存。
- [ ] 15 分钟后缓存应失效，触发重新模拟或清理。

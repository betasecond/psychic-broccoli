# 功能计划：讨论区评论点赞

**功能描述**: 在讨论详情页，每条回复右下角增加点赞按钮。用户可对回复点赞/取消点赞，实时显示点赞数。

---

## 一、交互设计

```
┌─────────────────────────────────────────────────┐
│ 张三                            2026-02-27 10:00 │
│ Goroutine 比线程更轻量级，由 Go 运行时调度...      │
│                                                 │
│                          👍 点赞  12            │
│                          ▲ 已点赞时高亮蓝色       │
└─────────────────────────────────────────────────┘
```

- 点击后立即切换高亮状态（Optimistic Update）
- 同一用户对同一条回复只能点一次，再次点击为取消
- 未登录用户点击提示"请先登录"

---

## 二、数据库变更

### 新增表：`reply_likes`

**文件**: [backend/database/schema.sql](backend/database/schema.sql)

```sql
-- 回复点赞表
CREATE TABLE IF NOT EXISTS reply_likes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    reply_id    INTEGER NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reply_id, user_id)   -- 每人只能点赞一次
);

CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id  ON reply_likes(user_id);
```

> **迁移策略**: 直接在 schema.sql 末尾追加上述 DDL，因 SQLite 使用 `CREATE TABLE IF NOT EXISTS`，对已存在的数据库执行 `InitDB` 时会自动跳过已有表，新表会被创建。

---

## 三、后端变更

### 3.1 Model 层

**文件**: [backend/models/models.go](backend/models/models.go)

在 `DiscussionReply` 结构体新增两个字段：

```go
type DiscussionReply struct {
    ID           int64     `json:"id"`
    DiscussionID int64     `json:"discussionId"`
    Content      string    `json:"content"`
    AuthorID     int64     `json:"authorId"`
    AuthorName   string    `json:"authorName,omitempty"`
    AuthorAvatar string    `json:"authorAvatar,omitempty"`
    CreatedAt    time.Time `json:"createdAt"`
    UpdatedAt    time.Time `json:"updatedAt"`
    // 新增
    LikeCount    int       `json:"likeCount"`   // 点赞总数
    IsLiked      bool      `json:"isLiked"`     // 当前用户是否已点赞
}
```

---

### 3.2 Handler 层：新增 `LikeReply` 函数

**文件**: [backend/handlers/discussions.go](backend/handlers/discussions.go)

在文件末尾追加：

```go
// LikeReply 切换回复点赞状态（点赞/取消点赞）
func LikeReply(c *gin.Context) {
    userID, _ := c.Get("userID")

    replyID, err := strconv.ParseInt(c.Param("rid"), 10, 64)
    if err != nil {
        utils.BadRequest(c, "无效的回复ID")
        return
    }

    // 验证回复是否存在
    var exists int
    database.DB.QueryRow(
        `SELECT COUNT(1) FROM discussion_replies WHERE id = ?`, replyID,
    ).Scan(&exists)
    if exists == 0 {
        utils.NotFound(c, "回复不存在")
        return
    }

    // 尝试插入点赞记录；若已存在（UNIQUE冲突）则改为删除（取消点赞）
    _, err = database.DB.Exec(
        `INSERT INTO reply_likes (reply_id, user_id) VALUES (?, ?)`,
        replyID, userID,
    )

    var liked bool
    if err != nil {
        // UNIQUE 冲突 → 取消点赞
        database.DB.Exec(
            `DELETE FROM reply_likes WHERE reply_id = ? AND user_id = ?`,
            replyID, userID,
        )
        liked = false
    } else {
        liked = true
    }

    // 查询最新点赞数
    var count int
    database.DB.QueryRow(
        `SELECT COUNT(1) FROM reply_likes WHERE reply_id = ?`, replyID,
    ).Scan(&count)

    utils.Success(c, gin.H{
        "liked":     liked,
        "likeCount": count,
    })
}
```

---

### 3.3 Handler 层：修改 `GetDiscussionDetail`，携带点赞信息

**文件**: [backend/handlers/discussions.go](backend/handlers/discussions.go)

在 `GetDiscussionDetail` 内查询回复列表的 SQL 改为：

```sql
SELECT
    r.id, r.discussion_id, r.content,
    r.author_id, u.username, u.avatar_url,
    r.created_at, r.updated_at,
    COUNT(l.id)                                    AS like_count,
    MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS is_liked
FROM discussion_replies r
LEFT JOIN users u ON u.id = r.author_id
LEFT JOIN reply_likes l ON l.reply_id = r.id
WHERE r.discussion_id = ?
GROUP BY r.id
ORDER BY r.created_at ASC
```

> 参数顺序：`currentUserID, discussionID`

Scan 时同步读取 `LikeCount` 和 `IsLiked`（int→bool）。

---

### 3.4 路由注册

**文件**: [backend/main.go](backend/main.go)

在 `discussions` 路由组中追加一行：

```go
discussions.POST("/:id/replies/:rid/like", handlers.LikeReply)  // 点赞/取消点赞
```

---

## 四、前端变更

### 4.1 类型定义 & Service

**文件**: [frontend/src/services/discussionService.ts](frontend/src/services/discussionService.ts)

**Step 1** — 更新 `DiscussionReply` 接口：

```ts
export interface DiscussionReply {
  id: number
  content: string
  createdAt: string
  user: {
    id: number
    username: string
    avatarUrl?: string
  }
  likeCount: number   // 新增
  isLiked: boolean    // 新增
}
```

**Step 2** — 在 `DiscussionService` 类中追加方法：

```ts
// 点赞 / 取消点赞回复
async likeReply(
  discussionId: number,
  replyId: number
): Promise<{ liked: boolean; likeCount: number }> {
  const response = await api.post(
    `/discussions/${discussionId}/replies/${replyId}/like`
  )
  return response
}
```

---

### 4.2 UI 组件

**文件**: [frontend/src/pages/student/DiscussionDetailPage.tsx](frontend/src/pages/student/DiscussionDetailPage.tsx)
**文件**: [frontend/src/pages/shared/DiscussionDetailPage.tsx](frontend/src/pages/shared/DiscussionDetailPage.tsx)

**Step 1** — 新增导入：

```tsx
import { LikeOutlined, LikeFilled } from '@ant-design/icons'
```

**Step 2** — 添加点赞处理函数：

```tsx
const handleLike = async (reply: DiscussionReply) => {
  if (!currentUser) {
    message.warning('请先登录')
    return
  }
  try {
    const result = await discussionService.likeReply(
      parseInt(id!), reply.id
    )
    // Optimistic Update：本地直接更新，无需重新拉取整个详情
    setDiscussion(prev => prev ? {
      ...prev,
      replies: prev.replies.map(r =>
        r.id === reply.id
          ? { ...r, isLiked: result.liked, likeCount: result.likeCount }
          : r
      )
    } : null)
  } catch {
    message.error('操作失败，请重试')
  }
}
```

**Step 3** — 在回复列表每项末尾添加点赞按钮：

```tsx
<Button
  type="text"
  size="small"
  icon={reply.isLiked ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
  onClick={() => handleLike(reply)}
>
  {reply.likeCount > 0 ? reply.likeCount : '点赞'}
</Button>
```

---

## 五、完整改动文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| [backend/database/schema.sql](backend/database/schema.sql) | 新增 | 新增 `reply_likes` 表及索引 |
| [backend/models/models.go](backend/models/models.go) | 修改 | `DiscussionReply` 新增 `LikeCount`/`IsLiked` |
| [backend/handlers/discussions.go](backend/handlers/discussions.go) | 修改 | 新增 `LikeReply`；修改 `GetDiscussionDetail` 查询 |
| [backend/main.go](backend/main.go) | 修改 | 注册 `POST /:id/replies/:rid/like` 路由 |
| [frontend/src/services/discussionService.ts](frontend/src/services/discussionService.ts) | 修改 | 更新 `DiscussionReply` 类型；新增 `likeReply()` |
| [frontend/src/pages/student/DiscussionDetailPage.tsx](frontend/src/pages/student/DiscussionDetailPage.tsx) | 修改 | 添加点赞按钮 UI 及 `handleLike` 逻辑 |
| [frontend/src/pages/shared/DiscussionDetailPage.tsx](frontend/src/pages/shared/DiscussionDetailPage.tsx) | 修改 | 同上（教师端共用详情页） |

**共涉及 7 个文件**，无需新建文件。

---

## 六、API 约定

**接口**: `POST /api/v1/discussions/:id/replies/:rid/like`

- **需要认证**: 是（Bearer Token）
- **成功响应**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "liked": true,
      "likeCount": 13
    }
  }
  ```
- **错误响应**:
  - `401` — 未登录
  - `404` — 回复不存在

---

## 七、实现顺序

1. `schema.sql` — 追加建表 DDL
2. `models.go` — 更新结构体
3. `discussions.go` — 修改 GetDiscussionDetail 查询 + 新增 LikeReply
4. `main.go` — 注册路由
5. 重启后端，curl 验证接口
6. `discussionService.ts` — 更新类型和方法
7. `DiscussionDetailPage.tsx`（student + shared）— 添加 UI
8. 前端联调验证

---

*计划文档生成时间: 2026-02-27*

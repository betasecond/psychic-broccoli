-- 社交化功能增强：点赞、收藏、热度、索引
-- [WeiYan Strike] 子午谷奇袭

-- 1. 为讨论表增加 浏览量(views), 点赞数(likes), 热度分(heat_score)
ALTER TABLE discussions ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE discussions ADD COLUMN likes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE discussions ADD COLUMN heat_score REAL NOT NULL DEFAULT 0.0;

-- 2. 为回复表增加 收藏数(fav_count) (likes 已经在 handlers 逻辑中通过关联表处理，但为了原子更新性能，建议冗余字段)
ALTER TABLE discussion_replies ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE discussion_replies ADD COLUMN fav_count INTEGER NOT NULL DEFAULT 0;

-- 3. 创建回复收藏表
CREATE TABLE IF NOT EXISTS reply_favorites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    reply_id    INTEGER NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reply_id, user_id)
);

-- 4. 建立索引加速查询
CREATE INDEX IF NOT EXISTS idx_reply_favorites_reply_id ON reply_favorites(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_favorites_user_id  ON reply_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_heat_score ON discussions(heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_course_id_heat ON discussions(course_id, heat_score DESC);

-- 5. 初始化历史数据热度 (可选)
UPDATE discussions SET heat_score = (views*0.2 + likes*0.5 + replies*0.8) / 2.0;

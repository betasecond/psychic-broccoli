package handlers

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/online-education-platform/backend/database"

	"github.com/gin-gonic/gin"
)

// GetLiveMessages 获取直播聊天消息
func GetLiveMessages(c *gin.Context) {
	liveID := c.Param("id")
	since := c.Query("since") // 获取此时间之后的消息（用于轮询增量获取）

	query := `
		SELECT m.id, m.content, m.created_at,
			   u.id as user_id, u.username, u.avatar_url
		FROM live_messages m
		JOIN users u ON m.user_id = u.id
		WHERE m.live_session_id = ?
	`

	args := []interface{}{liveID}

	if since != "" {
		query += " AND m.created_at > ?"
		args = append(args, since)
	}

	query += " ORDER BY m.created_at DESC LIMIT 50"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "查询消息失败"})
		return
	}
	defer rows.Close()

	messages := []map[string]interface{}{}
	for rows.Next() {
		var msg struct {
			ID        int64
			Content   string
			CreatedAt time.Time
			UserID    int64
			Username  string
			AvatarURL sql.NullString
		}

		err := rows.Scan(&msg.ID, &msg.Content, &msg.CreatedAt,
			&msg.UserID, &msg.Username, &msg.AvatarURL)
		if err != nil {
			continue
		}

		avatarURL := ""
		if msg.AvatarURL.Valid {
			avatarURL = msg.AvatarURL.String
		}

		messages = append(messages, map[string]interface{}{
			"id":        msg.ID,
			"content":   msg.Content,
			"createdAt": msg.CreatedAt.Format(time.RFC3339),
			"user": map[string]interface{}{
				"id":        msg.UserID,
				"username":  msg.Username,
				"avatarUrl": avatarURL,
			},
		})
	}

	c.JSON(200, messages)
}

// SendLiveMessage 发送直播聊天消息
func SendLiveMessage(c *gin.Context) {
	liveID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "参数错误"})
		return
	}

	// 验证消息内容不能为空
	if len(req.Content) == 0 || len(req.Content) > 500 {
		c.JSON(400, gin.H{"error": "消息长度必须在1-500字符之间"})
		return
	}

	// 验证直播是否存在且状态为 LIVE
	var status string
	err := database.DB.QueryRow(
		"SELECT status FROM live_sessions WHERE id = ?",
		liveID,
	).Scan(&status)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "直播不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询直播失败"})
		return
	}

	if status != "LIVE" {
		c.JSON(400, gin.H{"error": "直播未开始或已结束"})
		return
	}

	// 插入消息
	result, err := database.DB.Exec(`
		INSERT INTO live_messages (live_session_id, user_id, content)
		VALUES (?, ?, ?)
	`, liveID, userID, req.Content)

	if err != nil {
		c.JSON(500, gin.H{"error": "发送消息失败"})
		return
	}

	messageID, _ := result.LastInsertId()

	// 返回新消息的信息
	var username string
	var avatarURL sql.NullString
	database.DB.QueryRow(
		"SELECT username, avatar_url FROM users WHERE id = ?",
		userID,
	).Scan(&username, &avatarURL)

	avatar := ""
	if avatarURL.Valid {
		avatar = avatarURL.String
	}

	c.JSON(200, gin.H{
		"id":        messageID,
		"content":   req.Content,
		"createdAt": time.Now().Format(time.RFC3339),
		"user": map[string]interface{}{
			"id":        userID,
			"username":  username,
			"avatarUrl": avatar,
		},
	})
}

// GetLiveMessageCount 获取直播消息数量
func GetLiveMessageCount(c *gin.Context) {
	liveID := c.Param("id")

	var count int
	err := database.DB.QueryRow(
		"SELECT COUNT(*) FROM live_messages WHERE live_session_id = ?",
		liveID,
	).Scan(&count)

	if err != nil {
		c.JSON(500, gin.H{"error": "查询失败"})
		return
	}

	c.JSON(200, gin.H{"count": count})
}

// DeleteLiveMessage 删除直播消息（仅讲师和消息发送者可删除）
func DeleteLiveMessage(c *gin.Context) {
	liveID := c.Param("id")
	messageIDStr := c.Param("messageId")
	messageID, err := strconv.ParseInt(messageIDStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"error": "无效的消息ID"})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	role, _ := c.Get("role")

	// 查询消息是否存在以及发送者
	var msgUserID int64
	var instructorID int64
	err = database.DB.QueryRow(`
		SELECT m.user_id, ls.instructor_id
		FROM live_messages m
		JOIN live_sessions ls ON m.live_session_id = ls.id
		WHERE m.id = ? AND m.live_session_id = ?
	`, messageID, liveID).Scan(&msgUserID, &instructorID)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "消息不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询消息失败"})
		return
	}

	// 验证权限：消息发送者、直播讲师或管理员可以删除
	if msgUserID != userID.(int64) && instructorID != userID.(int64) && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "无权删除此消息"})
		return
	}

	// 删除消息
	_, err = database.DB.Exec("DELETE FROM live_messages WHERE id = ?", messageID)
	if err != nil {
		c.JSON(500, gin.H{"error": "删除消息失败"})
		return
	}

	c.JSON(200, gin.H{"message": "消息已删除"})
}

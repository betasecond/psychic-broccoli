package handlers

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/online-education-platform/backend/database"

	"github.com/gin-gonic/gin"
)

// CreateDiscussion 创建讨论
func CreateDiscussion(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	var req struct {
		CourseID int64  `json:"courseId" binding:"required"`
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "参数错误"})
		return
	}

	// 验证课程是否存在
	var courseTitle string
	err := database.DB.QueryRow(
		"SELECT title FROM courses WHERE id = ?",
		req.CourseID,
	).Scan(&courseTitle)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "课程不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询课程失败"})
		return
	}

	// 验证用户是否已选课（学生）或者是讲师/管理员
	role, _ := c.Get("role")
	if role == "STUDENT" {
		var enrolled int
		database.DB.QueryRow(
			"SELECT COUNT(*) FROM course_enrollments WHERE course_id = ? AND student_id = ?",
			req.CourseID, userID,
		).Scan(&enrolled)

		if enrolled == 0 {
			c.JSON(403, gin.H{"error": "您未选修此课程，无法发起讨论"})
			return
		}
	}

	// 获取用户名
	var username string
	database.DB.QueryRow(
		"SELECT username FROM users WHERE id = ?",
		userID,
	).Scan(&username)

	// 插入讨论
	result, err := database.DB.Exec(`
		INSERT INTO discussions (course_id, user_id, title, content, course, author, status, replies, last_reply)
		VALUES (?, ?, ?, ?, ?, ?, 'OPEN', 0, datetime('now'))
	`, req.CourseID, userID, req.Title, req.Content, courseTitle, username)

	if err != nil {
		c.JSON(500, gin.H{"error": "创建讨论失败"})
		return
	}

	discussionID, _ := result.LastInsertId()

	c.JSON(200, gin.H{
		"id":      discussionID,
		"message": "讨论创建成功",
	})
}

// GetDiscussions 获取讨论列表
func GetDiscussions(c *gin.Context) {
	courseID := c.Query("courseId")
	status := c.Query("status")
	keyword := c.Query("keyword")

	query := `
		SELECT d.id, d.title, d.content, d.status, d.replies, d.created_at,
			   d.course_id, c.title as course_title,
			   d.user_id, u.username, u.avatar_url
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		LEFT JOIN users u ON d.user_id = u.id
		WHERE 1=1
	`

	args := []interface{}{}

	if courseID != "" {
		query += " AND d.course_id = ?"
		args = append(args, courseID)
	}

	if status != "" {
		query += " AND d.status = ?"
		args = append(args, status)
	}

	if keyword != "" {
		query += " AND (d.title LIKE ? OR d.content LIKE ?)"
		args = append(args, "%"+keyword+"%", "%"+keyword+"%")
	}

	query += " ORDER BY d.created_at DESC LIMIT 50"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "查询讨论列表失败"})
		return
	}
	defer rows.Close()

	discussions := []map[string]interface{}{}
	for rows.Next() {
		var d struct {
			ID          int64
			Title       string
			Content     sql.NullString
			Status      string
			Replies     int
			CreatedAt   time.Time
			CourseID    sql.NullInt64
			CourseTitle sql.NullString
			UserID      sql.NullInt64
			Username    sql.NullString
			AvatarURL   sql.NullString
		}

		err := rows.Scan(&d.ID, &d.Title, &d.Content, &d.Status, &d.Replies, &d.CreatedAt,
			&d.CourseID, &d.CourseTitle, &d.UserID, &d.Username, &d.AvatarURL)
		if err != nil {
			continue
		}

		discussionData := map[string]interface{}{
			"id":        d.ID,
			"title":     d.Title,
			"status":    d.Status,
			"replyCount": d.Replies,
			"createdAt": d.CreatedAt.Format(time.RFC3339),
		}

		if d.Content.Valid {
			discussionData["content"] = d.Content.String
		}

		if d.CourseID.Valid && d.CourseTitle.Valid {
			discussionData["course"] = map[string]interface{}{
				"id":    d.CourseID.Int64,
				"title": d.CourseTitle.String,
			}
		}

		if d.UserID.Valid && d.Username.Valid {
			author := map[string]interface{}{
				"id":       d.UserID.Int64,
				"username": d.Username.String,
			}
			if d.AvatarURL.Valid {
				author["avatarUrl"] = d.AvatarURL.String
			}
			discussionData["author"] = author
		}

		discussions = append(discussions, discussionData)
	}

	c.JSON(200, discussions)
}

// GetDiscussionDetail 获取讨论详情
func GetDiscussionDetail(c *gin.Context) {
	discussionID := c.Param("id")

	// 查询讨论基本信息
	query := `
		SELECT d.id, d.title, d.content, d.status, d.replies, d.created_at,
			   d.course_id, c.title as course_title,
			   d.user_id, u.username, u.avatar_url
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		LEFT JOIN users u ON d.user_id = u.id
		WHERE d.id = ?
	`

	var d struct {
		ID          int64
		Title       string
		Content     sql.NullString
		Status      string
		Replies     int
		CreatedAt   time.Time
		CourseID    sql.NullInt64
		CourseTitle sql.NullString
		UserID      sql.NullInt64
		Username    sql.NullString
		AvatarURL   sql.NullString
	}

	err := database.DB.QueryRow(query, discussionID).Scan(
		&d.ID, &d.Title, &d.Content, &d.Status, &d.Replies, &d.CreatedAt,
		&d.CourseID, &d.CourseTitle, &d.UserID, &d.Username, &d.AvatarURL)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "讨论不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询讨论失败"})
		return
	}

	discussionData := map[string]interface{}{
		"id":        d.ID,
		"title":     d.Title,
		"status":    d.Status,
		"replyCount": d.Replies,
		"createdAt": d.CreatedAt.Format(time.RFC3339),
	}

	if d.Content.Valid {
		discussionData["content"] = d.Content.String
	}

	if d.CourseID.Valid && d.CourseTitle.Valid {
		discussionData["course"] = map[string]interface{}{
			"id":    d.CourseID.Int64,
			"title": d.CourseTitle.String,
		}
	}

	if d.UserID.Valid && d.Username.Valid {
		author := map[string]interface{}{
			"id":       d.UserID.Int64,
			"username": d.Username.String,
		}
		if d.AvatarURL.Valid {
			author["avatarUrl"] = d.AvatarURL.String
		}
		discussionData["author"] = author
	}

	// 查询回复列表
	repliesQuery := `
		SELECT r.id, r.content, r.created_at,
			   u.id as user_id, u.username, u.avatar_url
		FROM discussion_replies r
		JOIN users u ON r.user_id = u.id
		WHERE r.discussion_id = ?
		ORDER BY r.created_at ASC
	`

	repliesRows, err := database.DB.Query(repliesQuery, discussionID)
	if err == nil {
		defer repliesRows.Close()

		replies := []map[string]interface{}{}
		for repliesRows.Next() {
			var reply struct {
				ID        int64
				Content   string
				CreatedAt time.Time
				UserID    int64
				Username  string
				AvatarURL sql.NullString
			}

			err := repliesRows.Scan(&reply.ID, &reply.Content, &reply.CreatedAt,
				&reply.UserID, &reply.Username, &reply.AvatarURL)
			if err != nil {
				continue
			}

			replyData := map[string]interface{}{
				"id":        reply.ID,
				"content":   reply.Content,
				"createdAt": reply.CreatedAt.Format(time.RFC3339),
				"user": map[string]interface{}{
					"id":       reply.UserID,
					"username": reply.Username,
				},
			}

			if reply.AvatarURL.Valid {
				replyData["user"].(map[string]interface{})["avatarUrl"] = reply.AvatarURL.String
			}

			replies = append(replies, replyData)
		}

		discussionData["replies"] = replies
	}

	c.JSON(200, discussionData)
}

// ReplyDiscussion 回复讨论
func ReplyDiscussion(c *gin.Context) {
	discussionIDStr := c.Param("id")
	discussionID, err := strconv.ParseInt(discussionIDStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"error": "无效的讨论ID"})
		return
	}

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

	// 验证讨论是否存在
	var status string
	var courseID int64
	err = database.DB.QueryRow(
		"SELECT status, course_id FROM discussions WHERE id = ?",
		discussionID,
	).Scan(&status, &courseID)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "讨论不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询讨论失败"})
		return
	}

	if status == "CLOSED" {
		c.JSON(400, gin.H{"error": "讨论已关闭，无法回复"})
		return
	}

	// 验证用户是否已选课（学生）或者是讲师/管理员
	role, _ := c.Get("role")
	if role == "STUDENT" {
		var enrolled int
		database.DB.QueryRow(
			"SELECT COUNT(*) FROM course_enrollments WHERE course_id = ? AND student_id = ?",
			courseID, userID,
		).Scan(&enrolled)

		if enrolled == 0 {
			c.JSON(403, gin.H{"error": "您未选修此课程，无法回复讨论"})
			return
		}
	}

	// 插入回复
	result, err := database.DB.Exec(`
		INSERT INTO discussion_replies (discussion_id, user_id, content)
		VALUES (?, ?, ?)
	`, discussionID, userID, req.Content)

	if err != nil {
		c.JSON(500, gin.H{"error": "发表回复失败"})
		return
	}

	// 更新讨论的回复数和最后回复时间
	database.DB.Exec(`
		UPDATE discussions
		SET replies = replies + 1, last_reply = datetime('now')
		WHERE id = ?
	`, discussionID)

	replyID, _ := result.LastInsertId()

	// 获取用户信息
	var username string
	var avatarURL sql.NullString
	database.DB.QueryRow(
		"SELECT username, avatar_url FROM users WHERE id = ?",
		userID,
	).Scan(&username, &avatarURL)

	replyData := map[string]interface{}{
		"id":        replyID,
		"content":   req.Content,
		"createdAt": time.Now().Format(time.RFC3339),
		"user": map[string]interface{}{
			"id":       userID,
			"username": username,
		},
	}

	if avatarURL.Valid {
		replyData["user"].(map[string]interface{})["avatarUrl"] = avatarURL.String
	}

	c.JSON(200, replyData)
}

// CloseDiscussion 关闭讨论（只有讨论发起人、讲师或管理员可以关闭）
func CloseDiscussion(c *gin.Context) {
	discussionID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	role, _ := c.Get("role")

	// 查询讨论信息
	var authorID int64
	var courseID int64
	var instructorID int64
	err := database.DB.QueryRow(`
		SELECT d.user_id, d.course_id, c.instructor_id
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		WHERE d.id = ?
	`, discussionID).Scan(&authorID, &courseID, &instructorID)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "讨论不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询讨论失败"})
		return
	}

	// 验证权限
	if authorID != userID.(int64) && instructorID != userID.(int64) && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "无权关闭此讨论"})
		return
	}

	// 关闭讨论
	_, err = database.DB.Exec(
		"UPDATE discussions SET status = 'CLOSED' WHERE id = ?",
		discussionID,
	)

	if err != nil {
		c.JSON(500, gin.H{"error": "关闭讨论失败"})
		return
	}

	c.JSON(200, gin.H{"message": "讨论已关闭"})
}

// DeleteDiscussion 删除讨论（讨论发起人、课程教师或管理员可以删除）
func DeleteDiscussion(c *gin.Context) {
	discussionID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	role, _ := c.Get("role")

	// 查询讨论信息（同时获取课程教师ID）
	var authorID int64
	var instructorID sql.NullInt64
	err := database.DB.QueryRow(`
		SELECT d.user_id, c.instructor_id
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		WHERE d.id = ?
	`, discussionID).Scan(&authorID, &instructorID)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "讨论不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询讨论失败"})
		return
	}

	// 验证权限：发起人、课程教师或管理员可删除
	isCourseInstructor := instructorID.Valid && instructorID.Int64 == userID.(int64)
	if authorID != userID.(int64) && !isCourseInstructor && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "无权删除此讨论"})
		return
	}

	// 删除讨论（级联删除回复）
	_, err = database.DB.Exec("DELETE FROM discussions WHERE id = ?", discussionID)
	if err != nil {
		c.JSON(500, gin.H{"error": "删除讨论失败"})
		return
	}

	c.JSON(200, gin.H{"message": "讨论已删除"})
}

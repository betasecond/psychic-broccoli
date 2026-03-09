package handlers

import (
	"database/sql"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/middleware"
	"github.com/online-education-platform/backend/utils"
	"go.uber.org/zap"
)

// normalizeStatus 将 DB 中存储的小写 status 归一化为前端期望的大写值
func normalizeStatus(s string) string {
	switch s {
	case "active":
		return "OPEN"
	case "closed":
		return "CLOSED"
	default:
		return s
	}
}

// CreateDiscussion 创建讨论
func CreateDiscussion(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未授权")
		return
	}

	var req struct {
		CourseID int64  `json:"courseId" binding:"required"`
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	// 验证课程是否存在
	var courseTitle string
	err := database.DB.QueryRow(
		"SELECT title FROM courses WHERE id = ?",
		req.CourseID,
	).Scan(&courseTitle)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "课程不存在")
		return
	} else if err != nil {
		utils.GetLogger().Error("查询课程失败", zap.Error(err))
		utils.InternalServerError(c, "查询课程失败")
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
			utils.Forbidden(c, "您未选修此课程，无法发起讨论")
			return
		}
	}

	// 获取用户名
	var username string
	database.DB.QueryRow(
		"SELECT username FROM users WHERE id = ?",
		userID,
	).Scan(&username)

	// 插入讨论（schema 中 status CHECK('active','closed')）
	result, err := database.DB.Exec(`
		INSERT INTO discussions (course_id, author_id, title, content, status, replies)
		VALUES (?, ?, ?, ?, 'active', 0)
	`, req.CourseID, userID, req.Title, req.Content)

	if err != nil {
		utils.GetLogger().Error("创建讨论失败", zap.Error(err))
		utils.InternalServerError(c, "创建讨论失败")
		return
	}

	discussionID, _ := result.LastInsertId()

	// Async AI Analysis [WeiYan Strike]
	middleware.AnalyzeDiscussionAsync(req.Title, req.Content, discussionID)

	utils.Success(c, gin.H{
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
			   d.author_id, u.username, u.avatar_url
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		LEFT JOIN users u ON d.author_id = u.id
		WHERE 1=1
	`

	args := []interface{}{}

	if courseID != "" {
		query += " AND d.course_id = ?"
		args = append(args, courseID)
	}

	if status != "" {
		// 前端传 OPEN/CLOSED，DB 存 active/closed
		dbStatus := status
		if status == "OPEN" {
			dbStatus = "active"
		} else if status == "CLOSED" {
			dbStatus = "closed"
		}
		query += " AND d.status = ?"
		args = append(args, dbStatus)
	}

	if keyword != "" {
		query += " AND (d.title LIKE ? OR d.content LIKE ?)"
		args = append(args, "%"+keyword+"%", "%"+keyword+"%")
	}

	query += " ORDER BY d.created_at DESC LIMIT 50"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		utils.GetLogger().Error("查询讨论列表失败", zap.Error(err))
		utils.InternalServerError(c, "查询讨论列表失败")
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
			"id":         d.ID,
			"title":      d.Title,
			"status":     normalizeStatus(d.Status),
			"replyCount": d.Replies,
			"createdAt":  d.CreatedAt.Format(time.RFC3339),
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

	utils.Success(c, discussions)
}

// GetDiscussionDetail 获取讨论详情
func GetDiscussionDetail(c *gin.Context) {
	discussionID := c.Param("id")
	currentUserID, _ := c.Get("userID")

	// 查询讨论基本信息
	query := `
		SELECT d.id, d.title, d.content, d.status, d.replies, d.created_at,
			   d.course_id, c.title as course_title,
			   d.author_id, u.username, u.avatar_url
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		LEFT JOIN users u ON d.author_id = u.id
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
		utils.NotFound(c, "讨论不存在")
		return
	} else if err != nil {
		utils.GetLogger().Error("查询讨论失败", zap.Error(err))
		utils.InternalServerError(c, "查询讨论失败")
		return
	}

	discussionData := map[string]interface{}{
		"id":         d.ID,
		"title":      d.Title,
		"status":     normalizeStatus(d.Status),
		"replyCount": d.Replies,
		"createdAt":  d.CreatedAt.Format(time.RFC3339),
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

	// 查询回复列表（含点赞数和当前用户是否已点赞）
	repliesQuery := `
		SELECT r.id, r.content, r.created_at,
			   u.id as user_id, u.username, u.avatar_url,
			   COUNT(l.id) AS like_count,
			   MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS is_liked
		FROM discussion_replies r
		JOIN users u ON r.author_id = u.id
		LEFT JOIN reply_likes l ON l.reply_id = r.id
		WHERE r.discussion_id = ?
		GROUP BY r.id
		ORDER BY r.created_at ASC
	`

	repliesRows, err := database.DB.Query(repliesQuery, currentUserID, discussionID)
	if err != nil {
		utils.GetLogger().Warn("查询回复列表失败，返回空列表", zap.Error(err))
		discussionData["replies"] = []map[string]interface{}{}
	} else {
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
				LikeCount int
				IsLiked   int
			}

			err := repliesRows.Scan(&reply.ID, &reply.Content, &reply.CreatedAt,
				&reply.UserID, &reply.Username, &reply.AvatarURL,
				&reply.LikeCount, &reply.IsLiked)
			if err != nil {
				continue
			}

			replyData := map[string]interface{}{
				"id":        reply.ID,
				"content":   reply.Content,
				"createdAt": reply.CreatedAt.Format(time.RFC3339),
				"likeCount": reply.LikeCount,
				"isLiked":   reply.IsLiked == 1,
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

	utils.Success(c, discussionData)
}

// ReplyDiscussion 回复讨论
func ReplyDiscussion(c *gin.Context) {
	discussionIDStr := c.Param("id")
	discussionID, err := strconv.ParseInt(discussionIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的讨论ID")
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未授权")
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
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
		utils.NotFound(c, "讨论不存在")
		return
	} else if err != nil {
		utils.GetLogger().Error("查询讨论失败", zap.Error(err))
		utils.InternalServerError(c, "查询讨论失败")
		return
	}

	if status == "closed" {
		utils.BadRequest(c, "讨论已关闭，无法回复")
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
			utils.Forbidden(c, "您未选修此课程，无法回复讨论")
			return
		}
	}

	// 插入回复
	result, err := database.DB.Exec(`
		INSERT INTO discussion_replies (discussion_id, author_id, content)
		VALUES (?, ?, ?)
	`, discussionID, userID, req.Content)

	if err != nil {
		utils.GetLogger().Error("发表回复失败", zap.Error(err))
		utils.InternalServerError(c, "发表回复失败")
		return
	}

	// 更新讨论的回复数和最后回复时间
	database.DB.Exec(`
		UPDATE discussions
		SET replies = replies + 1, last_reply_at = datetime('now')
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
		"likeCount": 0,
		"isLiked":   false,
		"user": map[string]interface{}{
			"id":       userID,
			"username": username,
		},
	}

	if avatarURL.Valid {
		replyData["user"].(map[string]interface{})["avatarUrl"] = avatarURL.String
	}

	utils.Success(c, replyData)
}

// CloseDiscussion 关闭讨论（只有讨论发起人、讲师或管理员可以关闭）
func CloseDiscussion(c *gin.Context) {
	discussionID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未授权")
		return
	}

	role, _ := c.Get("role")

	// 查询讨论信息
	var authorID int64
	var courseID int64
	var instructorID int64
	err := database.DB.QueryRow(`
		SELECT d.author_id, d.course_id, c.instructor_id
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		WHERE d.id = ?
	`, discussionID).Scan(&authorID, &courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "讨论不存在")
		return
	} else if err != nil {
		utils.GetLogger().Error("查询讨论失败", zap.Error(err))
		utils.InternalServerError(c, "查询讨论失败")
		return
	}

	// 验证权限
	if authorID != userID.(int64) && instructorID != userID.(int64) && role != "ADMIN" {
		utils.Forbidden(c, "无权关闭此讨论")
		return
	}

	// 关闭讨论
	_, err = database.DB.Exec(
		"UPDATE discussions SET status = 'closed' WHERE id = ?",
		discussionID,
	)

	if err != nil {
		utils.GetLogger().Error("关闭讨论失败", zap.Error(err))
		utils.InternalServerError(c, "关闭讨论失败")
		return
	}

	utils.SuccessWithMessage(c, "讨论已关闭", nil)
}

// DeleteDiscussion 删除讨论（讨论发起人、课程教师或管理员可以删除）
func DeleteDiscussion(c *gin.Context) {
	discussionID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未授权")
		return
	}

	role, _ := c.Get("role")

	// 查询讨论信息（同时获取课程教师ID）
	var authorID int64
	var instructorID sql.NullInt64
	err := database.DB.QueryRow(`
		SELECT d.author_id, c.instructor_id
		FROM discussions d
		LEFT JOIN courses c ON d.course_id = c.id
		WHERE d.id = ?
	`, discussionID).Scan(&authorID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "讨论不存在")
		return
	} else if err != nil {
		utils.GetLogger().Error("查询讨论失败", zap.Error(err))
		utils.InternalServerError(c, "查询讨论失败")
		return
	}

	// 验证权限：发起人、课程教师或管理员可删除
	isCourseInstructor := instructorID.Valid && instructorID.Int64 == userID.(int64)
	if authorID != userID.(int64) && !isCourseInstructor && role != "ADMIN" {
		utils.Forbidden(c, "无权删除此讨论")
		return
	}

	// 删除讨论（级联删除回复）
	_, err = database.DB.Exec("DELETE FROM discussions WHERE id = ?", discussionID)
	if err != nil {
		utils.GetLogger().Error("删除讨论失败", zap.Error(err))
		utils.InternalServerError(c, "删除讨论失败")
		return
	}

	utils.SuccessWithMessage(c, "讨论已删除", nil)
}

// LikeReply 切换回复点赞状态（点赞/取消点赞）
func LikeReply(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未授权")
		return
	}

	replyID, err := strconv.ParseInt(c.Param("rid"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的回复ID")
		return
	}

	// 验证回复是否存在
	var replyExists int
	database.DB.QueryRow(
		`SELECT COUNT(1) FROM discussion_replies WHERE id = ?`, replyID,
	).Scan(&replyExists)
	if replyExists == 0 {
		utils.NotFound(c, "回复不存在")
		return
	}

	// 尝试插入点赞记录；UNIQUE 冲突则取消点赞
	_, err = database.DB.Exec(
		`INSERT INTO reply_likes (reply_id, user_id) VALUES (?, ?)`,
		replyID, userID,
	)

	liked := true
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			// 已点赞 → 取消点赞
			database.DB.Exec(
				`DELETE FROM reply_likes WHERE reply_id = ? AND user_id = ?`,
				replyID, userID,
			)
			liked = false
		} else {
			// 其他 DB 错误
			utils.GetLogger().Error("点赞操作失败", zap.Error(err))
			utils.InternalServerError(c, "操作失败，请重试")
			return
		}
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

package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/models"
	"github.com/online-education-platform/backend/utils"
)

// GetDiscussions 获取课程讨论列表
func GetDiscussions(c *gin.Context) {
	// 执行查询
	rows, err := database.DB.Query(`
		SELECT d.id, d.title, d.content, d.course_id, c.title as course_title, 
		       d.author_id, u.username as author_name, d.replies, d.last_reply_at, 
		       d.status, d.created_at, d.updated_at
		FROM discussions d
		JOIN users u ON d.author_id = u.id
		JOIN courses c ON d.course_id = c.id
		ORDER BY d.created_at DESC
	`)
	if err != nil {
		utils.InternalServerError(c, "获取讨论失败")
		return
	}
	defer rows.Close()

	// 解析结果
	var discussions []models.Discussion
	for rows.Next() {
		var discussion models.Discussion
		var lastReplyAt *time.Time
		
		if err := rows.Scan(
			&discussion.ID, &discussion.Title, &discussion.Content, &discussion.CourseID,
			&discussion.CourseTitle, &discussion.AuthorID, &discussion.AuthorName,
			&discussion.Replies, &lastReplyAt, &discussion.Status,
			&discussion.CreatedAt, &discussion.UpdatedAt,
		); err != nil {
			utils.InternalServerError(c, "解析讨论失败")
			return
		}
		
		discussion.LastReplyAt = lastReplyAt
		discussions = append(discussions, discussion)
	}

	utils.Success(c, discussions)
}

// GetDiscussion 获取单个讨论详情
func GetDiscussion(c *gin.Context) {
	id := c.Param("id")
	
	// 获取讨论基本信息
	var discussion models.Discussion
	var lastReplyAt *time.Time
	
	err := database.DB.QueryRow(`
		SELECT d.id, d.title, d.content, d.course_id, c.title as course_title, 
		       d.author_id, u.username as author_name, d.replies, d.last_reply_at, 
		       d.status, d.created_at, d.updated_at
		FROM discussions d
		JOIN users u ON d.author_id = u.id
		JOIN courses c ON d.course_id = c.id
		WHERE d.id = ?
	`, id).Scan(
		&discussion.ID, &discussion.Title, &discussion.Content, &discussion.CourseID,
		&discussion.CourseTitle, &discussion.AuthorID, &discussion.AuthorName,
		&discussion.Replies, &lastReplyAt, &discussion.Status,
		&discussion.CreatedAt, &discussion.UpdatedAt,
	)
	if err != nil {
		utils.NotFoundError(c, "讨论不存在")
		return
	}
	
	discussion.LastReplyAt = lastReplyAt
	
	// 获取讨论回复
	rows, err := database.DB.Query(`
		SELECT dr.id, dr.discussion_id, dr.content, dr.author_id, 
		       u.username as author_name, dr.created_at, dr.updated_at
		FROM discussion_replies dr
		JOIN users u ON dr.author_id = u.id
		WHERE dr.discussion_id = ?
		ORDER BY dr.created_at ASC
	`, id)
	if err != nil {
		utils.InternalServerError(c, "获取讨论回复失败")
		return
	}
	defer rows.Close()
	
	var replies []models.DiscussionReply
	for rows.Next() {
		var reply models.DiscussionReply
		if err := rows.Scan(
			&reply.ID, &reply.DiscussionID, &reply.Content, &reply.AuthorID,
			&reply.AuthorName, &reply.CreatedAt, &reply.UpdatedAt,
		); err != nil {
			utils.InternalServerError(c, "解析讨论回复失败")
			return
		}
		replies = append(replies, reply)
	}
	
	discussion.RepliesList = replies
	
	utils.Success(c, discussion)
}

// CreateDiscussion 创建新讨论
func CreateDiscussion(c *gin.Context) {
	var req struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		CourseID int64  `json:"courseId" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}
	
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedError(c, "未授权")
		return
	}
	
	// 插入讨论
	result, err := database.DB.Exec(`
		INSERT INTO discussions (title, content, course_id, author_id)
		VALUES (?, ?, ?, ?)
	`, req.Title, req.Content, req.CourseID, userID)
	if err != nil {
		utils.InternalServerError(c, "创建讨论失败")
		return
	}
	
	// 获取新创建的讨论ID
	discussionID, err := result.LastInsertId()
	if err != nil {
		utils.InternalServerError(c, "获取讨论ID失败")
		return
	}
	
	// 返回新创建的讨论
	var discussion models.Discussion
	discussion.ID = discussionID
	discussion.Title = req.Title
	discussion.Content = req.Content
	discussion.CourseID = req.CourseID
	discussion.AuthorID = userID.(int64)
	discussion.Replies = 0
	discussion.Status = "active"
	discussion.CreatedAt = time.Now()
	discussion.UpdatedAt = time.Now()
	
	utils.SuccessWithCode(c, http.StatusCreated, discussion)
}

// UpdateDiscussion 更新讨论
func UpdateDiscussion(c *gin.Context) {
	id := c.Param("id")
	
	var req struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
		Status  string `json:"status" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}
	
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedError(c, "未授权")
		return
	}
	
	// 检查讨论是否存在且当前用户是作者
	var authorID int64
	err := database.DB.QueryRow(`
		SELECT author_id FROM discussions WHERE id = ?
	`, id).Scan(&authorID)
	if err != nil {
		utils.NotFoundError(c, "讨论不存在")
		return
	}
	
	if authorID != userID.(int64) {
		utils.ForbiddenError(c, "没有权限修改此讨论")
		return
	}
	
	// 更新讨论
	_, err = database.DB.Exec(`
		UPDATE discussions SET title = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Title, req.Content, req.Status, id)
	if err != nil {
		utils.InternalServerError(c, "更新讨论失败")
		return
	}
	
	utils.Success(c, gin.H{"message": "讨论更新成功"})
}

// DeleteDiscussion 删除讨论
func DeleteDiscussion(c *gin.Context) {
	id := c.Param("id")
	
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedError(c, "未授权")
		return
	}
	
	// 检查讨论是否存在且当前用户是作者
	var authorID int64
	err := database.DB.QueryRow(`
		SELECT author_id FROM discussions WHERE id = ?
	`, id).Scan(&authorID)
	if err != nil {
		utils.NotFoundError(c, "讨论不存在")
		return
	}
	
	if authorID != userID.(int64) {
		utils.ForbiddenError(c, "没有权限删除此讨论")
		return
	}
	
	// 删除讨论
	_, err = database.DB.Exec(`
		DELETE FROM discussions WHERE id = ?
	`, id)
	if err != nil {
		utils.InternalServerError(c, "删除讨论失败")
		return
	}
	
	utils.Success(c, gin.H{"message": "讨论删除成功"})
}

// GetDiscussionReplies 获取讨论回复列表
func GetDiscussionReplies(c *gin.Context) {
	discussionID := c.Param("id")
	
	// 执行查询
	rows, err := database.DB.Query(`
		SELECT dr.id, dr.discussion_id, dr.content, dr.author_id, 
		       u.username as author_name, dr.created_at, dr.updated_at
		FROM discussion_replies dr
		JOIN users u ON dr.author_id = u.id
		WHERE dr.discussion_id = ?
		ORDER BY dr.created_at ASC
	`, discussionID)
	if err != nil {
		utils.InternalServerError(c, "获取讨论回复失败")
		return
	}
	defer rows.Close()

	// 解析结果
	var replies []models.DiscussionReply
	for rows.Next() {
		var reply models.DiscussionReply
		if err := rows.Scan(
			&reply.ID, &reply.DiscussionID, &reply.Content, &reply.AuthorID,
			&reply.AuthorName, &reply.CreatedAt, &reply.UpdatedAt,
		); err != nil {
			utils.InternalServerError(c, "解析讨论回复失败")
			return
		}
		replies = append(replies, reply)
	}

	utils.Success(c, replies)
}

// CreateDiscussionReply 回复讨论
func CreateDiscussionReply(c *gin.Context) {
	discussionID := c.Param("id")
	
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}
	
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedError(c, "未授权")
		return
	}
	
	// 开始事务
	tx, err := database.DB.Begin()
	if err != nil {
		utils.InternalServerError(c, "创建回复失败")
		return
	}
	defer func() {
		if err != nil {
			tx.Rollback()
			return
		}
		tx.Commit()
	}()
	
	// 插入回复
	result, err := tx.Exec(`
		INSERT INTO discussion_replies (discussion_id, content, author_id)
		VALUES (?, ?, ?)
	`, discussionID, req.Content, userID)
	if err != nil {
		return
	}
	
	// 更新讨论的回复计数和最后回复时间
	_, err = tx.Exec(`
		UPDATE discussions SET replies = replies + 1, last_reply_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, discussionID)
	if err != nil {
		return
	}
	
	// 获取新创建的回复ID
	replyID, err := result.LastInsertId()
	if err != nil {
		return
	}
	
	// 返回新创建的回复
	var reply models.DiscussionReply
	reply.ID = replyID
	discussionIDInt, _ := strconv.ParseInt(discussionID, 10, 64)
	reply.DiscussionID = discussionIDInt
	reply.Content = req.Content
	reply.AuthorID = userID.(int64)
	reply.CreatedAt = time.Now()
	reply.UpdatedAt = time.Now()
	
	utils.SuccessWithCode(c, http.StatusCreated, reply)
}

// UpdateDiscussionReply 更新回复
func UpdateDiscussionReply(c *gin.Context) {
	id := c.Param("id")
	
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}
	
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedError(c, "未授权")
		return
	}
	
	// 检查回复是否存在且当前用户是作者
	var authorID int64
	err := database.DB.QueryRow(`
		SELECT author_id FROM discussion_replies WHERE id = ?
	`, id).Scan(&authorID)
	if err != nil {
		utils.NotFoundError(c, "回复不存在")
		return
	}
	
	if authorID != userID.(int64) {
		utils.ForbiddenError(c, "没有权限修改此回复")
		return
	}
	
	// 更新回复
	_, err = database.DB.Exec(`
		UPDATE discussion_replies SET content = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Content, id)
	if err != nil {
		utils.InternalServerError(c, "更新回复失败")
		return
	}
	
	utils.Success(c, gin.H{"message": "回复更新成功"})
}

// DeleteDiscussionReply 删除回复
func DeleteDiscussionReply(c *gin.Context) {
	id := c.Param("id")
	
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedError(c, "未授权")
		return
	}
	
	// 开始事务
	tx, err := database.DB.Begin()
	if err != nil {
		utils.InternalServerError(c, "删除回复失败")
		return
	}
	defer func() {
		if err != nil {
			tx.Rollback()
			return
		}
		tx.Commit()
	}()
	
	// 获取回复信息
	var discussionID int64
	var authorID int64
	err = tx.QueryRow(`
		SELECT discussion_id, author_id FROM discussion_replies WHERE id = ?
	`, id).Scan(&discussionID, &authorID)
	if err != nil {
		utils.NotFoundError(c, "回复不存在")
		return
	}
	
	if authorID != userID.(int64) {
		utils.ForbiddenError(c, "没有权限删除此回复")
		return
	}
	
	// 删除回复
	_, err = tx.Exec(`
		DELETE FROM discussion_replies WHERE id = ?
	`, id)
	if err != nil {
		return
	}
	
	// 更新讨论的回复计数
	_, err = tx.Exec(`
		UPDATE discussions SET replies = replies - 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, discussionID)
	if err != nil {
		return
	}
	
	utils.Success(c, gin.H{"message": "回复删除成功"})
}

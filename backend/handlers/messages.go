package handlers

import (
	"database/sql"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/models"
	"github.com/online-education-platform/backend/utils"
)

// GetMessages 获取用户消息列表
func GetMessages(c *gin.Context) {
	// 从上下文获取用户ID（由auth middleware设置）
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未认证用户")
		return
	}

	// 执行查询
	rows, err := database.DB.Query(`
		SELECT id, user_id, title, content, date, type, status, sender, created_at
		FROM messages
		WHERE user_id = ?
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		utils.InternalServerError(c, "获取消息失败")
		return
	}
	defer rows.Close()

	// 解析结果
	var messages []models.Message
	for rows.Next() {
		var msg models.Message
		if err := rows.Scan(
			&msg.ID, &msg.UserID, &msg.Title, &msg.Content,
			&msg.Date, &msg.Type, &msg.Status, &msg.Sender,
			&msg.CreatedAt,
		); err != nil {
			utils.InternalServerError(c, "解析消息失败")
			return
		}
		messages = append(messages, msg)
	}

	utils.Success(c, messages)
}

// MarkMessageStatus 标记消息状态（已读/未读）
func MarkMessageStatus(c *gin.Context) {
	// 从上下文获取用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未认证用户")
		return
	}

	// 获取消息ID
	messageID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的消息ID")
		return
	}

	// 获取请求体
	type StatusRequest struct {
		Status string `json:"status" binding:"required,oneof=read unread"`
	}
	var req StatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 更新消息状态
	result, err := database.DB.Exec(`
		UPDATE messages SET status = ? WHERE id = ? AND user_id = ?
	`, req.Status, messageID, userID)
	if err != nil {
		utils.InternalServerError(c, "更新消息状态失败")
		return
	}

	// 检查是否有行被更新
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		utils.InternalServerError(c, "检查更新结果失败")
		return
	}
	if rowsAffected == 0 {
		utils.NotFound(c, "消息不存在或无权限操作")
		return
	}

	utils.Success(c, gin.H{"message": "消息状态更新成功", "status": req.Status})
}

// DeleteMessage 删除消息
func DeleteMessage(c *gin.Context) {
	// 从上下文获取用户ID
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未认证用户")
		return
	}

	// 获取消息ID
	messageID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的消息ID")
		return
	}

	// 删除消息
	result, err := database.DB.Exec(`
		DELETE FROM messages WHERE id = ? AND user_id = ?
	`, messageID, userID)
	if err != nil {
		utils.InternalServerError(c, "删除消息失败")
		return
	}

	// 检查是否有行被删除
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		utils.InternalServerError(c, "检查删除结果失败")
		return
	}
	if rowsAffected == 0 {
		utils.NotFound(c, "消息不存在或无权限操作")
		return
	}

	utils.Success(c, gin.H{"message": "消息删除成功"})
}

// GetNotifications 获取系统通知列表
func GetNotifications(c *gin.Context) {
	// 执行查询
	rows, err := database.DB.Query(`
		SELECT id, title, content, date, type, created_at
		FROM notifications
		ORDER BY created_at DESC
	`)
	if err != nil {
		utils.InternalServerError(c, "获取通知失败")
		return
	}
	defer rows.Close()

	// 解析结果
	var notifications []models.Notification
	for rows.Next() {
		var notification models.Notification
		if err := rows.Scan(
			&notification.ID, &notification.Title, &notification.Content,
			&notification.Date, &notification.Type, &notification.CreatedAt,
		); err != nil {
			utils.InternalServerError(c, "解析通知失败")
			return
		}
		notifications = append(notifications, notification)
	}

	utils.Success(c, notifications)
}

// GetDiscussions 获取课程讨论列表
func GetDiscussions(c *gin.Context) {
	// 执行查询
	rows, err := database.DB.Query(`
		SELECT id, title, course, author, replies, last_reply, status, created_at
		FROM discussions
		ORDER BY created_at DESC
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
		if err := rows.Scan(
			&discussion.ID, &discussion.Title, &discussion.Course,
			&discussion.Author, &discussion.Replies, &discussion.LastReply,
			&discussion.Status, &discussion.CreatedAt,
		); err != nil {
			utils.InternalServerError(c, "解析讨论失败")
			return
		}
		discussions = append(discussions, discussion)
	}

	utils.Success(c, discussions)
}
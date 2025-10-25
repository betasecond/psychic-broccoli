package handlers

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
)

// UpdateChapter 更新章节
func UpdateChapter(c *gin.Context) {
	chapterID := c.Param("cid")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 检查权限
	var courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT ch.course_id, c.instructor_id
		FROM course_chapters ch
		JOIN courses c ON ch.course_id = c.id
		WHERE ch.id = ?
	`, chapterID).Scan(&courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "章节不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	if role != "ADMIN" && instructorID != userID.(int64) {
		utils.Forbidden(c, "权限不足")
		return
	}

	var req CreateChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	_, err = database.DB.Exec(`
		UPDATE course_chapters 
		SET title = ?, order_index = ?
		WHERE id = ?
	`, req.Title, req.OrderIndex, chapterID)

	if err != nil {
		utils.InternalServerError(c, "更新失败")
		return
	}

	utils.SuccessWithMessage(c, "更新成功", nil)
}

// DeleteChapter 删除章节
func DeleteChapter(c *gin.Context) {
	chapterID := c.Param("cid")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 检查权限
	var courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT ch.course_id, c.instructor_id
		FROM course_chapters ch
		JOIN courses c ON ch.course_id = c.id
		WHERE ch.id = ?
	`, chapterID).Scan(&courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "章节不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	if role != "ADMIN" && instructorID != userID.(int64) {
		utils.Forbidden(c, "权限不足")
		return
	}

	_, err = database.DB.Exec("DELETE FROM course_chapters WHERE id = ?", chapterID)
	if err != nil {
		utils.InternalServerError(c, "删除失败")
		return
	}

	utils.SuccessWithMessage(c, "删除成功", nil)
}


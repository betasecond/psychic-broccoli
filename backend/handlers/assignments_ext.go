package handlers

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
)

// UpdateAssignment 更新作业
func UpdateAssignment(c *gin.Context) {
	assignmentID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 检查权限
	var courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT a.course_id, c.instructor_id
		FROM assignments a
		JOIN courses c ON a.course_id = c.id
		WHERE a.id = ?
	`, assignmentID).Scan(&courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "作业不存在")
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

	var req CreateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	_, err = database.DB.Exec(`
		UPDATE assignments 
		SET title = ?, content = ?, deadline = ?
		WHERE id = ?
	`, req.Title, req.Content, req.Deadline, assignmentID)

	if err != nil {
		utils.InternalServerError(c, "更新失败")
		return
	}

	utils.SuccessWithMessage(c, "更新成功", nil)
}

// DeleteAssignment 删除作业
func DeleteAssignment(c *gin.Context) {
	assignmentID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 检查权限
	var courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT a.course_id, c.instructor_id
		FROM assignments a
		JOIN courses c ON a.course_id = c.id
		WHERE a.id = ?
	`, assignmentID).Scan(&courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "作业不存在")
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

	_, err = database.DB.Exec("DELETE FROM assignments WHERE id = ?", assignmentID)
	if err != nil {
		utils.InternalServerError(c, "删除失败")
		return
	}

	utils.SuccessWithMessage(c, "删除成功", nil)
}


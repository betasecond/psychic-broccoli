package handlers

import (
	"database/sql"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
)

// UpdateExam 更新考试
func UpdateExam(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 检查权限
	var courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT e.course_id, c.instructor_id
		FROM exams e
		JOIN courses c ON e.course_id = c.id
		WHERE e.id = ?
	`, examID).Scan(&courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "考试不存在")
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

	var req CreateExamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 解析时间
	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		utils.BadRequest(c, "开始时间格式错误")
		return
	}

	endTime, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		utils.BadRequest(c, "结束时间格式错误")
		return
	}

	_, err = database.DB.Exec(`
		UPDATE exams 
		SET title = ?, start_time = ?, end_time = ?
		WHERE id = ?
	`, req.Title, startTime, endTime, examID)

	if err != nil {
		utils.InternalServerError(c, "更新失败")
		return
	}

	utils.SuccessWithMessage(c, "更新成功", nil)
}

// DeleteExam 删除考试
func DeleteExam(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 检查权限
	var courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT e.course_id, c.instructor_id
		FROM exams e
		JOIN courses c ON e.course_id = c.id
		WHERE e.id = ?
	`, examID).Scan(&courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "考试不存在")
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

	_, err = database.DB.Exec("DELETE FROM exams WHERE id = ?", examID)
	if err != nil {
		utils.InternalServerError(c, "删除失败")
		return
	}

	utils.SuccessWithMessage(c, "删除成功", nil)
}

// UpdateQuestion 更新题目
func UpdateQuestion(c *gin.Context) {
	questionID := c.Param("qid")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 检查权限
	var examID, courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT q.exam_id, e.course_id, c.instructor_id
		FROM exam_questions q
		JOIN exams e ON q.exam_id = e.id
		JOIN courses c ON e.course_id = c.id
		WHERE q.id = ?
	`, questionID).Scan(&examID, &courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "题目不存在")
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

	var req AddQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	_, err = database.DB.Exec(`
		UPDATE exam_questions 
		SET type = ?, stem = ?, options = ?, answer = ?, score = ?, order_index = ?
		WHERE id = ?
	`, req.Type, req.Stem, req.Options, req.Answer, req.Score, req.OrderIndex, questionID)

	if err != nil {
		utils.InternalServerError(c, "更新失败")
		return
	}

	utils.SuccessWithMessage(c, "更新成功", nil)
}

// DeleteQuestion 删除题目
func DeleteQuestion(c *gin.Context) {
	questionID := c.Param("qid")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 检查权限
	var examID, courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT q.exam_id, e.course_id, c.instructor_id
		FROM exam_questions q
		JOIN exams e ON q.exam_id = e.id
		JOIN courses c ON e.course_id = c.id
		WHERE q.id = ?
	`, questionID).Scan(&examID, &courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "题目不存在")
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

	_, err = database.DB.Exec("DELETE FROM exam_questions WHERE id = ?", questionID)
	if err != nil {
		utils.InternalServerError(c, "删除失败")
		return
	}

	utils.SuccessWithMessage(c, "删除成功", nil)
}


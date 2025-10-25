package handlers

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
)

// GetMyCourses 学生获取已选课程列表
func GetMyCourses(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.Forbidden(c, "权限不足")
		return
	}

	rows, err := database.DB.Query(`
		SELECT c.id, c.title, c.description, c.instructor_id, c.category_id, c.created_at,
		       u.username as instructor_name,
		       cat.name as category_name,
		       ce.enrolled_at
		FROM courses c
		JOIN course_enrollments ce ON c.id = ce.course_id
		JOIN users u ON c.instructor_id = u.id
		LEFT JOIN course_categories cat ON c.category_id = cat.id
		WHERE ce.student_id = ?
		ORDER BY ce.enrolled_at DESC
	`, userID)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	courses := []gin.H{}
	for rows.Next() {
		var id, instructorID int64
		var title string
		var description sql.NullString
		var categoryID sql.NullInt64
		var createdAt, enrolledAt sql.NullTime
		var instructorName string
		var categoryName sql.NullString

		rows.Scan(&id, &title, &description, &instructorID, &categoryID, &createdAt,
			&instructorName, &categoryName, &enrolledAt)

		course := gin.H{
			"id":             id,
			"title":          title,
			"instructorId":   instructorID,
			"instructorName": instructorName,
		}

		if description.Valid {
			course["description"] = description.String
		}
		if categoryID.Valid {
			course["categoryId"] = categoryID.Int64
		}
		if categoryName.Valid {
			course["categoryName"] = categoryName.String
		}
		if createdAt.Valid {
			course["createdAt"] = createdAt.Time
		}
		if enrolledAt.Valid {
			course["enrolledAt"] = enrolledAt.Time
		}

		// 获取课程进度（章节完成情况 - 暂时返回模拟数据）
		var totalChapters int
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM course_chapters WHERE course_id = ?
		`, id).Scan(&totalChapters)

		course["totalChapters"] = totalChapters
		course["completedChapters"] = 0 // TODO: 实现章节完成追踪
		if totalChapters > 0 {
			course["progress"] = 0.0
		} else {
			course["progress"] = 0.0
		}

		courses = append(courses, course)
	}

	utils.Success(c, gin.H{
		"courses": courses,
	})
}

// GetCourseStatistics 获取课程统计信息
func GetCourseStatistics(c *gin.Context) {
	courseID := c.Param("id")

	// 获取学生人数
	var studentCount int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM course_enrollments WHERE course_id = ?
	`, courseID).Scan(&studentCount)

	// 获取作业数
	var assignmentCount int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM assignments WHERE course_id = ?
	`, courseID).Scan(&assignmentCount)

	// 获取考试数
	var examCount int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM exams WHERE course_id = ?
	`, courseID).Scan(&examCount)

	// 获取章节数
	var chapterCount int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM course_chapters WHERE course_id = ?
	`, courseID).Scan(&chapterCount)

	statistics := gin.H{
		"studentCount":    studentCount,
		"assignmentCount": assignmentCount,
		"examCount":       examCount,
		"chapterCount":    chapterCount,
	}

	utils.Success(c, statistics)
}

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


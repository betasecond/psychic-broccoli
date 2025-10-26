package handlers

import (
    "database/sql"
    "encoding/json"

    "github.com/gin-gonic/gin"
    "github.com/online-education-platform/backend/database"
    "github.com/online-education-platform/backend/utils"
)

// GetAssignmentStatistics 获取作业统计信息
func GetAssignmentStatistics(c *gin.Context) {
	assignmentID := c.Param("id")

	// 获取选课学生总数
	var totalStudents int
	err := database.DB.QueryRow(`
		SELECT COUNT(DISTINCT ce.student_id)
		FROM assignments a
		JOIN course_enrollments ce ON a.course_id = ce.course_id
		WHERE a.id = ?
	`, assignmentID).Scan(&totalStudents)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	// 获取已提交数
	var submitted int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = ?
	`, assignmentID).Scan(&submitted)

	// 获取已批改数和平均分
	var graded int
	var avgGrade sql.NullFloat64
	database.DB.QueryRow(`
		SELECT COUNT(*), AVG(grade)
		FROM assignment_submissions 
		WHERE assignment_id = ? AND grade IS NOT NULL
	`, assignmentID).Scan(&graded, &avgGrade)

	statistics := gin.H{
		"totalStudents": totalStudents,
		"submitted":     submitted,
		"graded":        graded,
		"ungraded":      submitted - graded,
		"notSubmitted":  totalStudents - submitted,
		"submitRate":    0.0,
		"avgGrade":      nil,
	}

	if totalStudents > 0 {
		statistics["submitRate"] = float64(submitted) / float64(totalStudents) * 100
	}

	if avgGrade.Valid {
		statistics["avgGrade"] = avgGrade.Float64
	}

	utils.Success(c, statistics)
}

// GetMyAssignments 学生获取自己的作业列表
func GetMyAssignments(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 获取学生选修的课程的所有作业
	rows, err := database.DB.Query(`
		SELECT DISTINCT a.id, a.course_id, a.title, a.content, a.deadline, a.created_at,
		       c.title as course_title,
		       s.id as submission_id, s.submitted_at, s.grade, s.feedback
		FROM assignments a
		JOIN courses c ON a.course_id = c.id
		JOIN course_enrollments ce ON c.id = ce.course_id
		LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = ?
		WHERE ce.student_id = ?
		ORDER BY a.deadline DESC
	`, userID, userID)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	assignments := []gin.H{}
	for rows.Next() {
		var id, courseID int64
		var title, courseTitle string
		var content sql.NullString
		var deadline, createdAt sql.NullTime
		var submissionID sql.NullInt64
		var submittedAt sql.NullTime
		var grade sql.NullFloat64
		var feedback sql.NullString

		rows.Scan(&id, &courseID, &title, &content, &deadline, &createdAt,
			&courseTitle, &submissionID, &submittedAt, &grade, &feedback)

		assignment := gin.H{
			"id":          id,
			"courseId":    courseID,
			"title":       title,
			"courseTitle": courseTitle,
			"createdAt":   createdAt.Time,
		}

		if content.Valid {
			assignment["content"] = content.String
		}
		if deadline.Valid {
			assignment["deadline"] = deadline.Time
		}

		// 提交状态
		if submissionID.Valid {
			assignment["submissionId"] = submissionID.Int64
			assignment["submitted"] = true
			if submittedAt.Valid {
				assignment["submittedAt"] = submittedAt.Time
			}
			if grade.Valid {
				assignment["grade"] = grade.Float64
				assignment["graded"] = true
			} else {
				assignment["graded"] = false
			}
			if feedback.Valid {
				assignment["feedback"] = feedback.String
			}
		} else {
			assignment["submitted"] = false
			assignment["graded"] = false
		}

		assignments = append(assignments, assignment)
	}

	utils.Success(c, gin.H{
		"assignments": assignments,
	})
}

// GetSubmissionDetail 获取作业提交详情
func GetSubmissionDetail(c *gin.Context) {
	submissionID := c.Param("id")

	var submission struct {
		ID           int64
		AssignmentID int64
		StudentID    int64
		Content      sql.NullString
		Attachments  sql.NullString
		SubmittedAt  sql.NullTime
		Grade        sql.NullFloat64
		Feedback     sql.NullString
	}

	err := database.DB.QueryRow(`
		SELECT id, assignment_id, student_id, content, attachments, submitted_at, grade, feedback
		FROM assignment_submissions
		WHERE id = ?
	`, submissionID).Scan(
		&submission.ID, &submission.AssignmentID, &submission.StudentID,
		&submission.Content, &submission.Attachments, &submission.SubmittedAt,
		&submission.Grade, &submission.Feedback,
	)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "提交记录不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	// 获取学生信息
	var studentName, studentEmail string
	database.DB.QueryRow(`
		SELECT username, email FROM users WHERE id = ?
	`, submission.StudentID).Scan(&studentName, &studentEmail)

	// 获取作业信息
	var assignmentTitle string
	var courseTitle string
	database.DB.QueryRow(`
		SELECT a.title, c.title
		FROM assignments a
		JOIN courses c ON a.course_id = c.id
		WHERE a.id = ?
	`, submission.AssignmentID).Scan(&assignmentTitle, &courseTitle)

	result := gin.H{
		"id":              submission.ID,
		"assignmentId":    submission.AssignmentID,
		"assignmentTitle": assignmentTitle,
		"courseTitle":     courseTitle,
		"studentId":       submission.StudentID,
		"studentName":     studentName,
		"studentEmail":    studentEmail,
	}

	if submission.Content.Valid {
		result["content"] = submission.Content.String
	}
	if submission.Attachments.Valid {
		result["attachments"] = submission.Attachments.String
	}
	if submission.SubmittedAt.Valid {
		result["submittedAt"] = submission.SubmittedAt.Time
	}
	if submission.Grade.Valid {
		result["grade"] = submission.Grade.Float64
	}
	if submission.Feedback.Valid {
		result["feedback"] = submission.Feedback.String
	}

	utils.Success(c, result)
}

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

    // 解析 deadline
    var deadline interface{}
    if req.Deadline != nil && *req.Deadline != "" {
        deadline = *req.Deadline
    } else {
        deadline = nil
    }

    // 处理附件 JSON
    var attachmentsJSON interface{}
    if req.Attachments != nil {
        if b, err := json.Marshal(req.Attachments); err == nil {
            attachmentsJSON = string(b)
        }
    } else {
        attachmentsJSON = nil
    }

    _, err = database.DB.Exec(`
        UPDATE assignments 
        SET title = ?, content = ?, deadline = ?, attachments = ?
        WHERE id = ?
    `, req.Title, req.Content, deadline, attachmentsJSON, assignmentID)

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


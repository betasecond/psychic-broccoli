package handlers

import (
    "database/sql"
    "encoding/json"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/online-education-platform/backend/database"
    "github.com/online-education-platform/backend/models"
    "github.com/online-education-platform/backend/utils"
)

// CreateAssignmentRequest 创建作业请求
type CreateAssignmentRequest struct {
	CourseID int64   `json:"courseId" binding:"required"`
	Title    string  `json:"title" binding:"required"`
	Content  *string `json:"content"`
	Deadline *string `json:"deadline"` // ISO 8601格式
    Attachments *[]string `json:"attachments"`
}

// SubmitAssignmentRequest 提交作业请求
type SubmitAssignmentRequest struct {
	Content     *string `json:"content"`
	Attachments *string `json:"attachments"` // JSON字符串
}

// GradeAssignmentRequest 批改作业请求
type GradeAssignmentRequest struct {
	Grade    float64 `json:"grade" binding:"required,min=0,max=100"`
	Feedback *string `json:"feedback"`
}

// GetAssignments 获取作业列表
func GetAssignments(c *gin.Context) {
	courseID := c.Query("courseId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	offset := (page - 1) * pageSize

	// 学生需要校验选课状态
	if role == "STUDENT" {
		if courseID == "" {
			utils.BadRequest(c, "学生查询需要指定课程ID")
			return
		}

		// 检查是否选了这门课
		var count int
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM course_enrollments
			WHERE student_id = ? AND course_id = ?
		`, userID, courseID).Scan(&count)

		if count == 0 {
			utils.Forbidden(c, "您未选修此课程")
			return
		}
	}

    query := `
        SELECT id, course_id, title, content, deadline, created_at, attachments
        FROM assignments
        WHERE 1=1
    `
	args := []interface{}{}

	if courseID != "" {
		query += " AND course_id = ?"
		args = append(args, courseID)
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	assignments := []models.Assignment{}
	for rows.Next() {
		var assignment models.Assignment
		var deadline sql.NullTime
        err := rows.Scan(
            &assignment.ID, &assignment.CourseID, &assignment.Title,
            &assignment.Content, &deadline, &assignment.CreatedAt, &assignment.Attachments,
        )
		if err != nil {
			continue
		}
		if deadline.Valid {
			assignment.Deadline = &deadline.Time
		}
		assignments = append(assignments, assignment)
	}

	utils.Success(c, gin.H{
		"assignments": assignments,
	})
}

// CreateAssignment 创建作业
func CreateAssignment(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	var req CreateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 检查是否是课程的授课教师
	var instructorID int64
	err := database.DB.QueryRow("SELECT instructor_id FROM courses WHERE id = ?", req.CourseID).Scan(&instructorID)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "课程不存在")
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

	// 解析deadline
    var deadline *time.Time
	if req.Deadline != nil && *req.Deadline != "" {
		t, parseErr := time.Parse(time.RFC3339, *req.Deadline)
		if parseErr != nil {
			utils.BadRequest(c, "截止日期格式错误，请使用 ISO 8601 格式")
			return
		}
		if t.Before(time.Now()) {
			utils.BadRequest(c, "截止日期不能早于当前时间")
			return
		}
		deadline = &t
	}

    // 处理附件为 JSON 字符串
    var attachmentsJSON *string
    if req.Attachments != nil {
        if b, err := json.Marshal(req.Attachments); err == nil {
            s := string(b)
            attachmentsJSON = &s
        }
    }

    result, err := database.DB.Exec(`
        INSERT INTO assignments (course_id, title, content, deadline, attachments)
        VALUES (?, ?, ?, ?, ?)
    `, req.CourseID, req.Title, req.Content, deadline, attachmentsJSON)

	if err != nil {
		utils.InternalServerError(c, "创建作业失败")
		return
	}

	assignmentID, _ := result.LastInsertId()

	utils.Success(c, gin.H{
		"id": assignmentID,
	})
}

// GetAssignment 获取作业详情
func GetAssignment(c *gin.Context) {
	assignmentID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	var assignment models.Assignment
	var deadline sql.NullTime
    err := database.DB.QueryRow(`
        SELECT id, course_id, title, content, deadline, created_at, attachments
        FROM assignments
        WHERE id = ?
    `, assignmentID).Scan(
        &assignment.ID, &assignment.CourseID, &assignment.Title,
        &assignment.Content, &deadline, &assignment.CreatedAt, &assignment.Attachments,
    )

	if err == sql.ErrNoRows {
		utils.NotFound(c, "作业不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	if deadline.Valid {
		assignment.Deadline = &deadline.Time
	}

	// Fix P1: 权限校验 - 学生须选课，教师须是课程教师
	if role == "STUDENT" {
		var cnt int
		database.DB.QueryRow(
			"SELECT COUNT(*) FROM course_enrollments WHERE student_id = ? AND course_id = ?",
			userID, assignment.CourseID,
		).Scan(&cnt)
		if cnt == 0 {
			utils.Forbidden(c, "您未选修此课程")
			return
		}
	} else if role == "INSTRUCTOR" {
		var instructorID int64
		database.DB.QueryRow(
			"SELECT instructor_id FROM courses WHERE id = ?",
			assignment.CourseID,
		).Scan(&instructorID)
		if instructorID != userID.(int64) {
			utils.Forbidden(c, "权限不足")
			return
		}
	}

	utils.Success(c, assignment)
}

// SubmitAssignment 提交作业
func SubmitAssignment(c *gin.Context) {
	assignmentID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.BadRequest(c, "只有学生可以提交作业")
		return
	}

	var req SubmitAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// Fix P2: 内容和附件不能同时为空
	contentEmpty := req.Content == nil || *req.Content == ""
	attachmentsEmpty := req.Attachments == nil || *req.Attachments == ""
	if contentEmpty && attachmentsEmpty {
		utils.BadRequest(c, "作业内容和附件不能同时为空")
		return
	}

	// 检查作业是否存在及截止日期
	var courseID int64
	var deadline sql.NullTime
	err := database.DB.QueryRow("SELECT course_id, deadline FROM assignments WHERE id = ?", assignmentID).Scan(&courseID, &deadline)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "作业不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	// Fix P0: 检查截止日期
	if deadline.Valid && time.Now().After(deadline.Time) {
		utils.BadRequest(c, "已超过截止日期，无法提交")
		return
	}

	// 检查学生是否选了这门课
	var count int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM course_enrollments 
		WHERE student_id = ? AND course_id = ?
	`, userID, courseID).Scan(&count)

	if count == 0 {
		utils.Forbidden(c, "您未选修此课程")
		return
	}

	// 检查是否已提交
	var submissionID int64
	err = database.DB.QueryRow(`
		SELECT id FROM assignment_submissions 
		WHERE assignment_id = ? AND student_id = ?
	`, assignmentID, userID).Scan(&submissionID)

	if err == nil {
		// Fix P1: 已批改则不允许重新提交
		var gradeVal sql.NullFloat64
		database.DB.QueryRow("SELECT grade FROM assignment_submissions WHERE id = ?", submissionID).Scan(&gradeVal)
		if gradeVal.Valid {
			utils.BadRequest(c, "作业已批改，不可重新提交")
			return
		}
		// 已存在,更新
		_, err = database.DB.Exec(`
			UPDATE assignment_submissions 
			SET content = ?, attachments = ?, submitted_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, req.Content, req.Attachments, submissionID)
	} else {
		// 不存在,插入
		_, err = database.DB.Exec(`
			INSERT INTO assignment_submissions (assignment_id, student_id, content, attachments)
			VALUES (?, ?, ?, ?)
		`, assignmentID, userID, req.Content, req.Attachments)
	}

	if err != nil {
		utils.InternalServerError(c, "提交失败")
		return
	}

	utils.SuccessWithMessage(c, "提交成功", nil)
}

// GetSubmissions 获取作业提交列表
func GetSubmissions(c *gin.Context) {
	assignmentID := c.Query("assignmentId")
	studentID := c.Query("studentId")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 权限校验
	if role == "STUDENT" {
		// 学生只能查看自己的提交记录
		userIDStr := strconv.FormatInt(userID.(int64), 10)
		if studentID == "" || studentID != userIDStr {
			utils.Forbidden(c, "只能查看自己的提交记录")
			return
		}
	} else if role == "INSTRUCTOR" {
		// 教师只能查看自己课程的提交记录
		if assignmentID == "" {
			utils.BadRequest(c, "教师查询需要指定作业ID")
			return
		}

		// 验证教师是否为该作业所属课程的教师
		var courseID, instructorID int64
		err := database.DB.QueryRow(`
			SELECT a.course_id, c.instructor_id
			FROM assignments a
			JOIN courses c ON a.course_id = c.id
			WHERE a.id = ?
		`, assignmentID).Scan(&courseID, &instructorID)

		if err != nil {
			utils.InternalServerError(c, "服务器错误")
			return
		}

		if instructorID != userID.(int64) {
			utils.Forbidden(c, "只能查看自己课程的作业提交")
			return
		}
	}
	// ADMIN 可以查看所有提交记录，不需要额外校验

	query := `
		SELECT s.id, s.assignment_id, s.student_id, s.content, s.attachments,
		       s.submitted_at, s.grade, s.feedback,
		       COALESCE(u.username, '') as student_name
		FROM assignment_submissions s
		LEFT JOIN users u ON s.student_id = u.id
		WHERE 1=1
	`
	args := []interface{}{}

	if assignmentID != "" {
		query += " AND s.assignment_id = ?"
		args = append(args, assignmentID)
	}
	if studentID != "" {
		query += " AND s.student_id = ?"
		args = append(args, studentID)
	}

	query += " ORDER BY s.submitted_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	submissions := []models.AssignmentSubmission{}
	for rows.Next() {
		var submission models.AssignmentSubmission
		var studentName string
		err := rows.Scan(
			&submission.ID, &submission.AssignmentID, &submission.StudentID,
			&submission.Content, &submission.Attachments, &submission.SubmittedAt,
			&submission.Grade, &submission.Feedback,
			&studentName,
		)
		if err != nil {
			continue
		}
		if studentName != "" {
			submission.StudentName = &studentName
		}
		submissions = append(submissions, submission)
	}

	utils.Success(c, submissions)
}

// GradeSubmission 批改作业
func GradeSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	var req GradeAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 检查权限 - 是否是该课程的教师
	var assignmentID, courseID, instructorID int64
	err := database.DB.QueryRow(`
		SELECT s.assignment_id, a.course_id, c.instructor_id
		FROM assignment_submissions s
		JOIN assignments a ON s.assignment_id = a.id
		JOIN courses c ON a.course_id = c.id
		WHERE s.id = ?
	`, submissionID).Scan(&assignmentID, &courseID, &instructorID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "提交记录不存在")
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

	// 更新成绩和评语
	_, err = database.DB.Exec(`
		UPDATE assignment_submissions 
		SET grade = ?, feedback = ?
		WHERE id = ?
	`, req.Grade, req.Feedback, submissionID)

	if err != nil {
		utils.InternalServerError(c, "批改失败")
		return
	}

	utils.SuccessWithMessage(c, "批改成功", nil)
}


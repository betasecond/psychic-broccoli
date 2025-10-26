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
	Grade    float64 `json:"grade" binding:"required"`
	Feedback *string `json:"feedback"`
}

// GetAssignments 获取作业列表
func GetAssignments(c *gin.Context) {
	courseID := c.Query("courseId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	offset := (page - 1) * pageSize

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
		t, err := time.Parse(time.RFC3339, *req.Deadline)
		if err == nil {
			deadline = &t
		}
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

	// 检查作业是否存在
	var courseID int64
	err := database.DB.QueryRow("SELECT course_id FROM assignments WHERE id = ?", assignmentID).Scan(&courseID)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "作业不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
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

	query := `
		SELECT s.id, s.assignment_id, s.student_id, s.content, s.attachments,
		       s.submitted_at, s.grade, s.feedback
		FROM assignment_submissions s
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
		err := rows.Scan(
			&submission.ID, &submission.AssignmentID, &submission.StudentID,
			&submission.Content, &submission.Attachments, &submission.SubmittedAt,
			&submission.Grade, &submission.Feedback,
		)
		if err != nil {
			continue
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


package handlers

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/models"
	"github.com/online-education-platform/backend/utils"
)

// CreateExamRequest 创建考试请求
type CreateExamRequest struct {
	CourseID  int64  `json:"courseId" binding:"required"`
	Title     string `json:"title" binding:"required"`
	StartTime string `json:"startTime" binding:"required"`
	EndTime   string `json:"endTime" binding:"required"`
}

// AddQuestionRequest 添加题目请求
type AddQuestionRequest struct {
	Type       string  `json:"type" binding:"required"` // SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER
	Stem       string  `json:"stem" binding:"required"`
	Options    *string `json:"options"`    // JSON字符串
	Answer     string  `json:"answer" binding:"required"` // JSON字符串
	Score      float64 `json:"score" binding:"required"`
	OrderIndex int     `json:"orderIndex"`
}

// SubmitExamRequest 提交答卷请求
type SubmitExamRequest struct {
	Answers []struct {
		QuestionID int64  `json:"questionId"`
		Answer     string `json:"answer"` // JSON字符串
	} `json:"answers"`
}

// GetExams 获取考试列表
func GetExams(c *gin.Context) {
	courseID := c.Query("courseId")
	title := c.Query("title")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	offset := (page - 1) * pageSize

	query := `
		SELECT id, course_id, title, start_time, end_time, created_at
		FROM exams
		WHERE 1=1
	`
	args := []interface{}{}

	if courseID != "" {
		query += " AND course_id = ?"
		args = append(args, courseID)
	}

	if title != "" {
		query += " AND title LIKE ?"
		args = append(args, "%"+title+"%")
	}

	query += " ORDER BY start_time DESC LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	exams := []models.Exam{}
	for rows.Next() {
		var exam models.Exam
		err := rows.Scan(
			&exam.ID, &exam.CourseID, &exam.Title,
			&exam.StartTime, &exam.EndTime, &exam.CreatedAt,
		)
		if err != nil {
			continue
		}
		exams = append(exams, exam)
	}

	utils.Success(c, gin.H{
		"exams": exams,
	})
}

// CreateExam 创建考试
func CreateExam(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	var req CreateExamRequest
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

	result, err := database.DB.Exec(`
		INSERT INTO exams (course_id, title, start_time, end_time)
		VALUES (?, ?, ?, ?)
	`, req.CourseID, req.Title, startTime, endTime)

	if err != nil {
		utils.InternalServerError(c, "创建考试失败")
		return
	}

	examID, _ := result.LastInsertId()

	utils.Success(c, gin.H{
		"id": examID,
	})
}

// GetExam 获取考试详情
func GetExam(c *gin.Context) {
	examID := c.Param("id")
	role, _ := c.Get("role")

	var exam models.Exam
	err := database.DB.QueryRow(`
		SELECT id, course_id, title, start_time, end_time, created_at
		FROM exams
		WHERE id = ?
	`, examID).Scan(
		&exam.ID, &exam.CourseID, &exam.Title,
		&exam.StartTime, &exam.EndTime, &exam.CreatedAt,
	)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "考试不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	// 获取题目列表
	rows, err := database.DB.Query(`
		SELECT id, exam_id, type, stem, options, answer, score, order_index
		FROM exam_questions
		WHERE exam_id = ?
		ORDER BY order_index
	`, examID)

	if err != nil {
		utils.InternalServerError(c, "查询题目失败")
		return
	}
	defer rows.Close()

	questions := []models.ExamQuestion{}
	for rows.Next() {
		var question models.ExamQuestion
		err := rows.Scan(
			&question.ID, &question.ExamID, &question.Type,
			&question.Stem, &question.Options, &question.Answer,
			&question.Score, &question.OrderIndex,
		)
		if err != nil {
			continue
		}

		// 如果是学生查看，不返回答案
		if role == "STUDENT" {
			question.Answer = ""
		}

		questions = append(questions, question)
	}

	utils.Success(c, gin.H{
		"exam":      exam,
		"questions": questions,
	})
}

// AddQuestion 添加题目
func AddQuestion(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	var req AddQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
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

	result, err := database.DB.Exec(`
		INSERT INTO exam_questions (exam_id, type, stem, options, answer, score, order_index)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, examID, req.Type, req.Stem, req.Options, req.Answer, req.Score, req.OrderIndex)

	if err != nil {
		utils.InternalServerError(c, "添加题目失败")
		return
	}

	questionID, _ := result.LastInsertId()

	utils.Success(c, gin.H{
		"id": questionID,
	})
}

// SubmitExam 提交答卷
func SubmitExam(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.BadRequest(c, "只有学生可以提交答卷")
		return
	}

	var req SubmitExamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 检查考试是否存在
	var courseID int64
	var startTime, endTime time.Time
	err := database.DB.QueryRow(`
		SELECT course_id, start_time, end_time FROM exams WHERE id = ?
	`, examID).Scan(&courseID, &startTime, &endTime)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "考试不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	// 检查是否在考试时间内
	now := time.Now()
	if now.Before(startTime) {
		utils.BadRequest(c, "考试尚未开始")
		return
	}
	if now.After(endTime) {
		utils.BadRequest(c, "考试已结束")
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
	var existingSubmissionID int64
	err = database.DB.QueryRow(`
		SELECT id FROM exam_submissions 
		WHERE exam_id = ? AND student_id = ?
	`, examID, userID).Scan(&existingSubmissionID)

	if err == nil {
		utils.BadRequest(c, "已提交过答卷")
		return
	}

	// 创建提交记录
	result, err := database.DB.Exec(`
		INSERT INTO exam_submissions (exam_id, student_id)
		VALUES (?, ?)
	`, examID, userID)

	if err != nil {
		utils.InternalServerError(c, "提交失败")
		return
	}

	submissionID, _ := result.LastInsertId()

	// 保存答案并自动判分
	totalScore := 0.0
	for _, answer := range req.Answers {
		// 获取题目信息
		var question models.ExamQuestion
		err := database.DB.QueryRow(`
			SELECT id, type, answer, score FROM exam_questions WHERE id = ?
		`, answer.QuestionID).Scan(
			&question.ID, &question.Type, &question.Answer, &question.Score,
		)

		if err != nil {
			continue
		}

		// 计算得分
		scoreAwarded := 0.0
		if question.Type == "SINGLE_CHOICE" || question.Type == "MULTIPLE_CHOICE" || question.Type == "TRUE_FALSE" {
			// 客观题自动判分
			if answer.Answer == question.Answer {
				scoreAwarded = question.Score
			}
		}
		// 主观题暂不判分，等待教师批改

		totalScore += scoreAwarded

		// 保存答案
		database.DB.Exec(`
			INSERT INTO exam_answers (submission_id, question_id, student_answer, score_awarded)
			VALUES (?, ?, ?, ?)
		`, submissionID, answer.QuestionID, answer.Answer, scoreAwarded)
	}

	// 更新总分
	database.DB.Exec(`
		UPDATE exam_submissions SET total_score = ? WHERE id = ?
	`, totalScore, submissionID)

	utils.SuccessWithMessage(c, "提交成功", gin.H{
		"submissionId": submissionID,
		"totalScore":   totalScore,
	})
}

// GetExamResults 获取考试成绩列表
func GetExamResults(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

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

	// 查询所有提交记录
	rows, err := database.DB.Query(`
		SELECT s.id, s.exam_id, s.student_id, u.username, s.submitted_at, s.total_score
		FROM exam_submissions s
		JOIN users u ON s.student_id = u.id
		WHERE s.exam_id = ?
		ORDER BY s.submitted_at DESC
	`, examID)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	results := []gin.H{}
	for rows.Next() {
		var id, examID, studentID int64
		var username string
		var submittedAt time.Time
		var totalScore sql.NullFloat64

		rows.Scan(&id, &examID, &studentID, &username, &submittedAt, &totalScore)

		result := gin.H{
			"id":          id,
			"examId":      examID,
			"studentId":   studentID,
			"studentName": username,
			"submittedAt": submittedAt,
		}

		if totalScore.Valid {
			result["totalScore"] = totalScore.Float64
		}

		results = append(results, result)
	}

	utils.Success(c, results)
}


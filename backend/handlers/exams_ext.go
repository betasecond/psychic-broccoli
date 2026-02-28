package handlers

import (
	"database/sql"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
)

// GetExamStatistics 获取考试统计信息
func GetExamStatistics(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 只允许教师和管理员访问
	if role == "STUDENT" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 教师只能查看自己课程的统计
	if role == "INSTRUCTOR" {
		var instructorID int64
		err := database.DB.QueryRow(`
			SELECT c.instructor_id FROM exams e
			JOIN courses c ON e.course_id = c.id
			WHERE e.id = ?
		`, examID).Scan(&instructorID)
		if err != nil {
			utils.NotFound(c, "考试不存在")
			return
		}
		if instructorID != userID.(int64) {
			utils.Forbidden(c, "权限不足")
			return
		}
	}

	// 获取选课学生总数
	var totalStudents int
	err := database.DB.QueryRow(`
		SELECT COUNT(DISTINCT ce.student_id)
		FROM exams e
		JOIN course_enrollments ce ON e.course_id = ce.course_id
		WHERE e.id = ?
	`, examID).Scan(&totalStudents)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	// 获取已参加数
	var participated int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM exam_submissions WHERE exam_id = ?
	`, examID).Scan(&participated)

	// 获取平均分、最高分、最低分
	var avgScore, maxScore, minScore sql.NullFloat64
	database.DB.QueryRow(`
		SELECT AVG(total_score), MAX(total_score), MIN(total_score)
		FROM exam_submissions 
		WHERE exam_id = ? AND total_score IS NOT NULL
	`, examID).Scan(&avgScore, &maxScore, &minScore)

	// 获取及格人数（假设60分及格）
	var passCount int
	database.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM exam_submissions 
		WHERE exam_id = ? AND total_score >= 60
	`, examID).Scan(&passCount)

	statistics := gin.H{
		"totalStudents":    totalStudents,
		"participated":     participated,
		"notParticipated":  totalStudents - participated,
		"participationRate": 0.0,
		"avgScore":         nil,
		"maxScore":         nil,
		"minScore":         nil,
		"passCount":        passCount,
		"passRate":         0.0,
	}

	if totalStudents > 0 {
		statistics["participationRate"] = float64(participated) / float64(totalStudents) * 100
	}

	if participated > 0 {
		statistics["passRate"] = float64(passCount) / float64(participated) * 100
	}

	if avgScore.Valid {
		statistics["avgScore"] = avgScore.Float64
	}
	if maxScore.Valid {
		statistics["maxScore"] = maxScore.Float64
	}
	if minScore.Valid {
		statistics["minScore"] = minScore.Float64
	}

	utils.Success(c, statistics)
}

// GetMyExams 学生获取自己的考试列表
func GetMyExams(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 获取学生选修的课程的所有考试
	rows, err := database.DB.Query(`
		SELECT DISTINCT e.id, e.course_id, e.title, e.start_time, e.end_time, e.created_at,
		       c.title as course_title,
		       s.id as submission_id, s.submitted_at, s.total_score
		FROM exams e
		JOIN courses c ON e.course_id = c.id
		JOIN course_enrollments ce ON c.id = ce.course_id
		LEFT JOIN exam_submissions s ON e.id = s.exam_id AND s.student_id = ?
		WHERE ce.student_id = ?
		ORDER BY e.start_time DESC
	`, userID, userID)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	exams := []gin.H{}
	for rows.Next() {
		var id, courseID int64
		var title, courseTitle string
		var startTime, endTime, createdAt time.Time
		var submissionID sql.NullInt64
		var submittedAt sql.NullTime
		var totalScore sql.NullFloat64

		rows.Scan(&id, &courseID, &title, &startTime, &endTime, &createdAt,
			&courseTitle, &submissionID, &submittedAt, &totalScore)

		exam := gin.H{
			"id":          id,
			"courseId":    courseID,
			"title":       title,
			"courseTitle": courseTitle,
			"startTime":   startTime,
			"endTime":     endTime,
			"createdAt":   createdAt,
		}

		// 考试状态
		now := time.Now()
		if now.Before(startTime) {
			exam["status"] = "未开始"
		} else if now.After(endTime) {
			exam["status"] = "已结束"
		} else {
			exam["status"] = "进行中"
		}

		// 提交状态
		if submissionID.Valid {
			exam["submissionId"] = submissionID.Int64
			exam["submitted"] = true
			if submittedAt.Valid {
				exam["submittedAt"] = submittedAt.Time
			}
			if totalScore.Valid {
				exam["totalScore"] = totalScore.Float64
			}
		} else {
			exam["submitted"] = false
		}

		exams = append(exams, exam)
	}

	utils.Success(c, gin.H{
		"exams": exams,
	})
}

// GetMyExamSubmission 学生查看自己的答卷详情
func GetMyExamSubmission(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 获取提交记录
	var submissionID int64
	var submittedAt time.Time
	var totalScore sql.NullFloat64

	err := database.DB.QueryRow(`
		SELECT id, submitted_at, total_score
		FROM exam_submissions
		WHERE exam_id = ? AND student_id = ?
	`, examID, userID).Scan(&submissionID, &submittedAt, &totalScore)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "未找到答卷")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	// 获取答题详情
	rows, err := database.DB.Query(`
		SELECT a.question_id, a.student_answer, a.score_awarded,
		       q.type, q.stem, q.options, q.answer, q.score
		FROM exam_answers a
		JOIN exam_questions q ON a.question_id = q.id
		WHERE a.submission_id = ?
		ORDER BY q.order_index
	`, submissionID)

	if err != nil {
		utils.InternalServerError(c, "查询答题详情失败")
		return
	}
	defer rows.Close()

	answers := []gin.H{}
	for rows.Next() {
		var questionID int64
		var studentAnswer string
		var scoreAwarded sql.NullFloat64
		var qType, stem, answer string
		var options sql.NullString
		var score float64

		rows.Scan(&questionID, &studentAnswer, &scoreAwarded,
			&qType, &stem, &options, &answer, &score)

		answerItem := gin.H{
			"questionId":     questionID,
			"type":          qType,
			"stem":          stem,
			"score":         score,
			"studentAnswer": studentAnswer,
			"correctAnswer": answer,
		}

		if options.Valid {
			answerItem["options"] = options.String
		}
		if scoreAwarded.Valid {
			answerItem["scoreAwarded"] = scoreAwarded.Float64
		}

		answers = append(answers, answerItem)
	}

	result := gin.H{
		"submissionId": submissionID,
		"submittedAt":  submittedAt,
		"answers":      answers,
	}

	if totalScore.Valid {
		result["totalScore"] = totalScore.Float64
	}

	utils.Success(c, result)
}

// GetExamSubmissionDetail 获取考试答卷详情（教师用）
func GetExamSubmissionDetail(c *gin.Context) {
	submissionID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role == "STUDENT" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 获取提交记录
	var examID, studentID int64
	var submittedAt time.Time
	var totalScore sql.NullFloat64

	err := database.DB.QueryRow(`
		SELECT exam_id, student_id, submitted_at, total_score
		FROM exam_submissions
		WHERE id = ?
	`, submissionID).Scan(&examID, &studentID, &submittedAt, &totalScore)

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
	`, studentID).Scan(&studentName, &studentEmail)

	// 获取考试信息，同时校验教师权限
	var examTitle string
	var courseTitle string
	var instructorID int64
	database.DB.QueryRow(`
		SELECT e.title, c.title, c.instructor_id
		FROM exams e
		JOIN courses c ON e.course_id = c.id
		WHERE e.id = ?
	`, examID).Scan(&examTitle, &courseTitle, &instructorID)

	if role == "INSTRUCTOR" && instructorID != userID.(int64) {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 获取答题详情
	rows, err := database.DB.Query(`
		SELECT a.question_id, a.student_answer, a.score_awarded,
		       q.type, q.stem, q.options, q.answer, q.score
		FROM exam_answers a
		JOIN exam_questions q ON a.question_id = q.id
		WHERE a.submission_id = ?
		ORDER BY q.order_index
	`, submissionID)

	if err != nil {
		utils.InternalServerError(c, "查询答题详情失败")
		return
	}
	defer rows.Close()

	answers := []gin.H{}
	for rows.Next() {
		var questionID int64
		var studentAnswer string
		var scoreAwarded sql.NullFloat64
		var qType, stem, answer string
		var options sql.NullString
		var score float64

		rows.Scan(&questionID, &studentAnswer, &scoreAwarded,
			&qType, &stem, &options, &answer, &score)

		answerItem := gin.H{
			"questionId":     questionID,
			"type":          qType,
			"stem":          stem,
			"score":         score,
			"studentAnswer": studentAnswer,
			"correctAnswer": answer,
		}

		if options.Valid {
			answerItem["options"] = options.String
		}
		if scoreAwarded.Valid {
			answerItem["scoreAwarded"] = scoreAwarded.Float64
		}

		answers = append(answers, answerItem)
	}

	result := gin.H{
		"id":         submissionID,
		"examId":     examID,
		"examTitle":  examTitle,
		"courseTitle": courseTitle,
		"studentId":  studentID,
		"studentName": studentName,
		"studentEmail": studentEmail,
		"submittedAt": submittedAt,
		"answers":     answers,
	}

	if totalScore.Valid {
		result["totalScore"] = totalScore.Float64
	}

	utils.Success(c, result)
}

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

	if !endTime.After(startTime) {
		utils.BadRequest(c, "结束时间必须晚于开始时间")
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


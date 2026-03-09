package handlers

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
	"go.uber.org/zap"
)

// GetExamQuestionAnalytics 返回每道题的平均耗时、正答率、答题人数（PLAN-03）
func GetExamQuestionAnalytics(c *gin.Context) {
	examIDStr := c.Param("id")
	examID, err := strconv.ParseInt(examIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的考试ID")
		return
	}

	// 验证考试是否存在
	var examTitle string
	err = database.DB.QueryRow("SELECT title FROM exams WHERE id = ?", examID).Scan(&examTitle)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "考试不存在")
		return
	} else if err != nil {
		utils.GetLogger().Error("查询考试失败", zap.Error(err))
		utils.InternalServerError(c, "查询失败")
		return
	}

	rows, err := database.DB.Query(`
		SELECT
			q.id,
			q.stem,
			q.order_index,
			COUNT(a.id)                                                    AS answer_count,
			COALESCE(AVG(a.time_spent), 0)                                 AS avg_time_spent,
			COALESCE(AVG(CASE WHEN a.score_awarded > 0 THEN 1.0 ELSE 0.0 END), 0) AS accuracy
		FROM exam_questions q
		LEFT JOIN exam_answers a ON a.question_id = q.id
		WHERE q.exam_id = ?
		GROUP BY q.id
		ORDER BY q.order_index
	`, examID)
	if err != nil {
		utils.GetLogger().Error("查询题目分析失败", zap.Error(err))
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	type QuestionStat struct {
		ID           int64   `json:"id"`
		Stem         string  `json:"stem"`
		OrderIndex   int     `json:"orderIndex"`
		AnswerCount  int     `json:"answerCount"`
		AvgTimeSpent float64 `json:"avgTimeSpent"`
		Accuracy     float64 `json:"accuracy"`
	}

	stats := []QuestionStat{}
	for rows.Next() {
		var s QuestionStat
		if err := rows.Scan(&s.ID, &s.Stem, &s.OrderIndex, &s.AnswerCount, &s.AvgTimeSpent, &s.Accuracy); err != nil {
			continue
		}
		stats = append(stats, s)
	}

	utils.Success(c, gin.H{
		"examId":    examID,
		"examTitle": examTitle,
		"questions": stats,
	})
}

// GetCourseLearningHeatmap 返回课程各章节的学生进度分布（PLAN-03）
func GetCourseLearningHeatmap(c *gin.Context) {
	courseIDStr := c.Param("id")
	courseID, err := strconv.ParseInt(courseIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的课程ID")
		return
	}

	rows, err := database.DB.Query(`
		SELECT
			ch.id           AS chapter_id,
			ch.title        AS chapter_title,
			ch.order_index  AS chapter_order,
			COUNT(DISTINCT e.student_id)                   AS enrolled_count,
			COUNT(DISTINCT CASE WHEN sp.progress >= 100 THEN sp.student_id END) AS completed_count,
			COALESCE(AVG(sp.progress), 0)                  AS avg_progress
		FROM course_chapters ch
		JOIN course_enrollments e ON e.course_id = ch.course_id
		LEFT JOIN section_progress sp ON sp.chapter_id = ch.id AND sp.student_id = e.student_id
		WHERE ch.course_id = ?
		GROUP BY ch.id
		ORDER BY ch.order_index
	`, courseID)
	if err != nil {
		utils.GetLogger().Error("查询学习热力图失败", zap.Error(err))
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	type ChapterStat struct {
		ChapterID      int64   `json:"chapterId"`
		ChapterTitle   string  `json:"chapterTitle"`
		ChapterOrder   int     `json:"chapterOrder"`
		EnrolledCount  int     `json:"enrolledCount"`
		CompletedCount int     `json:"completedCount"`
		AvgProgress    float64 `json:"avgProgress"`
	}

	stats := []ChapterStat{}
	for rows.Next() {
		var s ChapterStat
		if err := rows.Scan(&s.ChapterID, &s.ChapterTitle, &s.ChapterOrder, &s.EnrolledCount, &s.CompletedCount, &s.AvgProgress); err != nil {
			continue
		}
		stats = append(stats, s)
	}

	utils.Success(c, gin.H{
		"courseId": courseID,
		"chapters": stats,
	})
}

// checkExamAndWarnTeacher 在 SubmitExam 完成后异步检查难题并推送预警消息（PLAN-03）
func checkExamAndWarnTeacher(examID int64) {
	// 查询该考试的教师 ID 和考试标题
	var instructorID int64
	var examTitle string
	err := database.DB.QueryRow(`
		SELECT c.instructor_id, e.title
		FROM exams e
		JOIN courses c ON c.id = e.course_id
		WHERE e.id = ?
	`, examID).Scan(&instructorID, &examTitle)
	if err != nil {
		return
	}

	// 查询所有题目的正答率和平均耗时
	rows, err := database.DB.Query(`
		SELECT
			q.order_index,
			COUNT(a.id)                                                    AS cnt,
			COALESCE(AVG(CASE WHEN a.score_awarded > 0 THEN 1.0 ELSE 0.0 END), 0) AS accuracy,
			COALESCE(AVG(a.time_spent), 0)                                 AS avg_time
		FROM exam_questions q
		LEFT JOIN exam_answers a ON a.question_id = q.id
		WHERE q.exam_id = ?
		GROUP BY q.id
		HAVING cnt > 0
	`, examID)
	if err != nil {
		return
	}
	defer rows.Close()

	warnings := []string{}
	for rows.Next() {
		var orderIndex, cnt int
		var accuracy, avgTime float64
		if err := rows.Scan(&orderIndex, &cnt, &accuracy, &avgTime); err != nil {
			continue
		}
		if accuracy < 0.5 && avgTime > 120 {
			warnings = append(warnings, fmt.Sprintf(
				"第 %d 题正答率仅 %.0f%%，学生平均耗时 %.0f 秒，建议检查题目表述",
				orderIndex, accuracy*100, avgTime,
			))
		}
	}

	if len(warnings) == 0 {
		return
	}

	content := fmt.Sprintf("考试《%s》自动预警：\n", examTitle)
	for _, w := range warnings {
		content += "• " + w + "\n"
	}

	database.DB.Exec(`
		INSERT INTO messages (user_id, title, content, date, type, status, sender)
		VALUES (?, ?, ?, ?, 'SYSTEM', 'unread', 'system')
	`, instructorID,
		fmt.Sprintf("考试《%s》教学质量预警", examTitle),
		content,
		time.Now().Format("2006-01-02"),
	)
}

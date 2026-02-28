package handlers

import (
	"database/sql"
	"strconv"

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
		       ce.enrolled_at,
		       ce.progress
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
		var progress int

		rows.Scan(&id, &title, &description, &instructorID, &categoryID, &createdAt,
			&instructorName, &categoryName, &enrolledAt, &progress)

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

		// 获取课程章节总数
		var totalChapters int
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM course_chapters WHERE course_id = ?
		`, id).Scan(&totalChapters)

		// 获取已完成章节数
		var completedChapters int
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM chapter_completions
			WHERE student_id = ? AND chapter_id IN (
				SELECT id FROM course_chapters WHERE course_id = ?
			)
		`, userID, id).Scan(&completedChapters)

		course["totalChapters"] = totalChapters
		course["completedChapters"] = completedChapters
		course["progress"] = progress

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

// UpdateProgress 更新学习进度
func UpdateProgress(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.Forbidden(c, "只有学生可以更新学习进度")
		return
	}

	var req struct {
		Progress int `json:"progress" binding:"required,min=0,max=100"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	// 检查是否已选课
	var enrolled bool
	err := database.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM course_enrollments
			WHERE student_id = ? AND course_id = ?
		)
	`, userID, courseID).Scan(&enrolled)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	if !enrolled {
		utils.BadRequest(c, "您未选修此课程")
		return
	}

	// 更新进度
	_, err = database.DB.Exec(`
		UPDATE course_enrollments
		SET progress = ?
		WHERE student_id = ? AND course_id = ?
	`, req.Progress, userID, courseID)

	if err != nil {
		utils.InternalServerError(c, "更新失败")
		return
	}

	utils.SuccessWithMessage(c, "进度已更新", nil)
}

// CompleteChapter 标记章节完成
func CompleteChapter(c *gin.Context) {
	chapterID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.Forbidden(c, "只有学生可以标记章节完成")
		return
	}

	// 检查章节是否存在
	var courseID int64
	err := database.DB.QueryRow(`
		SELECT course_id FROM course_chapters WHERE id = ?
	`, chapterID).Scan(&courseID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "章节不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	// 检查是否已选课
	var enrolled bool
	err = database.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM course_enrollments
			WHERE student_id = ? AND course_id = ?
		)
	`, userID, courseID).Scan(&enrolled)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	if !enrolled {
		utils.BadRequest(c, "您未选修此课程")
		return
	}

	// 插入或更新完成记录（使用 REPLACE 处理重复）
	_, err = database.DB.Exec(`
		INSERT OR REPLACE INTO chapter_completions (student_id, chapter_id, completed_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
	`, userID, chapterID)

	if err != nil {
		utils.InternalServerError(c, "标记失败")
		return
	}

	// 自动更新课程进度
	// 计算已完成章节数和总章节数
	var completedCount, totalCount int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM chapter_completions
		WHERE student_id = ? AND chapter_id IN (
			SELECT id FROM course_chapters WHERE course_id = ?
		)
	`, userID, courseID).Scan(&completedCount)

	database.DB.QueryRow(`
		SELECT COUNT(*) FROM course_chapters WHERE course_id = ?
	`, courseID).Scan(&totalCount)

	// 计算进度百分比
	progress := 0
	if totalCount > 0 {
		progress = (completedCount * 100) / totalCount
	}

	// 更新课程进度
	database.DB.Exec(`
		UPDATE course_enrollments
		SET progress = ?
		WHERE student_id = ? AND course_id = ?
	`, progress, userID, courseID)

	utils.Success(c, gin.H{
		"message":        "章节已标记为完成",
		"progress":       progress,
		"completedCount": completedCount,
		"totalCount":     totalCount,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// 课时（Section）管理
// ─────────────────────────────────────────────────────────────────────────────

// sectionRequest 创建/更新课时的请求体
type sectionRequest struct {
	Title      string  `json:"title" binding:"required"`
	Type       string  `json:"type"`    // VIDEO | TEXT
	OrderIndex int     `json:"orderIndex"`
	VideoURL   *string `json:"videoUrl"`  // 视频 URL（type=VIDEO 时填写）
	Content    *string `json:"content"`   // 文本内容（type=TEXT 时填写）
}

// checkSectionChapterPerm 检查操作课时的权限（必须是对应课程的教师或管理员）
func checkSectionChapterPerm(c *gin.Context, courseIDStr string, chapterID int64) (ok bool) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	var instructorID, chCourseID int64
	err := database.DB.QueryRow(`
		SELECT c.instructor_id, ch.course_id
		FROM course_chapters ch
		JOIN courses c ON ch.course_id = c.id
		WHERE ch.id = ?
	`, chapterID).Scan(&instructorID, &chCourseID)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "章节不存在")
		return false
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return false
	}
	courseID, err2 := strconv.ParseInt(courseIDStr, 10, 64)
	if err2 != nil || chCourseID != courseID {
		utils.NotFound(c, "章节不属于该课程")
		return false
	}
	if role != "ADMIN" && instructorID != userID.(int64) {
		utils.Forbidden(c, "权限不足")
		return false
	}
	return true
}

// GetChapterSections GET /api/v1/courses/:id/chapters/:cid/sections
func GetChapterSections(c *gin.Context) {
	courseIDStr := c.Param("id")
	chapterID := c.Param("cid")

	// 验证章节属于该课程
	var chapterExists bool
	database.DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM course_chapters WHERE id = ? AND course_id = ?)",
		chapterID, courseIDStr,
	).Scan(&chapterExists)
	if !chapterExists {
		utils.NotFound(c, "章节不存在")
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, chapter_id, title, order_index, type,
		       COALESCE(video_url, '') as video_url,
		       COALESCE(content, '') as content
		FROM course_sections
		WHERE chapter_id = ?
		ORDER BY order_index ASC
	`, chapterID)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	sections := []gin.H{}
	for rows.Next() {
		var id, chID int64
		var title, sType, videoURL, content string
		var orderIndex int

		if err := rows.Scan(&id, &chID, &title, &orderIndex, &sType, &videoURL, &content); err != nil {
			continue
		}

		s := gin.H{
			"id":         id,
			"chapterId":  chID,
			"title":      title,
			"orderIndex": orderIndex,
			"type":       sType,
		}
		if videoURL != "" {
			s["videoUrl"] = videoURL
		}
		if content != "" {
			s["content"] = content
		}
		sections = append(sections, s)
	}

	utils.Success(c, sections)
}

// CreateSection POST /api/v1/courses/:id/chapters/:cid/sections
func CreateSection(c *gin.Context) {
	chapterIDStr := c.Param("cid")
	chapterID, err := strconv.ParseInt(chapterIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的章节ID")
		return
	}

	if !checkSectionChapterPerm(c, c.Param("id"), chapterID) {
		return
	}

	var req sectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	sType := req.Type
	if sType == "" {
		sType = "VIDEO"
	}

	result, err := database.DB.Exec(`
		INSERT INTO course_sections (chapter_id, title, order_index, type, video_url, content)
		VALUES (?, ?, ?, ?, ?, ?)
	`, chapterID, req.Title, req.OrderIndex, sType, req.VideoURL, req.Content)

	if err != nil {
		utils.InternalServerError(c, "创建课时失败")
		return
	}

	sectionID, _ := result.LastInsertId()
	utils.Success(c, gin.H{
		"id":      sectionID,
		"message": "课时创建成功",
	})
}

// UpdateSection PUT /api/v1/courses/:id/chapters/:cid/sections/:sid
func UpdateSection(c *gin.Context) {
	chapterIDStr := c.Param("cid")
	sectionIDStr := c.Param("sid")

	chapterID, err := strconv.ParseInt(chapterIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的章节ID")
		return
	}

	if !checkSectionChapterPerm(c, c.Param("id"), chapterID) {
		return
	}

	var req sectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	sType := req.Type
	if sType == "" {
		sType = "VIDEO"
	}

	_, err = database.DB.Exec(`
		UPDATE course_sections
		SET title = ?, order_index = ?, type = ?, video_url = ?, content = ?
		WHERE id = ? AND chapter_id = ?
	`, req.Title, req.OrderIndex, sType, req.VideoURL, req.Content, sectionIDStr, chapterID)

	if err != nil {
		utils.InternalServerError(c, "更新课时失败")
		return
	}

	utils.SuccessWithMessage(c, "课时更新成功", nil)
}

// DeleteSection DELETE /api/v1/courses/:id/chapters/:cid/sections/:sid
func DeleteSection(c *gin.Context) {
	chapterIDStr := c.Param("cid")
	sectionIDStr := c.Param("sid")

	chapterID, err := strconv.ParseInt(chapterIDStr, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的章节ID")
		return
	}

	if !checkSectionChapterPerm(c, c.Param("id"), chapterID) {
		return
	}

	_, err = database.DB.Exec(
		"DELETE FROM course_sections WHERE id = ? AND chapter_id = ?",
		sectionIDStr, chapterID,
	)
	if err != nil {
		utils.InternalServerError(c, "删除课时失败")
		return
	}

	utils.SuccessWithMessage(c, "课时已删除", nil)
}

// GetCourseStudents 获取课程已选学生列表（教师/管理员）
func GetCourseStudents(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 验证课程属于该教师
	if role == "INSTRUCTOR" {
		var instructorID int64
		err := database.DB.QueryRow(`SELECT instructor_id FROM courses WHERE id = ?`, courseID).Scan(&instructorID)
		if err != nil {
			utils.NotFound(c, "课程不存在")
			return
		}
		if instructorID != userID.(int64) {
			utils.Forbidden(c, "权限不足")
			return
		}
	}

	rows, err := database.DB.Query(`
		SELECT u.id, u.username, u.email, u.avatar_url, u.full_name,
		       ce.enrolled_at, ce.progress
		FROM course_enrollments ce
		JOIN users u ON ce.student_id = u.id
		WHERE ce.course_id = ?
		ORDER BY ce.enrolled_at DESC
	`, courseID)
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	students := []gin.H{}
	for rows.Next() {
		var id int64
		var username string
		var email, avatarURL, fullName sql.NullString
		var enrolledAt sql.NullTime
		var progress sql.NullFloat64

		if err := rows.Scan(&id, &username, &email, &avatarURL, &fullName, &enrolledAt, &progress); err != nil {
			continue
		}
		students = append(students, gin.H{
			"id":         id,
			"username":   username,
			"email":      email.String,
			"avatarUrl":  avatarURL.String,
			"fullName":   fullName.String,
			"enrolledAt": enrolledAt.Time,
			"progress":   progress.Float64,
		})
	}

	utils.Success(c, gin.H{"students": students, "total": len(students)})
}


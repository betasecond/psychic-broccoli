package handlers

import (
	"database/sql"
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/models"
	"github.com/online-education-platform/backend/utils"
)

// CreateCourseRequest 创建课程请求
type CreateCourseRequest struct {
	Title         string  `json:"title" binding:"required"`
	Description   string  `json:"description" binding:"required"`
	CoverImageURL *string `json:"coverImageUrl"`
	CategoryID    *int64  `json:"categoryId"`
	Status        string  `json:"status"`
}

// UpdateCourseRequest 更新课程请求
type UpdateCourseRequest struct {
	Title         string  `json:"title" binding:"required"`
	Description   string  `json:"description"`
	CoverImageURL *string `json:"coverImageUrl"`
	CategoryID    *int64  `json:"categoryId"`
	Status        string  `json:"status"`
}

// CreateChapterRequest 创建章节请求
type CreateChapterRequest struct {
	Title      string `json:"title" binding:"required"`
	OrderIndex int    `json:"orderIndex"`
}

// GetCourses 获取课程列表
func GetCourses(c *gin.Context) {
	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	status := c.Query("status")
	categoryID := c.Query("categoryId")
	instructorID := c.Query("instructorId")
	role, _ := c.Get("role")
	userID, _ := c.Get("userID")

	// DEBUG: 输出调试信息
	fmt.Printf("[DEBUG] GetCourses - role type: %T, role value: %v, userID: %v\n", role, role, userID)

	// 处理role的类型断言，如果为nil则视为未认证的游客
	var roleStr string
	if role != nil {
		roleStr = role.(string)
	} else {
		roleStr = "GUEST" // 未认证用户视为游客
	}

	offset := (page - 1) * pageSize

	// 构建查询 - 如果是学生，直接在查询中JOIN course_enrollments获取enrolled状态
	query := `
		SELECT c.id, c.title, c.description, c.cover_image_url, c.instructor_id,
		       u.username as instructor_name, c.category_id,
		       COALESCE(cat.name, '') as category_name,
		       c.status, c.created_at, c.updated_at`

	// 如果是学生，添加enrolled字段到SELECT中
	if roleStr == "STUDENT" && userID != nil {
		query += `,
		       CASE WHEN ce.id IS NOT NULL THEN 1 ELSE 0 END as enrolled`
	}

	query += `
		FROM courses c
		LEFT JOIN users u ON c.instructor_id = u.id
		LEFT JOIN course_categories cat ON c.category_id = cat.id`

	// 如果是学生，LEFT JOIN course_enrollments表
	if roleStr == "STUDENT" && userID != nil {
		query += `
		LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.student_id = ?`
	}

	query += `
		WHERE 1=1
	`
	args := []interface{}{}

	// 如果是学生，添加userID到args
	if roleStr == "STUDENT" && userID != nil {
		args = append(args, userID)
	}

	// 权限过滤：如果没有指定status，根据角色设置默认值
	if status != "" {
		query += " AND c.status = ?"
		args = append(args, status)
	} else {
		// 游客和学生只能看到已发布的课程
		if roleStr == "GUEST" || roleStr == "STUDENT" {
			query += " AND c.status = 'PUBLISHED'"
		} else if roleStr == "INSTRUCTOR" {
			// 教师可以看到自己的所有状态课程，或其他人已发布的课程
			query += " AND (c.instructor_id = ? OR c.status = 'PUBLISHED')"
			args = append(args, userID)
		}
		// ADMIN 可以看到所有课程，不需要额外过滤
	}

	if categoryID != "" {
		query += " AND c.category_id = ?"
		args = append(args, categoryID)
	}
	if instructorID != "" {
		query += " AND c.instructor_id = ?"
		args = append(args, instructorID)
	}

	query += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	courses := []models.Course{}
	for rows.Next() {
		var course models.Course

		// 如果是学生，Scan时包含enrolled字段
		if roleStr == "STUDENT" && userID != nil {
			var enrolledInt int
			err := rows.Scan(
				&course.ID, &course.Title, &course.Description, &course.CoverImageURL,
				&course.InstructorID, &course.InstructorName, &course.CategoryID,
				&course.CategoryName, &course.Status, &course.CreatedAt, &course.UpdatedAt,
				&enrolledInt,
			)
			if err != nil {
				fmt.Printf("[ERROR] Failed to scan course row: %v\n", err)
				continue
			}
			course.Enrolled = enrolledInt == 1
		} else {
			err := rows.Scan(
				&course.ID, &course.Title, &course.Description, &course.CoverImageURL,
				&course.InstructorID, &course.InstructorName, &course.CategoryID,
				&course.CategoryName, &course.Status, &course.CreatedAt, &course.UpdatedAt,
			)
			if err != nil {
				fmt.Printf("[ERROR] Failed to scan course row: %v\n", err)
				continue
			}
		}

		courses = append(courses, course)
	}

	// 获取总数（使用相同的过滤条件）
	countQuery := "SELECT COUNT(*) FROM courses WHERE 1=1"
	countArgs := []interface{}{}

	if status != "" {
		countQuery += " AND status = ?"
		countArgs = append(countArgs, status)
	} else {
		if roleStr == "GUEST" || roleStr == "STUDENT" {
			countQuery += " AND status = 'PUBLISHED'"
		} else if roleStr == "INSTRUCTOR" {
			countQuery += " AND (instructor_id = ? OR status = 'PUBLISHED')"
			countArgs = append(countArgs, userID)
		}
	}

	if categoryID != "" {
		countQuery += " AND category_id = ?"
		countArgs = append(countArgs, categoryID)
	}
	if instructorID != "" {
		countQuery += " AND instructor_id = ?"
		countArgs = append(countArgs, instructorID)
	}

	var total int
	database.DB.QueryRow(countQuery, countArgs...).Scan(&total)

	utils.Success(c, gin.H{
		"courses": courses,
		"total":   total,
		"page":    page,
		"pageSize": pageSize,
	})
}

// CreateCourse 创建课程
func CreateCourse(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 只有教师和管理员可以创建课程
	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	var req CreateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	status := req.Status
	if status == "" {
		status = "DRAFT"
	}

	result, err := database.DB.Exec(`
		INSERT INTO courses (title, description, cover_image_url, instructor_id, category_id, status)
		VALUES (?, ?, ?, ?, ?, ?)
	`, req.Title, req.Description, req.CoverImageURL, userID, req.CategoryID, status)

	if err != nil {
		utils.InternalServerError(c, "创建课程失败")
		return
	}

	courseID, _ := result.LastInsertId()

	utils.Success(c, gin.H{
		"id": courseID,
	})
}

// GetCourse 获取课程详情
func GetCourse(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	var course models.Course

	// 学生查询时同时检查选课状态
	if role == "STUDENT" && userID != nil {
		var enrolledInt int
		err := database.DB.QueryRow(`
			SELECT c.id, c.title, c.description, c.cover_image_url, c.instructor_id,
			       u.username as instructor_name, c.category_id,
			       COALESCE(cat.name, '') as category_name,
			       c.status, c.created_at, c.updated_at,
			       CASE WHEN ce.id IS NOT NULL THEN 1 ELSE 0 END as enrolled
			FROM courses c
			LEFT JOIN users u ON c.instructor_id = u.id
			LEFT JOIN course_categories cat ON c.category_id = cat.id
			LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.student_id = ?
			WHERE c.id = ?
		`, userID, courseID).Scan(
			&course.ID, &course.Title, &course.Description, &course.CoverImageURL,
			&course.InstructorID, &course.InstructorName, &course.CategoryID,
			&course.CategoryName, &course.Status, &course.CreatedAt, &course.UpdatedAt,
			&enrolledInt,
		)
		if err == sql.ErrNoRows {
			utils.NotFound(c, "课程不存在")
			return
		}
		if err != nil {
			utils.InternalServerError(c, "查询失败")
			return
		}
		course.Enrolled = enrolledInt == 1
		utils.Success(c, course)
		return
	}

	// 非学生：不含选课状态
	err := database.DB.QueryRow(`
		SELECT c.id, c.title, c.description, c.cover_image_url, c.instructor_id,
		       u.username as instructor_name, c.category_id,
		       COALESCE(cat.name, '') as category_name,
		       c.status, c.created_at, c.updated_at
		FROM courses c
		LEFT JOIN users u ON c.instructor_id = u.id
		LEFT JOIN course_categories cat ON c.category_id = cat.id
		WHERE c.id = ?
	`, courseID).Scan(
		&course.ID, &course.Title, &course.Description, &course.CoverImageURL,
		&course.InstructorID, &course.InstructorName, &course.CategoryID,
		&course.CategoryName, &course.Status, &course.CreatedAt, &course.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "课程不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}

	utils.Success(c, course)
}

// UpdateCourse 更新课程
func UpdateCourse(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 检查权限
	var instructorID int64
	err := database.DB.QueryRow("SELECT instructor_id FROM courses WHERE id = ?", courseID).Scan(&instructorID)
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

	var req UpdateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	_, err = database.DB.Exec(`
		UPDATE courses 
		SET title = ?, description = ?, cover_image_url = ?, category_id = ?, 
		    status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Title, req.Description, req.CoverImageURL, req.CategoryID, req.Status, courseID)

	if err != nil {
		utils.InternalServerError(c, "更新失败")
		return
	}

	utils.SuccessWithMessage(c, "更新成功", nil)
}

// DeleteCourse 删除课程
func DeleteCourse(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 检查权限
	var instructorID int64
	err := database.DB.QueryRow("SELECT instructor_id FROM courses WHERE id = ?", courseID).Scan(&instructorID)
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

	_, err = database.DB.Exec("DELETE FROM courses WHERE id = ?", courseID)
	if err != nil {
		utils.InternalServerError(c, "删除失败")
		return
	}

	utils.SuccessWithMessage(c, "删除成功", nil)
}

// EnrollCourse 学生选课
func EnrollCourse(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "STUDENT" {
		utils.BadRequest(c, "只有学生可以选课")
		return
	}

	// 检查课程是否存在且已发布
	var status string
	err := database.DB.QueryRow("SELECT status FROM courses WHERE id = ?", courseID).Scan(&status)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "课程不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	if status != "PUBLISHED" {
		utils.BadRequest(c, "课程未发布")
		return
	}

	// 检查是否已选课
	var count int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM course_enrollments 
		WHERE student_id = ? AND course_id = ?
	`, userID, courseID).Scan(&count)

	if count > 0 {
		utils.BadRequest(c, "已选过该课程")
		return
	}

	// 插入选课记录
	_, err = database.DB.Exec(`
		INSERT INTO course_enrollments (student_id, course_id)
		VALUES (?, ?)
	`, userID, courseID)

	if err != nil {
		utils.InternalServerError(c, "选课失败")
		return
	}

	utils.SuccessWithMessage(c, "选课成功", nil)
}

// GetCourseChapters 获取课程章节
func GetCourseChapters(c *gin.Context) {
	courseID := c.Param("id")

	rows, err := database.DB.Query(`
		SELECT id, course_id, title, order_index
		FROM course_chapters
		WHERE course_id = ?
		ORDER BY order_index
	`, courseID)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	chapters := []models.CourseChapter{}
	for rows.Next() {
		var chapter models.CourseChapter
		rows.Scan(&chapter.ID, &chapter.CourseID, &chapter.Title, &chapter.OrderIndex)
		chapters = append(chapters, chapter)
	}

	utils.Success(c, chapters)
}

// CreateChapter 创建章节
func CreateChapter(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 检查权限
	var instructorID int64
	err := database.DB.QueryRow("SELECT instructor_id FROM courses WHERE id = ?", courseID).Scan(&instructorID)
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

	var req CreateChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 检查 order_index 是否已被占用
	var existingCount int
	database.DB.QueryRow(
		"SELECT COUNT(*) FROM course_chapters WHERE course_id = ? AND order_index = ?",
		courseID, req.OrderIndex,
	).Scan(&existingCount)
	if existingCount > 0 {
		utils.BadRequest(c, "该排序位置已被占用")
		return
	}

	result, err := database.DB.Exec(`
		INSERT INTO course_chapters (course_id, title, order_index)
		VALUES (?, ?, ?)
	`, courseID, req.Title, req.OrderIndex)

	if err != nil {
		utils.InternalServerError(c, "创建章节失败")
		return
	}

	chapterID, _ := result.LastInsertId()

	utils.Success(c, gin.H{
		"id": chapterID,
	})
}

// GetCategories 获取课程分类
func GetCategories(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, name, description
		FROM course_categories
		ORDER BY name
	`)

	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	categories := []models.CourseCategory{}
	for rows.Next() {
		var category models.CourseCategory
		rows.Scan(&category.ID, &category.Name, &category.Description)
		categories = append(categories, category)
	}

	utils.Success(c, categories)
}


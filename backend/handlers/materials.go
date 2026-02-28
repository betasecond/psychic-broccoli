package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
)

// GetCourseMaterials GET /api/v1/courses/:id/materials
func GetCourseMaterials(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// 教师只能查看自己课程的资料
	if role == "INSTRUCTOR" {
		var instructorID int64
		if err := database.DB.QueryRow(`SELECT instructor_id FROM courses WHERE id = ?`, courseID).Scan(&instructorID); err != nil {
			utils.NotFound(c, "课程不存在")
			return
		}
		if instructorID != userID.(int64) {
			utils.Forbidden(c, "权限不足")
			return
		}
	}

	rows, err := database.DB.Query(`
		SELECT m.id, m.course_id, m.uploader_id, m.name, m.url, m.size, m.created_at,
		       u.username, c.title
		FROM course_materials m
		JOIN users u ON m.uploader_id = u.id
		JOIN courses c ON m.course_id = c.id
		WHERE m.course_id = ?
		ORDER BY m.created_at DESC
	`, courseID)
	if err != nil {
		utils.InternalServerError(c, "获取资料列表失败")
		return
	}
	defer rows.Close()

	materials := []gin.H{}
	for rows.Next() {
		var id, courseId, uploaderID int64
		var name, url, uploaderName, courseTitle string
		var size int64
		var createdAt string
		if err := rows.Scan(&id, &courseId, &uploaderID, &name, &url, &size, &createdAt, &uploaderName, &courseTitle); err != nil {
			continue
		}
		materials = append(materials, gin.H{
			"id":           id,
			"courseId":     courseId,
			"uploaderID":   uploaderID,
			"uploaderName": uploaderName,
			"name":         name,
			"url":          url,
			"size":         size,
			"courseTitle":  courseTitle,
			"createdAt":    createdAt,
		})
	}

	utils.Success(c, gin.H{"materials": materials, "total": len(materials)})
}

// UploadCourseMaterial POST /api/v1/courses/:id/materials
func UploadCourseMaterial(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "只有教师可以上传课程资料")
		return
	}

	if role == "INSTRUCTOR" {
		var instructorID int64
		if err := database.DB.QueryRow(`SELECT instructor_id FROM courses WHERE id = ?`, courseID).Scan(&instructorID); err != nil {
			utils.NotFound(c, "课程不存在")
			return
		}
		if instructorID != userID.(int64) {
			utils.Forbidden(c, "权限不足")
			return
		}
	}

	file, err := c.FormFile("file")
	if err != nil {
		utils.BadRequest(c, "请选择要上传的文件")
		return
	}

	if file.Size > maxFileSize {
		utils.BadRequest(c, fmt.Sprintf("文件大小不能超过 %.0f MB", float64(maxFileSize)/(1024*1024)))
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedFileTypes[ext] {
		utils.BadRequest(c, "不支持的文件类型："+ext)
		return
	}

	uploadDir := filepath.Join("public", "materials")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.InternalServerError(c, "创建上传目录失败")
		return
	}

	timestamp := time.Now().Format("20060102150405")
	filename := fmt.Sprintf("%s_%v_%s", timestamp, userID, file.Filename)
	filePath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		utils.InternalServerError(c, "保存文件失败")
		return
	}

	fileURL := fmt.Sprintf("/public/materials/%s", filename)

	result, err := database.DB.Exec(`
		INSERT INTO course_materials (course_id, uploader_id, name, url, size)
		VALUES (?, ?, ?, ?, ?)
	`, courseID, userID, file.Filename, fileURL, file.Size)
	if err != nil {
		// 回滚文件
		os.Remove(filePath)
		utils.InternalServerError(c, "保存资料记录失败")
		return
	}

	id, _ := result.LastInsertId()
	utils.Success(c, gin.H{
		"id":        id,
		"name":      file.Filename,
		"url":       fileURL,
		"size":      file.Size,
		"createdAt": time.Now().Format("2006-01-02T15:04:05Z"),
	})
}

// DeleteCourseMaterial DELETE /api/v1/courses/:id/materials/:mid
func DeleteCourseMaterial(c *gin.Context) {
	courseID := c.Param("id")
	materialID := c.Param("mid")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 获取资料信息
	var url string
	var uploaderID int64
	var matCourseID int64
	err := database.DB.QueryRow(`SELECT url, uploader_id, course_id FROM course_materials WHERE id = ?`, materialID).
		Scan(&url, &uploaderID, &matCourseID)
	if err != nil {
		utils.NotFound(c, "资料不存在")
		return
	}

	// 确认课程归属（INSTRUCTOR 只能删除自己课程的资料）
	if role == "INSTRUCTOR" {
		var instructorID int64
		if err := database.DB.QueryRow(`SELECT instructor_id FROM courses WHERE id = ?`, courseID).Scan(&instructorID); err != nil {
			utils.NotFound(c, "课程不存在")
			return
		}
		if instructorID != userID.(int64) {
			utils.Forbidden(c, "权限不足")
			return
		}
	}

	// 删数据库记录
	if _, err := database.DB.Exec(`DELETE FROM course_materials WHERE id = ?`, materialID); err != nil {
		utils.InternalServerError(c, "删除失败")
		return
	}

	// 删文件（忽略文件不存在的错误）
	filePath := filepath.Join(".", url)
	os.Remove(filePath)

	utils.Success(c, gin.H{"message": "资料已删除"})
}

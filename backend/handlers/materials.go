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
    courseID, ok := parseInt64Param(c, c.Param("id"), "课程ID")
    if !ok {
        return
    }
    if !ensureCourseAccessible(c, courseID, "没有权限查看该课程资料") {
        return
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
        var id, materialCourseID, uploaderID int64
        var name, url, uploaderName, courseTitle string
        var size int64
        var createdAt string
        if err := rows.Scan(&id, &materialCourseID, &uploaderID, &name, &url, &size, &createdAt, &uploaderName, &courseTitle); err != nil {
            continue
        }
        materials = append(materials, gin.H{
            "id":           id,
            "courseId":     materialCourseID,
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
    courseID, ok := parseInt64Param(c, c.Param("id"), "课程ID")
    if !ok {
        return
    }
    if !ensureCourseInstructorOrAdmin(c, courseID, "只有课程教师或管理员可以上传课程资料") {
        return
    }

    userID, _ := c.Get("userID")

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
        utils.BadRequest(c, "不支持的文件类型: "+ext)
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
        _ = os.Remove(filePath)
        utils.InternalServerError(c, "保存资料记录失败")
        return
    }

    id, _ := result.LastInsertId()
    utils.Success(c, gin.H{
        "id":        id,
        "name":      file.Filename,
        "url":       fileURL,
        "size":      file.Size,
        "createdAt": time.Now().Format(time.RFC3339),
    })
}

// DeleteCourseMaterial DELETE /api/v1/courses/:id/materials/:mid
func DeleteCourseMaterial(c *gin.Context) {
    courseID, ok := parseInt64Param(c, c.Param("id"), "课程ID")
    if !ok {
        return
    }
    if !ensureCourseInstructorOrAdmin(c, courseID, "只有课程教师或管理员可以删除课程资料") {
        return
    }

    materialID := c.Param("mid")

    var url string
    var materialCourseID int64
    err := database.DB.QueryRow(`SELECT url, course_id FROM course_materials WHERE id = ?`, materialID).
        Scan(&url, &materialCourseID)
    if err != nil {
        utils.NotFound(c, "资料不存在")
        return
    }
    if materialCourseID != courseID {
        utils.Forbidden(c, "资料不属于当前课程")
        return
    }

    if _, err := database.DB.Exec(`DELETE FROM course_materials WHERE id = ?`, materialID); err != nil {
        utils.InternalServerError(c, "删除失败")
        return
    }

    filePath := filepath.Join(".", url)
    _ = os.Remove(filePath)

    utils.Success(c, gin.H{"message": "资料已删除"})
}
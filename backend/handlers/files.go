package handlers

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/utils"
)

// 允许的文件类型
var allowedFileTypes = map[string]bool{
	// 文档
	".pdf":  true,
	".doc":  true,
	".docx": true,
	".xls":  true,
	".xlsx": true,
	".ppt":  true,
	".pptx": true,
	".txt":  true,
	".md":   true,
	// 图片
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".bmp":  true,
	".svg":  true,
	// 压缩包
	".zip": true,
	".rar": true,
	".7z":  true,
	// 代码文件
	".html": true,
	".css":  true,
	".js":   true,
	".json": true,
	".xml":  true,
	".go":   true,
	".py":   true,
	".java": true,
	".c":    true,
	".cpp":  true,
}

// 图片类型（头像和封面只允许图片）
var allowedImageTypes = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".bmp":  true,
	".webp": true,
}

// 文件大小限制
const maxFileSize = 10 * 1024 * 1024  // 10MB（普通文件）
const maxImageSize = 5 * 1024 * 1024  // 5MB（图片）
const maxAvatarSize = 2 * 1024 * 1024 // 2MB（头像）

// getUploadConfig 根据类型返回上传目录、大小限制和允许的文件类型
func getUploadConfig(uploadType string) (string, int64, map[string]bool) {
	switch uploadType {
	case "avatar":
		return filepath.Join("public", "avatars"), maxAvatarSize, allowedImageTypes
	case "cover":
		return filepath.Join("public", "covers"), maxImageSize, allowedImageTypes
	default:
		return filepath.Join("public", "assignments"), maxFileSize, allowedFileTypes
	}
}

// UploadFile 上传单个文件（支持 type 参数：avatar/cover/assignment）
func UploadFile(c *gin.Context) {
	// 获取用户ID（用于权限验证）
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 获取上传类型（默认为 assignment）
	uploadType := c.DefaultQuery("type", "assignment")

	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		utils.BadRequest(c, "请选择要上传的文件")
		return
	}

	// 获取上传配置
	uploadDir, sizeLimit, typeWhitelist := getUploadConfig(uploadType)

	// 检查文件大小
	if file.Size > sizeLimit {
		utils.BadRequest(c, fmt.Sprintf("文件大小不能超过 %.2f MB", float64(sizeLimit)/(1024*1024)))
		return
	}

	// 检查文件类型
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !typeWhitelist[ext] {
		utils.BadRequest(c, "不支持的文件类型："+ext)
		return
	}

	// 确保上传目录存在
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.InternalServerError(c, "创建上传目录失败")
		return
	}

	// 生成唯一文件名：时间戳_用户ID_原文件名
	timestamp := time.Now().Format("20060102150405")
	filename := fmt.Sprintf("%s_%v_%s", timestamp, userID, file.Filename)
	filePath := filepath.Join(uploadDir, filename)

	// 保存文件
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		utils.InternalServerError(c, "保存文件失败")
		return
	}

	// 返回文件访问URL（使用 /public/ 前缀）
	subDir := filepath.Base(uploadDir)
	fileURL := fmt.Sprintf("/public/%s/%s", subDir, filename)
	utils.Success(c, gin.H{
		"url":      fileURL,
		"filename": file.Filename,
		"size":     file.Size,
	})
}

// UploadFiles 上传多个文件
func UploadFiles(c *gin.Context) {
	// 获取用户ID（用于权限验证）
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 解析multipart表单
	form, err := c.MultipartForm()
	if err != nil {
		utils.BadRequest(c, "解析表单失败")
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		utils.BadRequest(c, "请选择要上传的文件")
		return
	}

	// 限制一次最多上传5个文件
	if len(files) > 5 {
		utils.BadRequest(c, "一次最多上传5个文件")
		return
	}

	// 确保上传目录存在
	uploadDir := filepath.Join("public", "assignments")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.InternalServerError(c, "创建上传目录失败")
		return
	}

	uploadedFiles := []gin.H{}
	failedFiles := []string{}

	for _, file := range files {
		// 检查文件大小
		if file.Size > maxFileSize {
			failedFiles = append(failedFiles, fmt.Sprintf("%s (文件过大)", file.Filename))
			continue
		}

		// 检查文件类型
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if !allowedFileTypes[ext] {
			failedFiles = append(failedFiles, fmt.Sprintf("%s (不支持的类型)", file.Filename))
			continue
		}

		// 生成唯一文件名
		timestamp := time.Now().Format("20060102150405")
		filename := fmt.Sprintf("%s_%v_%s", timestamp, userID, file.Filename)
		filePath := filepath.Join(uploadDir, filename)

		// 保存文件
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			failedFiles = append(failedFiles, fmt.Sprintf("%s (保存失败)", file.Filename))
			continue
		}

		// 添加到成功列表
		fileURL := fmt.Sprintf("/public/assignments/%s", filename)
		uploadedFiles = append(uploadedFiles, gin.H{
			"url":      fileURL,
			"filename": file.Filename,
			"size":     file.Size,
		})
	}

	utils.Success(c, gin.H{
		"files":       uploadedFiles,
		"failedFiles": failedFiles,
		"message":     fmt.Sprintf("成功上传%d个文件，失败%d个", len(uploadedFiles), len(failedFiles)),
	})
}

// DeleteFile 删除文件
func DeleteFile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	role, _ := c.Get("role")

	// 获取文件路径参数
	fileURL := c.Query("url")
	if fileURL == "" {
		utils.BadRequest(c, "请提供文件URL")
		return
	}

	// 验证文件路径格式（必须是/public/开头的合法子目录）
	validPrefixes := []string{
		"/public/assignments/",
		"/public/avatars/",
		"/public/covers/",
	}

	isValid := false
	for _, prefix := range validPrefixes {
		if strings.HasPrefix(fileURL, prefix) {
			isValid = true
			break
		}
	}

	if !isValid {
		utils.BadRequest(c, "无效的文件路径")
		return
	}

	// 从文件名中提取上传者ID，验证只能删除自己上传的文件
	// 文件名格式：{时间戳}_{用户ID}_{原文件名}
	filename := filepath.Base(fileURL)
	parts := strings.SplitN(filename, "_", 3)
	if len(parts) >= 2 && role != "ADMIN" {
		fileOwnerID := parts[1]
		currentUserID := fmt.Sprintf("%v", userID)
		if fileOwnerID != currentUserID {
			utils.Forbidden(c, "无权删除他人上传的文件")
			return
		}
	}

	// 构建实际文件路径
	filePath := filepath.Join(".", fileURL)

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		utils.NotFound(c, "文件不存在")
		return
	}

	// 删除文件
	if err := os.Remove(filePath); err != nil {
		utils.InternalServerError(c, "删除文件失败")
		return
	}

	utils.Success(c, gin.H{
		"message": "文件删除成功",
	})
}

// validateFile 验证单个文件（辅助函数）
func validateFile(file *multipart.FileHeader) error {
	// 检查文件大小
	if file.Size > maxFileSize {
		return fmt.Errorf("文件大小不能超过 %.2f MB", float64(maxFileSize)/(1024*1024))
	}

	// 检查文件类型
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedFileTypes[ext] {
		return fmt.Errorf("不支持的文件类型：%s", ext)
	}

	return nil
}

// saveFile 保存单个文件（辅助函数）
func saveFile(c *gin.Context, file *multipart.FileHeader, userID interface{}) (string, error) {
	// 确保上传目录存在
	uploadDir := filepath.Join("public", "assignments")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", err
	}

	// 生成唯一文件名
	timestamp := time.Now().Format("20060102150405")
	filename := fmt.Sprintf("%s_%v_%s", timestamp, userID, file.Filename)
	filePath := filepath.Join(uploadDir, filename)

	// 打开源文件
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// 创建目标文件
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// 复制文件内容
	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	// 返回文件URL
	return fmt.Sprintf("/public/assignments/%s", filename), nil
}

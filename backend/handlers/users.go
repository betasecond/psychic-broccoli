package handlers

import (
    "fmt"
    "path/filepath"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/online-education-platform/backend/database"
    "github.com/online-education-platform/backend/utils"
    "github.com/xuri/excelize/v2"
    "golang.org/x/crypto/bcrypt"
)

// ImportUsersFromExcel 从Excel批量导入用户
func ImportUsersFromExcel(c *gin.Context) {
	role, _ := c.Get("role")

	// 只有管理员可以批量导入
	if role != "ADMIN" {
		utils.Forbidden(c, "只有管理员可以批量导入用户")
		return
	}

	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		utils.BadRequest(c, "请上传Excel文件")
		return
	}

    // 检查文件扩展名（仅支持 .xlsx）
    ext := filepath.Ext(file.Filename)
    if ext != ".xlsx" {
        utils.BadRequest(c, "只支持Excel文件(.xlsx)")
        return
    }

	// 保存临时文件
	tempPath := filepath.Join("database", "temp_upload.xlsx")
	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		utils.InternalServerError(c, "保存文件失败")
		return
	}

	// 打开Excel文件
	f, err := excelize.OpenFile(tempPath)
	if err != nil {
		utils.InternalServerError(c, "读取Excel文件失败")
		return
	}
	defer f.Close()

	// 获取第一个工作表
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		utils.InternalServerError(c, "读取Excel数据失败")
		return
	}

    if len(rows) < 2 {
        utils.BadRequest(c, "Excel模板为空或仅包含表头，请至少填写一行数据后再上传")
        return
    }

	// 解析并导入用户
	successCount := 0
	errorCount := 0
	errors := []string{}

	// 从第二行开始（跳过标题行）
	for i, row := range rows {
		if i == 0 {
			continue // 跳过标题行
		}

		if len(row) < 3 {
			errors = append(errors, fmt.Sprintf("第%d行: 数据不完整", i+1))
			errorCount++
			continue
		}

        username := row[0]
        password := row[1]
		userRole := row[2]

		// 验证角色
		if userRole != "STUDENT" && userRole != "INSTRUCTOR" && userRole != "ADMIN" {
			errors = append(errors, fmt.Sprintf("第%d行: 无效的角色 %s", i+1, userRole))
			errorCount++
			continue
		}

		// 检查用户名是否已存在
		var count int
		database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", username).Scan(&count)
		if count > 0 {
			errors = append(errors, fmt.Sprintf("第%d行: 用户名 %s 已存在", i+1, username))
			errorCount++
			continue
		}

        // 密码留空则设置默认密码
        if strings.TrimSpace(password) == "" {
            password = "jimei123"
        }

        // 加密密码
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			errors = append(errors, fmt.Sprintf("第%d行: 密码加密失败", i+1))
			errorCount++
			continue
		}

		// 可选的email和avatar_url
		var email, avatarURL *string
		if len(row) > 3 && row[3] != "" {
			email = &row[3]
		}
		if len(row) > 4 && row[4] != "" {
			avatarURL = &row[4]
		}

		// 插入用户
		_, err = database.DB.Exec(`
			INSERT INTO users (username, password_hash, role, email, avatar_url)
			VALUES (?, ?, ?, ?, ?)
		`, username, string(hashedPassword), userRole, email, avatarURL)

		if err != nil {
			errors = append(errors, fmt.Sprintf("第%d行: 插入数据库失败 - %v", i+1, err))
			errorCount++
			continue
		}

		successCount++
	}

	utils.Success(c, gin.H{
		"successCount": successCount,
		"errorCount":   errorCount,
		"errors":       errors,
		"message":      fmt.Sprintf("成功导入%d个用户，失败%d个", successCount, errorCount),
	})
}

// DownloadUserTemplate 下载用户导入模板
func DownloadUserTemplate(c *gin.Context) {
	role, _ := c.Get("role")

    // 管理员与教师可以下载模板（导入仍仅限管理员）
    if role != "ADMIN" && role != "INSTRUCTOR" {
        utils.Forbidden(c, "只有管理员或教师可以下载模板")
		return
	}

	// 创建新的Excel文件
	f := excelize.NewFile()
	defer f.Close()

	// 设置表头
	sheetName := "用户导入模板"
	index, _ := f.NewSheet(sheetName)
	f.SetActiveSheet(index)

	// 设置列宽
	f.SetColWidth(sheetName, "A", "E", 20)

    // 设置表头
    headers := []string{"用户名", "密码(留空=默认jimei123)", "角色", "邮箱(可选)", "头像URL(可选)"}
	for i, header := range headers {
		cell := string(rune('A'+i)) + "1"
		f.SetCellValue(sheetName, cell, header)
	}

	// 添加示例数据
	examples := [][]string{
		{"student01", "password123", "STUDENT", "student01@example.com", "https://i.pravatar.cc/150?u=student01"},
		{"teacher01", "password123", "INSTRUCTOR", "teacher01@example.com", "https://i.pravatar.cc/150?u=teacher01"},
		{"admin01", "password123", "ADMIN", "admin01@example.com", "https://i.pravatar.cc/150?u=admin01"},
	}

	for i, example := range examples {
		for j, value := range example {
			cell := string(rune('A'+j)) + fmt.Sprintf("%d", i+2)
			f.SetCellValue(sheetName, cell, value)
		}
	}

	// 添加说明sheet
	instructionSheet := "使用说明"
	f.NewSheet(instructionSheet)
    instructions := []string{
        "用户批量导入说明",
        "",
        "1. 必填字段：用户名、角色；密码列可留空，留空将使用默认密码 jimei123",
        "2. 角色只能是以下三种之一：STUDENT（学生）、INSTRUCTOR（教师）、ADMIN（管理员）",
        "3. 邮箱和头像URL为可选字段",
        "4. 仅支持 .xlsx 文件格式，请勿使用 .xls",
        "5. 用户名不能重复",
        "6. 请按照模板格式填写，不要修改表头",
        "7. 填写完成后，在系统中上传此Excel文件即可",
    }

	for i, instruction := range instructions {
		cell := "A" + fmt.Sprintf("%d", i+1)
		f.SetCellValue(instructionSheet, cell, instruction)
	}

	// 设置响应头
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=user_import_template.xlsx")

	// 写入响应
	if err := f.Write(c.Writer); err != nil {
		utils.InternalServerError(c, "生成模板失败")
		return
	}
}


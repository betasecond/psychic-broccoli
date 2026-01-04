package handlers

import (
	"database/sql"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/models"
	"github.com/online-education-platform/backend/utils"
	"golang.org/x/crypto/bcrypt"
)

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	AccessToken string       `json:"accessToken"`
	TokenType   string       `json:"tokenType"`
	User        *models.User `json:"user"`
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username        string `json:"username" binding:"required,min=3,max=50"`
	Password        string `json:"password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirmPassword" binding:"required"`
	Role            string `json:"role"`
}

// UpdateProfileRequest 更新资料请求
type UpdateProfileRequest struct {
	Email     *string `json:"email"`
	AvatarURL *string `json:"avatarUrl"`
	FullName  *string `json:"fullName"`
	Phone     *string `json:"phone"`
	Gender    *string `json:"gender"`
	Bio       *string `json:"bio"`
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

// Login 用户登录
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 查询用户
	var user models.User
	err := database.DB.QueryRow(`
		SELECT id, username, password_hash, email, avatar_url, role, created_at, updated_at
		FROM users WHERE username = ?
	`, req.Username).Scan(
		&user.ID, &user.Username, &user.PasswordHash,
		&user.Email, &user.AvatarURL, &user.Role,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		utils.Unauthorized(c, "用户名或密码错误")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		utils.Unauthorized(c, "用户名或密码错误")
		return
	}

	// 生成JWT token
	token, err := utils.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		utils.InternalServerError(c, "生成令牌失败")
		return
	}

	// 返回响应
	utils.Success(c, LoginResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		User:        &user,
	})
}

// Register 用户注册
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 验证密码匹配
	if req.Password != req.ConfirmPassword {
		utils.BadRequest(c, "两次密码输入不一致")
		return
	}

	// 验证角色
	role := req.Role
	if role == "" {
		role = "STUDENT"
	}
	if role != "STUDENT" && role != "INSTRUCTOR" {
		utils.BadRequest(c, "无效的角色类型")
		return
	}

	// 检查用户名是否已存在
	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", req.Username).Scan(&count)
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}
	if count > 0 {
		utils.BadRequest(c, "用户名已存在")
		return
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.InternalServerError(c, "密码加密失败")
		return
	}

	// 插入用户
	result, err := database.DB.Exec(`
		INSERT INTO users (username, password_hash, role)
		VALUES (?, ?, ?)
	`, req.Username, string(hashedPassword), role)
	if err != nil {
		utils.InternalServerError(c, "创建用户失败")
		return
	}

	userID, _ := result.LastInsertId()

	// 返回响应
	utils.Success(c, gin.H{
		"userId":   userID,
		"username": req.Username,
	})
}

// GetCurrentUser 获取当前用户信息
func GetCurrentUser(c *gin.Context) {
	userID, _ := c.Get("userID")

	var user models.User
	err := database.DB.QueryRow(`
		SELECT id, username, email, avatar_url, full_name, phone, gender, bio, role, created_at, updated_at
		FROM users WHERE id = ?
	`, userID).Scan(
		&user.ID, &user.Username, &user.Email, &user.AvatarURL,
		&user.FullName, &user.Phone, &user.Gender, &user.Bio, 
		&user.Role, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		utils.NotFound(c, "用户不存在")
		return
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	utils.Success(c, user)
}

// UpdateProfile 更新用户资料
func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 更新用户信息
	_, err := database.DB.Exec(`
		UPDATE users SET email = ?, avatar_url = ?, full_name = ?, phone = ?, gender = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Email, req.AvatarURL, req.FullName, req.Phone, req.Gender, req.Bio, userID)

	if err != nil {
		utils.InternalServerError(c, "更新失败")
		return
	}

	// 返回更新后的用户信息
	var user models.User
	database.DB.QueryRow(`
		SELECT id, username, email, avatar_url, full_name, phone, gender, bio, role, created_at, updated_at
		FROM users WHERE id = ?
	`, userID).Scan(
		&user.ID, &user.Username, &user.Email, &user.AvatarURL,
		&user.FullName, &user.Phone, &user.Gender, &user.Bio, 
		&user.Role, &user.CreatedAt, &user.UpdatedAt,
	)

	utils.Success(c, user)
}

// ChangePassword 修改密码
func ChangePassword(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请求参数错误")
		return
	}

	// 获取当前密码哈希
	var currentHash string
	err := database.DB.QueryRow("SELECT password_hash FROM users WHERE id = ?", userID).Scan(&currentHash)
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	// 验证当前密码
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		utils.BadRequest(c, "当前密码错误")
		return
	}

	// 加密新密码
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		utils.InternalServerError(c, "密码加密失败")
		return
	}

	// 更新密码
	_, err = database.DB.Exec(`
		UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, string(newHash), userID)

	if err != nil {
		utils.InternalServerError(c, "修改密码失败")
		return
	}

	utils.SuccessWithMessage(c, "密码修改成功", nil)
}

// CheckUsernameAvailability 检查用户名可用性
func CheckUsernameAvailability(c *gin.Context) {
	username := c.Query("username")
	if username == "" {
		utils.BadRequest(c, "用户名不能为空")
		return
	}

	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", username).Scan(&count)
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	available := count == 0
	utils.Success(c, available)
}

// CheckEmailAvailability 检查邮箱可用性
func CheckEmailAvailability(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		utils.BadRequest(c, "邮箱不能为空")
		return
	}

	// 简单的邮箱格式验证
	if !strings.Contains(email, "@") {
		utils.BadRequest(c, "邮箱格式错误")
		return
	}

	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", email).Scan(&count)
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return
	}

	available := count == 0
	utils.Success(c, available)
}


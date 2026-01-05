package main

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/config"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/handlers"
	"github.com/online-education-platform/backend/middleware"
	"github.com/online-education-platform/backend/utils"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.uber.org/zap"
)

func main() {
	// 初始化Zap日志
	utils.InitLogger()
	logger := utils.GetLogger()
	defer logger.Sync() // 刷新缓存

	// 初始化Telemetry
	shutdown, err := utils.InitTelemetry("backend-service")
	if err != nil {
		logger.Fatal("Telemetry 初始化失败", zap.Error(err))
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			logger.Error("Telemetry 关闭失败", zap.Error(err))
		}
	}()

	// 启动Runtime指标采集
	if err := runtime.Start(); err != nil {
		logger.Warn("Runtime metrics 启动失败", zap.Error(err))
	}

	// 加载配置
	cfg := config.Load()

	// 初始化JWT
	utils.InitJWT(cfg.JWTSecret)

	// 初始化数据库
	if err := database.InitDB(cfg.DBPath); err != nil {
		logger.Fatal("数据库初始化失败", zap.Error(err))
	}
	defer database.CloseDB()

	// 填充测试数据（可通过 ENABLE_SEED 环境变量控制）
	if cfg.EnableSeed {
		if err := database.SeedData(); err != nil {
			logger.Error("填充测试数据失败", zap.Error(err))
		}
	} else {
		logger.Info("ℹ️  测试数据填充已禁用 (ENABLE_SEED=false)")
	}

	// 设置Gin模式
	gin.SetMode(gin.ReleaseMode)

	// 创建路由
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(otelgin.Middleware("backend-service")) // 添加OTel中间件

	// 使用中间件
	r.Use(middleware.CORSMiddleware())

    // 静态资源目录（用于作业附件等本地文件）
    r.Static("/static", "./public")

	// API v1路由组
	v1 := r.Group("/api/v1")
	{
		// 认证路由 (公开)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/register", handlers.Register)
			auth.GET("/check-username", handlers.CheckUsernameAvailability)
			auth.GET("/check-email", handlers.CheckEmailAvailability)

			// 需要认证的路由
			authenticated := auth.Group("")
			authenticated.Use(middleware.AuthMiddleware())
			{
				authenticated.GET("/me", handlers.GetCurrentUser)
				authenticated.PUT("/profile", handlers.UpdateProfile)
				authenticated.PUT("/password", handlers.ChangePassword)
				authenticated.POST("/import-users", handlers.ImportUsersFromExcel)
				authenticated.GET("/user-template", handlers.DownloadUserTemplate)
			}
		}

		// 用户路由
		users := v1.Group("/users")
		users.Use(middleware.AuthMiddleware())
		{
			// 获取用户列表 (需要管理员权限，支持分页和角色筛选)
			users.GET("", handlers.GetUsers)
			// 获取指定用户资料 (需要管理员权限)
			users.GET("/:id", handlers.GetUserProfile)
		}

		// 课程分类路由
		categories := v1.Group("/categories")
		{
			categories.GET("", handlers.GetCategories)
		}

		// 课程路由
		courses := v1.Group("/courses")
		{
			courses.GET("", handlers.GetCourses)
			courses.GET("/:id", handlers.GetCourse)
			courses.GET("/:id/chapters", handlers.GetCourseChapters)

			// 需要认证的路由
			authenticated := courses.Group("")
			authenticated.Use(middleware.AuthMiddleware())
			{
				authenticated.GET("/my", handlers.GetMyCourses)
				authenticated.GET("/:id/statistics", handlers.GetCourseStatistics)
				authenticated.POST("", handlers.CreateCourse)
				authenticated.PUT("/:id", handlers.UpdateCourse)
				authenticated.DELETE("/:id", handlers.DeleteCourse)
				authenticated.POST("/:id/enroll", handlers.EnrollCourse)
				authenticated.POST("/:id/chapters", handlers.CreateChapter)
				authenticated.PUT("/:id/chapters/:cid", handlers.UpdateChapter)
				authenticated.DELETE("/:id/chapters/:cid", handlers.DeleteChapter)
			}
		}

		// 作业路由
		assignmentsPublic := v1.Group("/assignments")
		{
			// 公开的作业详情
			assignmentsPublic.GET("/:id", handlers.GetAssignment)
		}

		assignments := v1.Group("/assignments")
		assignments.Use(middleware.AuthMiddleware())
		{
			assignments.GET("", handlers.GetAssignments)
			assignments.GET("/my", handlers.GetMyAssignments)
			assignments.POST("", handlers.CreateAssignment)
			assignments.GET("/:id/statistics", handlers.GetAssignmentStatistics)
			assignments.PUT("/:id", handlers.UpdateAssignment)
			assignments.DELETE("/:id", handlers.DeleteAssignment)
			assignments.POST("/:id/submit", handlers.SubmitAssignment)
			assignments.GET("/submissions", handlers.GetSubmissions)
			assignments.GET("/submissions/:id", handlers.GetSubmissionDetail)
			assignments.PUT("/submissions/:id/grade", handlers.GradeSubmission)
		}

		// 考试路由
		exams := v1.Group("/exams")
		exams.Use(middleware.AuthMiddleware())
		{
			exams.GET("", handlers.GetExams)
			exams.GET("/my", handlers.GetMyExams)
			exams.POST("", handlers.CreateExam)
			exams.GET("/:id", handlers.GetExam)
			exams.GET("/:id/statistics", handlers.GetExamStatistics)
			exams.GET("/:id/my-submission", handlers.GetMyExamSubmission)
			exams.PUT("/:id", handlers.UpdateExam)
			exams.DELETE("/:id", handlers.DeleteExam)
			exams.POST("/:id/questions", handlers.AddQuestion)
			exams.PUT("/:id/questions/:qid", handlers.UpdateQuestion)
			exams.DELETE("/:id/questions/:qid", handlers.DeleteQuestion)
			exams.POST("/:id/submit", handlers.SubmitExam)
			exams.GET("/:id/results", handlers.GetExamResults)
			exams.GET("/submissions/:id", handlers.GetExamSubmissionDetail)
		}

		// 消息路由
		messages := v1.Group("/messages")
		messages.Use(middleware.AuthMiddleware())
		{
			messages.GET("", handlers.GetMessages)
			messages.PUT("/:id/status", handlers.MarkMessageStatus)
			messages.DELETE("/:id", handlers.DeleteMessage)
		}

		// 通知路由
		notifications := v1.Group("/notifications")
		{
			notifications.GET("", handlers.GetNotifications)
		}

		// 讨论路由
		discussions := v1.Group("/discussions")
		{
			discussions.GET("", handlers.GetDiscussions)
		}
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// 启动服务器
	addr := ":" + cfg.ServerPort
	logger.Info("🚀 服务器启动成功！",
		zap.String("addr", "http://localhost"+addr),
		zap.String("docs", "http://localhost"+addr+"/api/v1"),
	)

	if err := r.Run(addr); err != nil {
		logger.Fatal("服务器启动失败", zap.Error(err))
	}
}


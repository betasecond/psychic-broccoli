package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/config"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/handlers"
	"github.com/online-education-platform/backend/middleware"
	"github.com/online-education-platform/backend/utils"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 初始化JWT
	utils.InitJWT(cfg.JWTSecret)

	// 初始化数据库
	if err := database.InitDB(cfg.DBPath); err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}
	defer database.CloseDB()

	// 填充测试数据（可通过 ENABLE_SEED 环境变量控制）
	if cfg.EnableSeed {
		if err := database.SeedData(); err != nil {
			log.Printf("填充测试数据失败: %v", err)
		}
	} else {
		fmt.Println("ℹ️  测试数据填充已禁用 (ENABLE_SEED=false)")
	}

	// 设置Gin模式
	gin.SetMode(gin.ReleaseMode)

	// 创建路由
	r := gin.Default()

	// 使用中间件
	r.Use(middleware.CORSMiddleware())

    // 静态资源目录（用于作业附件等本地文件）
    r.Static("/static", "./public")
	r.Static("/public", "./public")

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
			// 课程列表使用可选认证（有token就解析，没有也能访问）
			courses.GET("", middleware.OptionalAuthMiddleware(), handlers.GetCourses)
			courses.GET("/:id", middleware.OptionalAuthMiddleware(), handlers.GetCourse)
			courses.GET("/:id/chapters", middleware.OptionalAuthMiddleware(), handlers.GetCourseChapters)

			// 需要认证的路由
			authenticated := courses.Group("")
			authenticated.Use(middleware.AuthMiddleware())
			{
				authenticated.GET("/my", handlers.GetMyCourses)
				authenticated.GET("/:id/statistics", handlers.GetCourseStatistics)
				authenticated.GET("/:id/students", handlers.GetCourseStudents)
				authenticated.POST("/:id/parse-outline", handlers.ParseCourseOutline)
				authenticated.POST("", handlers.CreateCourse)
				authenticated.PUT("/:id", handlers.UpdateCourse)
				authenticated.DELETE("/:id", handlers.DeleteCourse)
				authenticated.POST("/:id/enroll", handlers.EnrollCourse)
				authenticated.PUT("/:id/progress", handlers.UpdateProgress) // 更新学习进度
				authenticated.POST("/:id/chapters", handlers.CreateChapter)
				authenticated.PUT("/:id/chapters/:cid", handlers.UpdateChapter)
				authenticated.DELETE("/:id/chapters/:cid", handlers.DeleteChapter)
				// 课时路由
				authenticated.GET("/:id/chapters/:cid/sections", handlers.GetChapterSections)
				authenticated.POST("/:id/chapters/:cid/sections", handlers.CreateSection)
				authenticated.PUT("/:id/chapters/:cid/sections/:sid", handlers.UpdateSection)
				authenticated.DELETE("/:id/chapters/:cid/sections/:sid", handlers.DeleteSection)
			}
		}

		// 章节路由（需要认证）
		chapters := v1.Group("/chapters")
		chapters.Use(middleware.AuthMiddleware())
		{
			chapters.POST("/:id/complete", handlers.CompleteChapter) // 标记章节完成
		}

		// 作业路由
		assignments := v1.Group("/assignments")
		assignments.Use(middleware.AuthMiddleware())
		{
			assignments.GET("", handlers.GetAssignments)
			assignments.GET("/my", handlers.GetMyAssignments)
			assignments.GET("/:id", handlers.GetAssignment)
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
			exams.POST("/:id/parse-questions", handlers.ParseQuestionsWithAI)
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

		// 直播路由
		live := v1.Group("/live")
		live.Use(middleware.AuthMiddleware())
		{
			live.POST("", handlers.CreateLive)                  // 创建直播
			live.GET("", handlers.GetLiveList)                  // 获取直播列表
			live.GET("/:id", handlers.GetLiveDetail)            // 获取直播详情
			live.PUT("/:id/start", handlers.StartLive)          // 开始直播
			live.PUT("/:id/end", handlers.EndLive)              // 结束直播
			live.POST("/:id/join", handlers.JoinLive)           // 加入直播
			live.POST("/:id/leave", handlers.LeaveLive)         // 离开直播
			live.GET("/:id/viewers", handlers.GetLiveViewers)   // 获取观看人数

			// 直播聊天
			live.GET("/:id/messages", handlers.GetLiveMessages)         // 获取聊天消息
			live.POST("/:id/messages", handlers.SendLiveMessage)        // 发送聊天消息
			live.GET("/:id/messages/count", handlers.GetLiveMessageCount) // 获取消息数量
			live.DELETE("/:id/messages/:messageId", handlers.DeleteLiveMessage) // 删除消息
		}

		// 讨论路由
		discussions := v1.Group("/discussions")
		discussions.Use(middleware.AuthMiddleware())
		{
			discussions.POST("", handlers.CreateDiscussion)            // 创建讨论
			discussions.GET("", handlers.GetDiscussions)               // 获取讨论列表
			discussions.GET("/:id", handlers.GetDiscussionDetail)      // 获取讨论详情
			discussions.POST("/:id/replies", handlers.ReplyDiscussion) // 回复讨论
			discussions.PUT("/:id/close", handlers.CloseDiscussion)    // 关闭讨论
			discussions.DELETE("/:id", handlers.DeleteDiscussion)      // 删除讨论
		}

		// 文件上传路由
		files := v1.Group("/files")
		files.Use(middleware.AuthMiddleware())
		{
			files.POST("/upload", handlers.UploadFile)       // 上传单个文件
			files.POST("/upload-multiple", handlers.UploadFiles) // 上传多个文件
			files.DELETE("", handlers.DeleteFile)            // 删除文件
		}

		// 课程资料路由
		v1.GET("/courses/:id/materials", middleware.AuthMiddleware(), handlers.GetCourseMaterials)
		v1.POST("/courses/:id/materials", middleware.AuthMiddleware(), handlers.UploadCourseMaterial)
		v1.DELETE("/courses/:id/materials/:mid", middleware.AuthMiddleware(), handlers.DeleteCourseMaterial)
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// 启动服务器
	addr := ":" + cfg.ServerPort
	fmt.Printf("\n🚀 服务器启动成功！\n")
	fmt.Printf("📍 监听地址: http://localhost%s\n", addr)
	fmt.Printf("📚 API文档: http://localhost%s/api/v1\n", addr)
	fmt.Printf("\n按 Ctrl+C 停止服务器\n\n")

	if err := r.Run(addr); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}


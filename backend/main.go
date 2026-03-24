package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/config"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/handlers"
	otel_internal "github.com/online-education-platform/backend/internal/otel"
	"github.com/online-education-platform/backend/middleware"
	"github.com/online-education-platform/backend/utils"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// RateLimiterMiddleware 限流器
func RateLimiterMiddleware(r rate.Limit, b int) gin.HandlerFunc {
	limiter := rate.NewLimiter(r, b)
	return func(c *gin.Context) {
		if !limiter.Allow() {
			c.AbortWithStatusJSON(429, gin.H{"error": "操作过于频繁，请稍后再试"})
			return
		}
		c.Next()
	}
}

func main() {
	// 初始化Zap日志
	utils.InitLogger()
	logger := utils.GetLogger()
	defer logger.Sync() // 刷新缓存

	// 初始化 OpenTelemetry (补齐论文观测性缺失)
	tp, err := otel_internal.InitTracer()
	if err != nil {
		log.Fatalf("failed to initialize tracer: %v", err)
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer: %v", err)
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

	// 初始化文件存储后端（PLAN-04）
	utils.InitStorage()

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
	r.Static("/public", "./public")

	// API v1路由组
	// 定义高频操作限流器（每分钟 20 个请求）
	socialRateLimiter := middleware.RateLimiterMiddleware(20)

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
				// RAG 知识库路由
				authenticated.POST("/:id/rag/documents", handlers.UploadRAGDocument)
				authenticated.GET("/:id/rag/documents", handlers.ListRAGDocuments)
				authenticated.DELETE("/:id/rag/documents/:docId", handlers.DeleteRAGDocument)
				authenticated.POST("/:id/rag/query", handlers.QueryRAG)
				authenticated.GET("/:id/rag/queries", handlers.GetRAGQueryHistory)
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
			exams.POST("/:id/draft", handlers.SaveDraft)    // 新增：保存草稿
			exams.GET("/:id/draft", handlers.GetDraft)      // 新增：获取草稿
			exams.GET("/:id/results", handlers.GetExamResults)
			exams.GET("/submissions/:id", handlers.GetExamSubmissionDetail)
			exams.POST("/:id/parse-questions", handlers.ParseQuestionsWithAI)
			// PLAN-01: SSE 流式题目解析
			exams.POST("/:id/parse-questions/stream", handlers.ParseQuestionsStream)
			// PLAN-02: 确认并批量导入解析题目
			exams.POST("/:id/questions/confirm", handlers.ConfirmParsedQuestions)
			// PLAN-03: 题目分析
			exams.GET("/:id/question-analytics", handlers.GetExamQuestionAnalytics)
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
		discussions.Use(middleware.AIInterceptor())
		{
			discussions.POST("", socialRateLimiter, handlers.CreateDiscussion)            // 创建讨论
			discussions.GET("", handlers.GetDiscussions)                              // 获取讨论列表
			discussions.GET("/:id", handlers.GetDiscussionDetail)                     // 获取讨论详情
			discussions.POST("/:id/replies", socialRateLimiter, handlers.ReplyDiscussion) // 回复讨论
			discussions.POST("/:id/replies/:rid/like", socialRateLimiter, handlers.LikeReply) // 点赞
			discussions.POST("/:id/replies/:rid/favorite", socialRateLimiter, handlers.FavoriteReply) // 收藏
			discussions.PUT("/:id/close", handlers.CloseDiscussion)   // 关闭讨论
			discussions.DELETE("/:id", handlers.DeleteDiscussion)     // 删除讨论
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
		// PLAN-03: 课程学习热力图
		v1.GET("/courses/:id/learning-heatmap", middleware.AuthMiddleware(), handlers.GetCourseLearningHeatmap)

		// PLAN-05: AI 修改记录
		ai := v1.Group("/ai")
		ai.Use(middleware.AuthMiddleware())
		{
			ai.GET("/corrections", handlers.GetAICorrections)
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


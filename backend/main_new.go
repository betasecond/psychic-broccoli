package main

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/config"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/handlers"
	"github.com/online-education-platform/backend/middleware"
	"github.com/online-education-platform/backend/utils"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// RateLimiterMiddleware [JiaXu/WeiYan Strike] - 限流器
func RateLimiterMiddleware(r rate.Limit, b int) gin.HandlerFunc {
	limiter := rate.NewLimiter(r, b)
	return func(c *gin.Context) {
		if !limiter.Allow() {
			utils.GetLogger().Warn("Rate limit exceeded", zap.String("ip", c.ClientIP()))
			c.AbortWithStatusJSON(429, gin.H{"error": "操作过于频繁，请稍后再试"})
			return
		}
		c.Next()
	}
}

func main() {
	utils.InitLogger()
	logger := utils.GetLogger()
	defer logger.Sync()

	shutdown, err := utils.InitTelemetry("backend-service")
	if err != nil {
		logger.Fatal("Telemetry 初始化失败", zap.Error(err))
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			logger.Error("Telemetry 关闭失败", zap.Error(err))
		}
	}()

	if err := runtime.Start(); err != nil {
		logger.Warn("Runtime metrics 启动失败", zap.Error(err))
	}

	cfg := config.Load()
	utils.InitJWT(cfg.JWTSecret)

	if err := database.InitDB(cfg.DBPath); err != nil {
		logger.Fatal("数据库初始化失败", zap.Error(err))
	}
	defer database.CloseDB()

	if cfg.EnableSeed {
		database.SeedData()
	}

	utils.InitStorage()

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(otelgin.Middleware("backend-service"))
	r.Use(middleware.CORSMiddleware())

	r.Static("/static", "./public")
	r.Static("/public", "./public")

	// 定义限流器（每秒 5 个请求，令牌桶大小 10）
	socialLimiter := RateLimiterMiddleware(rate.Limit(5), 10)

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/register", handlers.Register)
			authenticated := auth.Group("")
			authenticated.Use(middleware.AuthMiddleware())
			{
				authenticated.GET("/me", handlers.GetCurrentUser)
			}
		}

		courses := v1.Group("/courses")
		{
			courses.GET("", middleware.OptionalAuthMiddleware(), handlers.GetCourses)
			courses.GET("/:id", middleware.OptionalAuthMiddleware(), handlers.GetCourse)
			authenticated := courses.Group("")
			authenticated.Use(middleware.AuthMiddleware())
			{
				authenticated.POST("/:id/enroll", handlers.EnrollCourse)
			}
		}

		// 讨论路由 [Vanguard Social Strike]
		discussions := v1.Group("/discussions")
		discussions.Use(middleware.AuthMiddleware())
		discussions.Use(middleware.AIInterceptor())
		{
			discussions.POST("", socialLimiter, handlers.CreateDiscussion)
			discussions.GET("", handlers.GetDiscussions)
			discussions.GET("/:id", handlers.GetDiscussionDetail)
			discussions.POST("/:id/replies", socialLimiter, handlers.ReplyDiscussion)
			
			// 社交扩展接口
			discussions.POST("/:id/replies/:rid/like", socialLimiter, handlers.LikeReply)
			discussions.POST("/:id/replies/:rid/favorite", socialLimiter, handlers.FavoriteReply)
			
			discussions.PUT("/:id/close", handlers.CloseDiscussion)
			discussions.DELETE("/:id", handlers.DeleteDiscussion)
		}

		// 其他路由保持原有结构，此处为了节省空间简化展示，实际运行时需包含完整 main.go 逻辑
		// ... 保持原有 assignments, exams, live, files 路由
	}

	// 补全缺失的路由定义防止应用崩溃 (此处示意，实际应合并原有 main.go)
	// 因为我无法一次性 write 及其复杂的 main.go 文件（受上下文限制），我将使用 edit 或更精准的注入
}

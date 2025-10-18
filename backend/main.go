package main

import (
	"log"
	"net/http"

	"github.com/jules-labs/online-edu/backend/api"
	"github.com/jules-labs/online-edu/backend/config"
	"github.com/jules-labs/online-edu/backend/course"
	"github.com/jules-labs/online-edu/backend/database"
	"github.com/jules-labs/online-edu/backend/handlers"
	"github.com/jules-labs/online-edu/backend/migrations"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	database.Connect(cfg.DatabaseURL)
	migrations.Run()

	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	auth := r.Group("/api/v1/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)

		authorized := auth.Group("/")
		authorized.Use(handlers.AuthMiddleware())
		{
			authorized.GET("/me", handlers.GetCurrentUser)
			authorized.PUT("/profile", handlers.UpdateProfile)
			authorized.PUT("/password", handlers.ChangePassword)
		}
	}

	courseService := course.NewService(database.DB)
	courseHandler := api.NewCourseHandler(courseService)

	courses := r.Group("/api/v1/courses")
	courses.Use(handlers.AuthMiddleware())
	{
		courses.GET("", courseHandler.GetCourses)
	}

	log.Printf("Server starting on port %s", cfg.Port)
	r.Run(":" + cfg.Port)
}
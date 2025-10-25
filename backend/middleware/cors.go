package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware 跨域中间件
func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:35002", "http://localhost:35000", "http://localhost:3000", "http://localhost:5173"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true

	return cors.New(config)
}


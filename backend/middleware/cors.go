package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware 跨域中间件
func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:35002",
		"http://localhost:35000",
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"https://courseark.online",
		"http://courseark.online",
		"https://web.courseark.online",
		"http://web.courseark.online",
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-Request-ID", "X-RAG-API-Key", "X-RAG-Provider", "traceparent", "tracestate"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true

	return cors.New(config)
}

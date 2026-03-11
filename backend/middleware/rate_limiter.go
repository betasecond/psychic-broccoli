package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/utils"
)

// RateLimiterMiddleware 针对关键社交操作的简单内存限流器
// 如果线上使用建议配合 Redis 实现分布式限流
func RateLimiterMiddleware(requestsPerMinute int) gin.HandlerFunc {
	// 简单的内存存储：key -> [timestamps]
	// 注意：生产环境应使用 redis.FixedWindow 或 redis.SlidingWindow
	var (
		userRequests = make(map[string][]time.Time)
	)

	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		var key string

		if !exists {
			key = c.ClientIP()
		} else {
			key = strconv.FormatInt(userID.(int64), 10)
		}

		now := time.Now()
		minuteAgo := now.Add(-1 * time.Minute)

		// 清理过期记录并检查计数
		var validRequests []time.Time
		for _, t := range userRequests[key] {
			if t.After(minuteAgo) {
				validRequests = append(validRequests, t)
			}
		}

		if len(validRequests) >= requestsPerMinute {
			utils.GetLogger().Warn("Rate limit exceeded", 
				utils.String field("key", key),
				utils.Int field("count", len(validRequests)))
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "请求过于频繁",
				"message": "点赞或操作过于频繁，请休息一分钟后再试",
			})
			c.Abort()
			return
		}

		// 记录当前请求
		validRequests = append(validRequests, now)
		userRequests[key] = validRequests

		c.Next()
	}
}

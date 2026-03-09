package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// AICache simple TTL cache for mock
var AICache = make(map[string]interface{})

func AIInterceptor() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" && c.FullPath() == "/api/discussions" {
			// Pre-process indicator
			c.Set("ai_enabled", true)
		}
		c.Next()
	}
}

func AnalyzeDiscussionAsync(title, content string, discussionID int64) {
	go func() {
		// Mock delay for AI processing
		time.Sleep(2 * time.Second)
		
		aiDraft := fmt.Sprintf("AI Summary for %s: This discussion focuses on %s...", title, content[:10])
		confidence := 0.95
		linkedKB := "https://kb.courseark.com/topics/123"

		// Mock Cache logic (simulating database update or external cache)
		cacheKey := fmt.Sprintf("ai_res_%d", discussionID)
		AICache[cacheKey] = map[string]interface{}{
			"draft":      aiDraft,
			"confidence": confidence,
			"kb":         linkedKB,
			"expiry":     time.Now().Add(15 * time.Minute),
		}
		
		fmt.Printf("[AI] Analysis completed for discussion %d\n", discussionID)
	}()
}

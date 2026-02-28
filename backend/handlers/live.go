package handlers

import (
	"crypto/md5"
	"database/sql"
	"fmt"
	"os"
	"time"

	"github.com/online-education-platform/backend/database"

	"github.com/gin-gonic/gin"
)

// 生成推流地址（简化版，实际应使用阿里云SDK）
func generatePushURL(streamName string) string {
	// 这里使用简化的本地推流地址
	// 实际部署时应该使用阿里云直播服务
	domain := os.Getenv("LIVE_PUSH_DOMAIN")
	if domain == "" {
		domain = "localhost:1935" // 默认 RTMP 本地服务器
	}
	appName := "live"
	authKey := os.Getenv("LIVE_AUTH_KEY")

	if authKey == "" {
		// 如果没有配置鉴权，返回简单地址
		return fmt.Sprintf("rtmp://%s/%s/%s", domain, appName, streamName)
	}

	// 鉴权过期时间（1小时后）
	expireTime := time.Now().Add(time.Hour).Unix()

	// 生成鉴权串：MD5(/AppName/StreamName-ExpireTime-AuthKey)
	authString := fmt.Sprintf("/%s/%s-%d-%s", appName, streamName, expireTime, authKey)
	authToken := fmt.Sprintf("%x", md5.Sum([]byte(authString)))

	// 推流地址格式：rtmp://domain/AppName/StreamName?auth_key=ExpireTime-AuthToken
	pushURL := fmt.Sprintf("rtmp://%s/%s/%s?auth_key=%d-%s",
		domain, appName, streamName, expireTime, authToken)

	return pushURL
}

// 生成播放地址（简化版）
func generatePlayURL(streamName string) string {
	domain := os.Getenv("LIVE_PLAY_DOMAIN")
	if domain == "" {
		domain = "localhost:8080" // 默认本地 HLS 服务器
	}
	appName := "live"
	authKey := os.Getenv("LIVE_AUTH_KEY")

	if authKey == "" {
		// 如果没有配置鉴权，返回简单地址
		return fmt.Sprintf("http://%s/%s/%s.m3u8", domain, appName, streamName)
	}

	expireTime := time.Now().Add(time.Hour).Unix()
	authString := fmt.Sprintf("/%s/%s.m3u8-%d-%s", appName, streamName, expireTime, authKey)
	authToken := fmt.Sprintf("%x", md5.Sum([]byte(authString)))

	// HLS播放地址
	playURL := fmt.Sprintf("http://%s/%s/%s.m3u8?auth_key=%d-%s",
		domain, appName, streamName, expireTime, authToken)

	return playURL
}

// CreateLive 创建直播
func CreateLive(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	role, _ := c.Get("role")
	if role != "INSTRUCTOR" && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "只有讲师可以创建直播"})
		return
	}

	var req struct {
		CourseID      int64  `json:"courseId" binding:"required"`
		Title         string `json:"title" binding:"required"`
		Description   string `json:"description"`
		ScheduledTime string `json:"scheduledTime"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "参数错误"})
		return
	}

	// 验证课程是否存在以及用户是否为课程讲师
	var instructorID int64
	err := database.DB.QueryRow(
		"SELECT instructor_id FROM courses WHERE id = ?",
		req.CourseID,
	).Scan(&instructorID)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "课程不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询课程失败"})
		return
	}

	// 只有课程讲师或管理员可以创建该课程的直播
	if instructorID != userID.(int64) && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "无权为此课程创建直播"})
		return
	}

	// 生成唯一的流名称
	streamName := fmt.Sprintf("room_%d_%d", req.CourseID, time.Now().Unix())

	// 生成推流和播放地址
	pushURL := generatePushURL(streamName)
	playURL := generatePlayURL(streamName)

	// 保存到数据库
	result, err := database.DB.Exec(`
		INSERT INTO live_sessions (course_id, instructor_id, title, description,
			stream_name, push_url, play_url, scheduled_time, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
	`, req.CourseID, userID, req.Title, req.Description,
		streamName, pushURL, playURL, req.ScheduledTime)

	if err != nil {
		c.JSON(500, gin.H{"error": "创建直播失败"})
		return
	}

	liveID, _ := result.LastInsertId()

	c.JSON(200, gin.H{
		"id":         liveID,
		"streamName": streamName,
		"pushURL":    pushURL,
		"playURL":    playURL,
		"status":     "SCHEDULED",
	})
}

// GetLiveList 获取直播列表
func GetLiveList(c *gin.Context) {
	courseID := c.Query("courseId")
	status := c.Query("status")

	query := `
		SELECT ls.id, ls.title, ls.description, ls.status, ls.scheduled_time,
			   ls.started_at, ls.ended_at, ls.viewers_count, ls.created_at,
			   c.id as course_id, c.title as course_title,
			   u.id as instructor_id, u.username as instructor_name
		FROM live_sessions ls
		JOIN courses c ON ls.course_id = c.id
		JOIN users u ON ls.instructor_id = u.id
		WHERE 1=1
	`

	args := []interface{}{}

	if courseID != "" {
		query += " AND ls.course_id = ?"
		args = append(args, courseID)
	}

	if status != "" {
		query += " AND ls.status = ?"
		args = append(args, status)
	}

	query += " ORDER BY ls.created_at DESC LIMIT 50"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "查询直播列表失败"})
		return
	}
	defer rows.Close()

	lives := []map[string]interface{}{}
	for rows.Next() {
		var live struct {
			ID             int64
			Title          string
			Description    sql.NullString
			Status         string
			ScheduledTime  sql.NullString
			StartedAt      sql.NullString
			EndedAt        sql.NullString
			ViewersCount   int
			CreatedAt      time.Time
			CourseID       int64
			CourseTitle    string
			InstructorID   int64
			InstructorName string
		}

		err := rows.Scan(&live.ID, &live.Title, &live.Description, &live.Status,
			&live.ScheduledTime, &live.StartedAt, &live.EndedAt, &live.ViewersCount,
			&live.CreatedAt, &live.CourseID, &live.CourseTitle,
			&live.InstructorID, &live.InstructorName)
		if err != nil {
			continue
		}

		liveData := map[string]interface{}{
			"id":           live.ID,
			"title":        live.Title,
			"status":       live.Status,
			"viewersCount": live.ViewersCount,
			"createdAt":    live.CreatedAt.Format(time.RFC3339),
			"course": map[string]interface{}{
				"id":    live.CourseID,
				"title": live.CourseTitle,
			},
			"instructor": map[string]interface{}{
				"id":       live.InstructorID,
				"username": live.InstructorName,
			},
		}

		if live.Description.Valid {
			liveData["description"] = live.Description.String
		}
		if live.ScheduledTime.Valid {
			liveData["scheduledTime"] = live.ScheduledTime.String
		}
		if live.StartedAt.Valid {
			liveData["startedAt"] = live.StartedAt.String
		}
		if live.EndedAt.Valid {
			liveData["endedAt"] = live.EndedAt.String
		}

		lives = append(lives, liveData)
	}

	c.JSON(200, lives)
}

// GetLiveDetail 获取直播详情
func GetLiveDetail(c *gin.Context) {
	liveID := c.Param("id")

	query := `
		SELECT ls.id, ls.title, ls.description, ls.stream_name, ls.push_url,
			   ls.play_url, ls.status, ls.scheduled_time, ls.started_at,
			   ls.ended_at, ls.viewers_count, ls.created_at,
			   c.id as course_id, c.title as course_title,
			   u.id as instructor_id, u.username as instructor_name
		FROM live_sessions ls
		JOIN courses c ON ls.course_id = c.id
		JOIN users u ON ls.instructor_id = u.id
		WHERE ls.id = ?
	`

	var live struct {
		ID             int64
		Title          string
		Description    sql.NullString
		StreamName     string
		PushURL        string
		PlayURL        string
		Status         string
		ScheduledTime  sql.NullString
		StartedAt      sql.NullString
		EndedAt        sql.NullString
		ViewersCount   int
		CreatedAt      time.Time
		CourseID       int64
		CourseTitle    string
		InstructorID   int64
		InstructorName string
	}

	err := database.DB.QueryRow(query, liveID).Scan(
		&live.ID, &live.Title, &live.Description, &live.StreamName,
		&live.PushURL, &live.PlayURL, &live.Status, &live.ScheduledTime,
		&live.StartedAt, &live.EndedAt, &live.ViewersCount, &live.CreatedAt,
		&live.CourseID, &live.CourseTitle, &live.InstructorID, &live.InstructorName)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "直播不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询直播失败"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	liveData := map[string]interface{}{
		"id":           live.ID,
		"title":        live.Title,
		"streamName":   live.StreamName,
		"playURL":      live.PlayURL,
		"status":       live.Status,
		"viewersCount": live.ViewersCount,
		"createdAt":    live.CreatedAt.Format(time.RFC3339),
		"course": map[string]interface{}{
			"id":    live.CourseID,
			"title": live.CourseTitle,
		},
		"instructor": map[string]interface{}{
			"id":       live.InstructorID,
			"username": live.InstructorName,
		},
	}

	if live.Description.Valid {
		liveData["description"] = live.Description.String
	}
	if live.ScheduledTime.Valid {
		liveData["scheduledTime"] = live.ScheduledTime.String
	}
	if live.StartedAt.Valid {
		liveData["startedAt"] = live.StartedAt.String
	}
	if live.EndedAt.Valid {
		liveData["endedAt"] = live.EndedAt.String
	}

	// 只有讲师或管理员可以看到推流地址
	if userID == live.InstructorID || role == "ADMIN" {
		liveData["pushURL"] = live.PushURL
	}

	c.JSON(200, liveData)
}

// StartLive 开始直播
func StartLive(c *gin.Context) {
	liveID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	role, _ := c.Get("role")

	// 查询直播信息
	var instructorID int64
	var status string
	err := database.DB.QueryRow(
		"SELECT instructor_id, status FROM live_sessions WHERE id = ?",
		liveID,
	).Scan(&instructorID, &status)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "直播不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询直播失败"})
		return
	}

	// 只有讲师或管理员可以开始直播
	if instructorID != userID.(int64) && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "无权开始此直播"})
		return
	}

	if status == "LIVE" {
		c.JSON(400, gin.H{"error": "直播已经开始"})
		return
	}

	if status == "ENDED" {
		c.JSON(400, gin.H{"error": "直播已结束，无法重新开始"})
		return
	}

	// 更新直播状态
	_, err = database.DB.Exec(`
		UPDATE live_sessions
		SET status = 'LIVE', started_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, liveID)

	if err != nil {
		c.JSON(500, gin.H{"error": "开始直播失败"})
		return
	}

	c.JSON(200, gin.H{"message": "直播已开始", "status": "LIVE"})
}

// EndLive 结束直播
func EndLive(c *gin.Context) {
	liveID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	role, _ := c.Get("role")

	// 查询直播信息
	var instructorID int64
	var status string
	err := database.DB.QueryRow(
		"SELECT instructor_id, status FROM live_sessions WHERE id = ?",
		liveID,
	).Scan(&instructorID, &status)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "直播不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询直播失败"})
		return
	}

	// 只有讲师或管理员可以结束直播
	if instructorID != userID.(int64) && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "无权结束此直播"})
		return
	}

	if status == "ENDED" {
		c.JSON(400, gin.H{"error": "直播已经结束"})
		return
	}

	// 更新直播状态
	_, err = database.DB.Exec(`
		UPDATE live_sessions
		SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, liveID)

	if err != nil {
		c.JSON(500, gin.H{"error": "结束直播失败"})
		return
	}

	c.JSON(200, gin.H{"message": "直播已结束", "status": "ENDED"})
}

// JoinLive 加入直播（记录观看）
func JoinLive(c *gin.Context) {
	liveID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	// 验证直播是否存在
	var status string
	err := database.DB.QueryRow(
		"SELECT status FROM live_sessions WHERE id = ?",
		liveID,
	).Scan(&status)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "直播不存在"})
		return
	} else if err != nil {
		c.JSON(500, gin.H{"error": "查询直播失败"})
		return
	}

	// 记录观看（如果已存在则更新 joined_at）
	_, err = database.DB.Exec(`
		INSERT INTO live_viewers (live_session_id, user_id, joined_at, left_at)
		VALUES (?, ?, CURRENT_TIMESTAMP, NULL)
		ON CONFLICT(live_session_id, user_id)
		DO UPDATE SET joined_at = CURRENT_TIMESTAMP, left_at = NULL
	`, liveID, userID)

	if err != nil {
		c.JSON(500, gin.H{"error": "记录观看失败"})
		return
	}

	// 更新在线人数
	var count int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM live_viewers
		WHERE live_session_id = ? AND left_at IS NULL
	`, liveID).Scan(&count)

	database.DB.Exec(
		"UPDATE live_sessions SET viewers_count = ? WHERE id = ?",
		count, liveID,
	)

	c.JSON(200, gin.H{"message": "已加入直播", "viewersCount": count})
}

// LeaveLive 离开直播
func LeaveLive(c *gin.Context) {
	liveID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	// 更新离开时间
	_, err := database.DB.Exec(`
		UPDATE live_viewers
		SET left_at = CURRENT_TIMESTAMP
		WHERE live_session_id = ? AND user_id = ?
	`, liveID, userID)

	if err != nil {
		c.JSON(500, gin.H{"error": "记录离开失败"})
		return
	}

	// 更新在线人数
	var count int
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM live_viewers
		WHERE live_session_id = ? AND left_at IS NULL
	`, liveID).Scan(&count)

	database.DB.Exec(
		"UPDATE live_sessions SET viewers_count = ? WHERE id = ?",
		count, liveID,
	)

	c.JSON(200, gin.H{"message": "已离开直播", "viewersCount": count})
}

// GetLiveViewers 获取直播观看人数
func GetLiveViewers(c *gin.Context) {
	liveID := c.Param("id")

	var count int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM live_viewers
		WHERE live_session_id = ? AND left_at IS NULL
	`, liveID).Scan(&count)

	if err != nil {
		c.JSON(500, gin.H{"error": "查询失败"})
		return
	}

	c.JSON(200, gin.H{"viewersCount": count})
}

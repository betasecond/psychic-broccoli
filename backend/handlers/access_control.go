package handlers

import (
	"database/sql"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
)

func currentUserID(c *gin.Context) int64 {
	userID, _ := c.Get("userID")
	id, _ := userID.(int64)
	return id
}

func currentUserRole(c *gin.Context) string {
	role, _ := c.Get("role")
	value, _ := role.(string)
	return value
}

func canAccessCourse(c *gin.Context, courseID int64) (bool, error) {
	switch currentUserRole(c) {
	case "ADMIN":
		var count int
		if err := database.DB.QueryRow(`SELECT COUNT(*) FROM courses WHERE id = ?`, courseID).Scan(&count); err != nil {
			return false, err
		}
		return count > 0, nil
	case "INSTRUCTOR":
		return canManageCourse(c, courseID)
	case "STUDENT":
		var count int
		if err := database.DB.QueryRow(
			`SELECT COUNT(*)
			 FROM course_enrollments ce
			 JOIN courses c ON c.id = ce.course_id
			 WHERE ce.course_id = ? AND ce.student_id = ?`,
			courseID,
			currentUserID(c),
		).Scan(&count); err != nil {
			return false, err
		}
		return count > 0, nil
	default:
		return false, nil
	}
}

func canManageCourse(c *gin.Context, courseID int64) (bool, error) {
	switch currentUserRole(c) {
	case "ADMIN":
		var count int
		if err := database.DB.QueryRow(`SELECT COUNT(*) FROM courses WHERE id = ?`, courseID).Scan(&count); err != nil {
			return false, err
		}
		return count > 0, nil
	case "INSTRUCTOR":
		var count int
		if err := database.DB.QueryRow(
			`SELECT COUNT(*) FROM courses WHERE id = ? AND instructor_id = ?`,
			courseID,
			currentUserID(c),
		).Scan(&count); err != nil {
			return false, err
		}
		return count > 0, nil
	default:
		return false, nil
	}
}

func ensureCourseAccessible(c *gin.Context, courseID int64, message string) bool {
	ok, err := canAccessCourse(c, courseID)
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return false
	}
	if !ok {
		utils.Forbidden(c, message)
		return false
	}
	return true
}

func ensureCourseInstructorOrAdmin(c *gin.Context, courseID int64, message string) bool {
	switch currentUserRole(c) {
	case "ADMIN":
		return true
	case "INSTRUCTOR":
		var count int
		err := database.DB.QueryRow(
			`SELECT COUNT(*) FROM courses WHERE id = ? AND instructor_id = ?`,
			courseID,
			currentUserID(c),
		).Scan(&count)
		if err != nil {
			utils.InternalServerError(c, "服务器错误")
			return false
		}
		if count == 0 {
			utils.Forbidden(c, message)
			return false
		}
		return true
	default:
		utils.Forbidden(c, message)
		return false
	}
}

func courseIDFromExamID(examID int64) (int64, error) {
	var courseID int64
	err := database.DB.QueryRow(`SELECT course_id FROM exams WHERE id = ?`, examID).Scan(&courseID)
	return courseID, err
}

func ensureExamAccessible(c *gin.Context, examID int64, message string) (int64, bool) {
	courseID, err := courseIDFromExamID(examID)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "考试不存在")
		return 0, false
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return 0, false
	}
	if !ensureCourseAccessible(c, courseID, message) {
		return 0, false
	}
	return courseID, true
}

func courseIDFromLiveID(liveID int64) (int64, error) {
	var courseID int64
	err := database.DB.QueryRow(`SELECT course_id FROM live_sessions WHERE id = ?`, liveID).Scan(&courseID)
	return courseID, err
}

func ensureLiveAccessible(c *gin.Context, liveID int64, message string) (int64, bool) {
	courseID, err := courseIDFromLiveID(liveID)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "直播不存在")
		return 0, false
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return 0, false
	}
	if !ensureCourseAccessible(c, courseID, message) {
		return 0, false
	}
	return courseID, true
}

func courseIDFromDiscussionID(discussionID int64) (int64, error) {
	var courseID int64
	err := database.DB.QueryRow(`SELECT course_id FROM discussions WHERE id = ?`, discussionID).Scan(&courseID)
	return courseID, err
}

func ensureDiscussionAccessible(c *gin.Context, discussionID int64, message string) (int64, bool) {
	courseID, err := courseIDFromDiscussionID(discussionID)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "讨论不存在")
		return 0, false
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return 0, false
	}
	if !ensureCourseAccessible(c, courseID, message) {
		return 0, false
	}
	return courseID, true
}

func ensureReplyAccessible(c *gin.Context, replyID int64, message string) (int64, int64, bool) {
	var discussionID int64
	err := database.DB.QueryRow(`SELECT discussion_id FROM discussion_replies WHERE id = ?`, replyID).Scan(&discussionID)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "回复不存在")
		return 0, 0, false
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return 0, 0, false
	}

	courseID, ok := ensureDiscussionAccessible(c, discussionID, message)
	return courseID, discussionID, ok
}

func parseInt64Param(c *gin.Context, raw, name string) (int64, bool) {
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的"+name)
		return 0, false
	}
	return id, true
}

package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jules-labs/online-edu/backend/course"
)

// CourseHandler handles course-related requests
type CourseHandler struct {
	service *course.Service
}

// NewCourseHandler creates a new course handler
func NewCourseHandler(service *course.Service) *CourseHandler {
	return &CourseHandler{service: service}
}

// GetCourses returns all courses
func (h *CourseHandler) GetCourses(c *gin.Context) {
	courses, err := h.service.GetCourses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get courses"})
		return
	}

	c.JSON(http.StatusOK, courses)
}
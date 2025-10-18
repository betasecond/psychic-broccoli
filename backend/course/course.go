package course

import (
	"github.com/jmoiron/sqlx"
)

// Course represents a course in the database
type Course struct {
	ID          int    `json:"id" db:"id"`
	Title       string `json:"title" db:"title"`
	Description string `json:"description" db:"description"`
	TeacherID   int    `json:"teacher_id" db:"teacher_id"`
}

// Service provides course-related services
type Service struct {
	db *sqlx.DB
}

// NewService creates a new course service
func NewService(db *sqlx.DB) *Service {
	return &Service{db: db}
}

// GetCourses returns all courses
func (s *Service) GetCourses() ([]Course, error) {
	var courses []Course
	err := s.db.Select(&courses, "SELECT * FROM courses")
	if err != nil {
		return nil, err
	}
	return courses, nil
}
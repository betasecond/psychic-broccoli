package models

import "time"

// User 用户模型
type User struct {
	ID           int64     `json:"userId"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"` // 不返回给前端
	Email        *string   `json:"email,omitempty"`
	AvatarURL    *string   `json:"avatarUrl,omitempty"`
	FullName     *string   `json:"fullName,omitempty"`
	Phone        *string   `json:"phone,omitempty"`
	Gender       *string   `json:"gender,omitempty"`
	Bio          *string   `json:"bio,omitempty"`
	Role         string    `json:"role"` // STUDENT, INSTRUCTOR, ADMIN
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Course 课程模型
type Course struct {
	ID             int64     `json:"id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	CoverImageURL  *string   `json:"coverImageUrl,omitempty"`
	InstructorID   int64     `json:"instructorId"`
	InstructorName string    `json:"instructorName,omitempty"` // 关联查询
	CategoryID     *int64    `json:"categoryId,omitempty"`
	CategoryName   string    `json:"categoryName,omitempty"` // 关联查询
	Status         string    `json:"status"` // DRAFT, PUBLISHED, ARCHIVED
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// CourseCategory 课程分类模型
type CourseCategory struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

// CourseEnrollment 选课记录模型
type CourseEnrollment struct {
	ID         int64     `json:"id"`
	StudentID  int64     `json:"studentId"`
	CourseID   int64     `json:"courseId"`
	EnrolledAt time.Time `json:"enrolledAt"`
	Progress   int       `json:"progress"`
}

// CourseChapter 课程章节模型
type CourseChapter struct {
	ID         int64  `json:"id"`
	CourseID   int64  `json:"courseId"`
	Title      string `json:"title"`
	OrderIndex int    `json:"orderIndex"`
}

// CourseSection 课时模型
type CourseSection struct {
	ID         int64   `json:"id"`
	ChapterID  int64   `json:"chapterId"`
	Title      string  `json:"title"`
	OrderIndex int     `json:"orderIndex"`
	Type       string  `json:"type"` // VIDEO, LIVE, ASSIGNMENT, EXAM
	VideoURL   *string `json:"videoUrl,omitempty"`
	ResourceID *int64  `json:"resourceId,omitempty"`
}

// Assignment 作业模型
type Assignment struct {
	ID        int64      `json:"id"`
	CourseID  int64      `json:"courseId"`
	Title     string     `json:"title"`
	Content   *string    `json:"content,omitempty"`
	Deadline  *time.Time `json:"deadline,omitempty"`
    Attachments *string  `json:"attachments,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

// AssignmentSubmission 作业提交模型
type AssignmentSubmission struct {
	ID           int64     `json:"id"`
	AssignmentID int64     `json:"assignmentId"`
	StudentID    int64     `json:"studentId"`
	Content      *string   `json:"content,omitempty"`
	Attachments  *string   `json:"attachments,omitempty"` // JSON字符串
	SubmittedAt  time.Time `json:"submittedAt"`
	Grade        *float64  `json:"grade,omitempty"`
	Feedback     *string   `json:"feedback,omitempty"`
}

// Exam 考试模型
type Exam struct {
	ID        int64     `json:"id"`
	CourseID  int64     `json:"courseId"`
	Title     string    `json:"title"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	CreatedAt time.Time `json:"createdAt"`
}

// ExamQuestion 考试题目模型
type ExamQuestion struct {
	ID         int64   `json:"id"`
	ExamID     int64   `json:"examId"`
	Type       string  `json:"type"` // SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER
	Stem       string  `json:"stem"`
	Options    *string `json:"options,omitempty"`    // JSON字符串
	Answer     string  `json:"answer,omitempty"`     // JSON字符串 (给学生时不返回)
	Score      float64 `json:"score"`
	OrderIndex int     `json:"orderIndex"`
}

// ExamSubmission 考卷提交模型
type ExamSubmission struct {
	ID         int64     `json:"id"`
	ExamID     int64     `json:"examId"`
	StudentID  int64     `json:"studentId"`
	SubmittedAt time.Time `json:"submittedAt"`
	TotalScore *float64  `json:"totalScore,omitempty"`
}

// ExamAnswer 考试答案模型
type ExamAnswer struct {
	ID            int64    `json:"id"`
	SubmissionID  int64    `json:"submissionId"`
	QuestionID    int64    `json:"questionId"`
	StudentAnswer *string  `json:"studentAnswer,omitempty"` // JSON字符串
	ScoreAwarded  *float64 `json:"scoreAwarded,omitempty"`
}

// Message 消息模型
type Message struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"userId"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Date      string    `json:"date"`
	Type      string    `json:"type"`
	Status    string    `json:"status"` // read, unread
	Sender    string    `json:"sender"`
	CreatedAt time.Time `json:"createdAt"`
}

// Notification 通知模型
type Notification struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Date      string    `json:"date"`
	Type      string    `json:"type"`
	CreatedAt time.Time `json:"createdAt"`
}

// Discussion 讨论模型
type Discussion struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Course    string    `json:"course"`
	Author    string    `json:"author"`
	Replies   int       `json:"replies"`
	LastReply string    `json:"lastReply"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}


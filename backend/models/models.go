package models

import "time"

type User struct {
	ID           int64     `json:"userId"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	FullName     *string   `json:"fullName,omitempty"`
	Email        *string   `json:"email,omitempty"`
	Phone        *string   `json:"phone,omitempty"`
	Role         string    `json:"role"`
	AvatarURL    *string   `json:"avatarUrl,omitempty"`
	Bio          *string   `json:"bio,omitempty"`
	Gender       *string   `json:"gender,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type ReplyLike struct {
	ReplyID   int64     `json:"replyId"`
	UserID    int64     `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
}

type ReplyFavorite struct {
	ReplyID   int64     `json:"replyId"`
	UserID    int64     `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
}

type Course struct {
	ID             int64     `json:"id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	InstructorID   int64     `json:"instructorId"`
	InstructorName string    `json:"instructorName,omitempty"`
	CategoryID     *int64    `json:"categoryId,omitempty"`
	CategoryName   string    `json:"categoryName,omitempty"`
	Status         string    `json:"status"`
	CoverImageURL  *string   `json:"coverImageUrl,omitempty"`
	Enrolled       bool      `json:"enrolled"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Category struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

type Enrollment struct {
	ID         int64     `json:"id"`
	StudentID  int64     `json:"studentId"`
	CourseID   int64     `json:"courseId"`
	EnrolledAt time.Time `json:"enrolledAt"`
	Progress   int       `json:"progress"`
}

type Chapter struct {
	ID         int64  `json:"id"`
	CourseID   int64  `json:"courseId"`
	Title      string `json:"title"`
	OrderIndex int    `json:"orderIndex"`
}

type Lesson struct {
	ID         int64   `json:"id"`
	ChapterID  int64   `json:"chapterId"`
	Title      string  `json:"title"`
	Type       string  `json:"type"`
	VideoURL   *string `json:"videoUrl,omitempty"`
	ResourceID *int64  `json:"resourceId,omitempty"`
	OrderIndex int     `json:"orderIndex"`
}

type Assignment struct {
	ID          int64      `json:"id"`
	CourseID    int64      `json:"courseId"`
	Title       string     `json:"title"`
	Content     *string    `json:"content,omitempty"`
	Attachments *string    `json:"attachments,omitempty"`
	Deadline    *time.Time `json:"deadline,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type Submission struct {
	ID           int64     `json:"id"`
	AssignmentID int64     `json:"assignmentId"`
	StudentID    int64     `json:"studentId"`
	StudentName  *string   `json:"studentName,omitempty"`
	Content      *string   `json:"content,omitempty"`
	Attachments  *string   `json:"attachments,omitempty"`
	SubmittedAt  time.Time `json:"submittedAt"`
	Grade        *float64  `json:"grade,omitempty"`
	Feedback     *string   `json:"feedback,omitempty"`
}

type Exam struct {
	ID        int64     `json:"id"`
	CourseID  int64     `json:"courseId"`
	Title     string    `json:"title"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	CreatedAt time.Time `json:"createdAt"`
}

type Question struct {
	ID         int64   `json:"id"`
	ExamID     int64   `json:"examId"`
	Type       string  `json:"type"`
	Stem       string  `json:"stem"`
	Options    *string `json:"options,omitempty"`
	Answer     string  `json:"answer,omitempty"`
	Score      float64 `json:"score"`
	OrderIndex int     `json:"orderIndex"`
}

type ExamSubmission struct {
	ID          int64     `json:"id"`
	ExamID      int64     `json:"examId"`
	StudentID   int64     `json:"studentId"`
	SubmittedAt time.Time `json:"submittedAt"`
	TotalScore  *float64  `json:"totalScore,omitempty"`
}

type ExamAnswer struct {
	ID            int64    `json:"id"`
	SubmissionID  int64    `json:"submissionId"`
	QuestionID    int64    `json:"questionId"`
	StudentAnswer *string  `json:"studentAnswer,omitempty"`
	ScoreAwarded  *float64 `json:"scoreAwarded,omitempty"`
}

type Notification struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"userId"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
	Sender    string    `json:"sender"`
	CreatedAt time.Time `json:"createdAt"`
	Date      string    `json:"date"`
}

type Message struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Type      string    `json:"type"`
	CreatedAt time.Time `json:"createdAt"`
	Date      string    `json:"date"`
}

type Discussion struct {
	ID           int64             `json:"id"`
	CourseID     int64             `json:"courseId"`
	CourseTitle  string            `json:"courseTitle,omitempty"`
	AuthorID     int64             `json:"authorId"`
	AuthorName   string            `json:"authorName,omitempty"`
	Title        string            `json:"title"`
	Content      string            `json:"content"`
	Status       string            `json:"status"`
	Replies      int               `json:"replies"`
	Views        int               `json:"views"`
	Likes        int               `json:"likes"`
	HeatScore    float64           `json:"heatScore"`
	LastReplyAt  *time.Time        `json:"lastReplyAt,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
	UpdatedAt    time.Time         `json:"updatedAt"`
	RepliesList  []DiscussionReply `json:"repliesList,omitempty"`
	LinkedKB     string            `json:"linkedKnowledge,omitempty"`
	AIDraft      string            `json:"aiDraft,omitempty"`
	Confidence   float64           `json:"confidenceScore,omitempty"`
}

type DiscussionReply struct {
	ID           int64     `json:"id"`
	DiscussionID int64     `json:"discussionId"`
	AuthorID     int64     `json:"authorId"`
	AuthorName   string    `json:"authorName,omitempty"`
	Content      string    `json:"content"`
	LikeCount    int       `json:"likeCount"`
	FavCount     int       `json:"favCount"`
	IsLiked      bool      `json:"isLiked"`
	IsFavorited  bool      `json:"isFavorited"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

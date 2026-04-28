package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	"github.com/online-education-platform/backend/database"
)

func TestParseQuestionsWithAIReturnsLLMResult(t *testing.T) {
	withQuestionTestDB(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "```json\n{\"questions\":[{\"type\":\"SINGLE_CHOICE\",\"stem\":\"Go 中用于启动协程的关键字是？\",\"options\":[\"go\",\"func\",\"defer\",\"chan\"],\"answer\":\"A\",\"score\":3,\"confidence\":0.9,\"issues\":[]}]}\n```",
					},
				},
			},
		})
	}))
	defer server.Close()

	t.Setenv("OPENAI_API_KEY", "test-key")
	t.Setenv("OPENAI_BASE_URL", server.URL)
	t.Setenv("LLM_MODEL", "test-model")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newQuestionsMultipartRequest(t, "请生成一道 Go 并发单选题")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseQuestionsWithAI(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	data := decodeResponseData(t, w.Body.Bytes())
	if got := data["parseMode"]; got != "llm" {
		t.Fatalf("expected parseMode llm, got %#v", got)
	}
	if got := data["count"]; got != float64(1) {
		t.Fatalf("expected count 1, got %#v", got)
	}
}

func TestParseQuestionsWithAIReturnsFallbackReason(t *testing.T) {
	withQuestionTestDB(t)

	t.Setenv("OPENAI_API_KEY", "")
	t.Setenv("DASHSCOPE_API_KEY", "")
	t.Setenv("OPENAI_BASE_URL", "")
	t.Setenv("LLM_MODEL", "")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newQuestionsMultipartRequest(t, "单选题\n1. Go 中用于延迟执行函数的关键字是？\nA. defer\nB. go\nC. chan\nD. select\n答案: A")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseQuestionsWithAI(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	data := decodeResponseData(t, w.Body.Bytes())
	if got := data["parseMode"]; got != "rule_fallback" {
		t.Fatalf("expected parseMode rule_fallback, got %#v", got)
	}
	if got := data["fallbackReason"]; got != llmFallbackReasonMissingKey {
		t.Fatalf("expected fallbackReason %q, got %#v", llmFallbackReasonMissingKey, got)
	}
}

func TestParseQuestionsWithAIReturnsBadRequestWhenLLMAndRuleBothFail(t *testing.T) {
	withQuestionTestDB(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "plain text only",
					},
				},
			},
		})
	}))
	defer server.Close()

	t.Setenv("OPENAI_API_KEY", "test-key")
	t.Setenv("OPENAI_BASE_URL", server.URL)
	t.Setenv("LLM_MODEL", "test-model")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newQuestionsMultipartRequest(t, "请帮我出一张 Go 语言测试卷")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseQuestionsWithAI(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestParseQuestionsWithAIReturnsForbiddenForOtherInstructor(t *testing.T) {
	withQuestionTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newQuestionsMultipartRequest(t, "单选题\n1. Go 的作者是？\nA. Rob Pike\nB. Ken Thompson\n答案: A")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "INSTRUCTOR")
	c.Set("userID", int64(2))

	ParseQuestionsWithAI(c)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", w.Code)
	}
}

func TestNormalizeParsedQuestionsNormalizesAndFilters(t *testing.T) {
	questions := []ParsedQuestion{
		{
			Type:       "single choice",
			Stem:       " Go 中用于延迟执行函数的关键字是？ ",
			Options:    []string{"A. defer", "B. go", "C. chan"},
			Answer:     "(A)",
			Score:      0,
			Confidence: 1.2,
		},
		{
			Type:       "多选题",
			Stem:       " 哪些属于 Go 并发原语？ ",
			Options:    []string{"A. goroutine", "B. channel", "C. mutex"},
			Answer:     "C,A",
			Score:      5,
			Confidence: 0,
			Issues:     []string{"模型输出题型为中文"},
		},
		{
			Type:    "TRUE_FALSE",
			Stem:    "Go 必须手动管理内存。",
			Answer:  "错误",
			Options: []string{"无效选项"},
		},
		{
			Type:    "SHORT_ANSWER",
			Stem:    "请解释 channel 的作用。",
			Answer:  "  用于协程之间通信  ",
			Options: []string{"应被清空"},
		},
		{
			Type:    "SINGLE_CHOICE",
			Stem:    "无有效选项的题目",
			Options: []string{"A. 只有一个选项"},
			Answer:  "A",
		},
	}

	normalized := normalizeParsedQuestions(questions, 0.8)
	if len(normalized) != 4 {
		t.Fatalf("expected 4 normalized questions, got %d", len(normalized))
	}

	first := normalized[0]
	if first.Type != "SINGLE_CHOICE" {
		t.Fatalf("expected first type SINGLE_CHOICE, got %q", first.Type)
	}
	if first.Score != 3 {
		t.Fatalf("expected default score 3, got %v", first.Score)
	}
	if first.Answer != "A" {
		t.Fatalf("expected normalized answer A, got %q", first.Answer)
	}
	if first.Confidence != 1 {
		t.Fatalf("expected clamped confidence 1, got %v", first.Confidence)
	}
	if len(first.Options) != 3 || first.Options[0] != "defer" {
		t.Fatalf("expected cleaned options, got %#v", first.Options)
	}

	second := normalized[1]
	if second.Type != "MULTIPLE_CHOICE" {
		t.Fatalf("expected second type MULTIPLE_CHOICE, got %q", second.Type)
	}
	if second.Answer != "A,C" {
		t.Fatalf("expected sorted multiple answer A,C, got %q", second.Answer)
	}
	if second.Confidence <= 0 || second.Confidence > 1 {
		t.Fatalf("expected valid confidence, got %v", second.Confidence)
	}
	if len(second.Issues) == 0 {
		t.Fatal("expected issues to be preserved")
	}

	third := normalized[2]
	if third.Type != "TRUE_FALSE" || third.Answer != "false" {
		t.Fatalf("expected normalized true/false answer false, got type=%q answer=%q", third.Type, third.Answer)
	}
	if len(third.Options) != 0 {
		t.Fatalf("expected true/false options to be cleared, got %#v", third.Options)
	}

	fourth := normalized[3]
	if fourth.Type != "SHORT_ANSWER" {
		t.Fatalf("expected short answer type, got %q", fourth.Type)
	}
	if strings.TrimSpace(fourth.Answer) != "用于协程之间通信" {
		t.Fatalf("expected trimmed short answer, got %q", fourth.Answer)
	}
	if len(fourth.Options) != 0 {
		t.Fatalf("expected short answer options to be cleared, got %#v", fourth.Options)
	}
}

func TestConfirmParsedQuestionsReturnsBadRequestOnExamIDMismatch(t *testing.T) {
	withQuestionTestDB(t)

	body := bytes.NewBufferString(`{"examId":2,"originalQuestions":[],"confirmedQuestions":[{"type":"SINGLE_CHOICE","stem":"题目","options":["A","B"],"answer":"A","score":3}]}`)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/exams/1/questions/confirm", body)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ConfirmParsedQuestions(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestConfirmParsedQuestionsReturnsForbiddenForOtherInstructor(t *testing.T) {
	withQuestionTestDB(t)

	body := bytes.NewBufferString(`{"examId":1,"originalQuestions":[],"confirmedQuestions":[{"type":"SINGLE_CHOICE","stem":"题目","options":["A","B"],"answer":"A","score":3}]}`)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/exams/1/questions/confirm", body)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "INSTRUCTOR")
	c.Set("userID", int64(2))

	ConfirmParsedQuestions(c)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", w.Code)
	}
}

func TestConfirmParsedQuestionsReturnsPartialSuccessAndPersistsSanitizedQuestions(t *testing.T) {
	withQuestionTestDB(t)

	body := bytes.NewBufferString(`{
		"examId": 1,
		"originalQuestions": [
			{"type":"SINGLE_CHOICE","stem":"原始题目1","options":["A. defer","B. go"],"answer":"A","score":3},
			{"type":"SINGLE_CHOICE","stem":"原始题目2","options":["A. x"],"answer":"A","score":3},
			{"type":"TRUE_FALSE","stem":"原始题目3","answer":"错误","score":2}
		],
		"confirmedQuestions": [
			{"type":"single choice","stem":"Go 中用于延迟执行函数的关键字是？","options":["A. defer","B. go"],"answer":"A","score":0},
			{"type":"SINGLE_CHOICE","stem":"无效题","options":["A. only one"],"answer":"A","score":3},
			{"type":"TRUE_FALSE","stem":"Go 需要手动管理内存。","options":["should be removed"],"answer":"错误","score":2}
		]
	}`)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/exams/1/questions/confirm", body)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ConfirmParsedQuestions(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	data := decodeResponseData(t, w.Body.Bytes())
	if got := data["inserted"]; got != float64(2) {
		t.Fatalf("expected inserted 2, got %#v", got)
	}
	if got := data["total"]; got != float64(3) {
		t.Fatalf("expected total 3, got %#v", got)
	}

	rows, err := database.DB.Query(`SELECT type, options, answer, score, order_index FROM exam_questions WHERE exam_id = 1 ORDER BY order_index`)
	if err != nil {
		t.Fatalf("query exam_questions: %v", err)
	}
	defer rows.Close()

	type storedQuestion struct {
		qType      string
		options    string
		answer     string
		score      float64
		orderIndex int
	}
	stored := []storedQuestion{}
	for rows.Next() {
		var item storedQuestion
		if err := rows.Scan(&item.qType, &item.options, &item.answer, &item.score, &item.orderIndex); err != nil {
			t.Fatalf("scan exam_questions: %v", err)
		}
		stored = append(stored, item)
	}
	if len(stored) != 2 {
		t.Fatalf("expected 2 stored questions, got %d", len(stored))
	}
	if stored[0].answer != "A" {
		t.Fatalf("expected raw answer A, got %q", stored[0].answer)
	}
	if stored[0].options != `["defer","go"]` {
		t.Fatalf("expected cleaned options json, got %q", stored[0].options)
	}
	if stored[0].score != 3 {
		t.Fatalf("expected normalized default score 3, got %v", stored[0].score)
	}
	if stored[1].answer != "false" {
		t.Fatalf("expected normalized true/false answer false, got %q", stored[1].answer)
	}
	if stored[1].options != `[]` {
		t.Fatalf("expected non-choice options to be [], got %q", stored[1].options)
	}

	var correctedJSON string
	var diffSummary string
	err = database.DB.QueryRow(`SELECT corrected_json, diff_summary FROM ai_corrections WHERE exam_id = 1 ORDER BY id DESC LIMIT 1`).Scan(&correctedJSON, &diffSummary)
	if err != nil {
		t.Fatalf("query ai_corrections: %v", err)
	}

	var corrected []ParsedQuestion
	if err := json.Unmarshal([]byte(correctedJSON), &corrected); err != nil {
		t.Fatalf("unmarshal corrected_json: %v", err)
	}
	if len(corrected) != 2 {
		t.Fatalf("expected corrected_json to contain 2 questions, got %d", len(corrected))
	}
	if !strings.Contains(diffSummary, "跳过 1 道") {
		t.Fatalf("expected diff summary to mention skipped question, got %q", diffSummary)
	}
}

func TestConfirmParsedQuestionsReturnsBadRequestWhenAllQuestionsInvalid(t *testing.T) {
	withQuestionTestDB(t)

	body := bytes.NewBufferString(`{
		"examId": 1,
		"originalQuestions": [],
		"confirmedQuestions": [
			{"type":"SINGLE_CHOICE","stem":"无效题1","options":["A. only one"],"answer":"A","score":3},
			{"type":"TRUE_FALSE","stem":"无效题2","answer":"也许","score":2}
		]
	}`)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/exams/1/questions/confirm", body)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ConfirmParsedQuestions(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var count int
	if err := database.DB.QueryRow(`SELECT COUNT(*) FROM exam_questions WHERE exam_id = 1`).Scan(&count); err != nil {
		t.Fatalf("count exam_questions: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected 0 stored questions, got %d", count)
	}
}

func newQuestionsMultipartRequest(t *testing.T, content string) *http.Request {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	fileWriter, err := writer.CreateFormFile("file", "questions.txt")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fileWriter.Write([]byte(content)); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/1/parse-questions", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func withQuestionTestDB(t *testing.T) {
	t.Helper()

	originalDB := database.DB
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite memory db: %v", err)
	}
	database.DB = db

	t.Cleanup(func() {
		database.DB = originalDB
		_ = db.Close()
	})

	statements := []string{
		`CREATE TABLE courses (id INTEGER PRIMARY KEY, instructor_id INTEGER NOT NULL)`,
		`CREATE TABLE exams (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL, title TEXT, start_time DATETIME, end_time DATETIME, created_at DATETIME)`,
		`CREATE TABLE exam_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL, type TEXT NOT NULL, stem TEXT NOT NULL, options TEXT, answer TEXT NOT NULL, score REAL NOT NULL, order_index INTEGER NOT NULL DEFAULT 0)`,
		`CREATE TABLE ai_corrections (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL, user_id INTEGER NOT NULL, original_json TEXT NOT NULL, corrected_json TEXT NOT NULL, diff_summary TEXT NOT NULL DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
		`INSERT INTO courses (id, instructor_id) VALUES (1, 1)`,
		`INSERT INTO exams (id, course_id, title, start_time, end_time) VALUES (1, 1, 'Test Exam', '2026-01-01', '2026-01-02')`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("seed sqlite memory db: %v", err)
		}
	}
}

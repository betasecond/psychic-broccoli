package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	"github.com/online-education-platform/backend/database"
)

func TestParseCourseOutlineReturnsLLMResult(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "```json\n{\"chapters\":[{\"title\":\"第一章 Go\",\"sections\":[{\"title\":\"阅读材料\",\"type\":\"TEXT\"}]}]}\n```",
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
	c.Request = newOutlineMultipartRequest(t, "第一章 Go\n  阅读材料")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	data := decodeResponseData(t, w.Body.Bytes())
	if got := data["parseMode"]; got != "llm" {
		t.Fatalf("expected parseMode llm, got %#v", got)
	}
	if _, exists := data["fallbackReason"]; exists {
		t.Fatalf("did not expect fallbackReason, got %#v", data["fallbackReason"])
	}
}

func TestParseCourseOutlineReturnsFallbackReason(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "```json\n{\"chapters\": [}\n```",
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
	c.Request = newOutlineMultipartRequest(t, "第一章 Go\n  变量与类型")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	data := decodeResponseData(t, w.Body.Bytes())
	if got := data["parseMode"]; got != "rule_fallback" {
		t.Fatalf("expected parseMode rule_fallback, got %#v", got)
	}
	if got := data["fallbackReason"]; got != llmFallbackReasonJSONUnmarshalFailed {
		t.Fatalf("expected fallbackReason %q, got %#v", llmFallbackReasonJSONUnmarshalFailed, got)
	}
}

func TestParseCourseOutlineReturnsFallbackReasonWhenKeyMissing(t *testing.T) {
	withOutlineTestDB(t)

	t.Setenv("OPENAI_API_KEY", "")
	t.Setenv("DASHSCOPE_API_KEY", "")
	t.Setenv("OPENAI_BASE_URL", "")
	t.Setenv("LLM_MODEL", "")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newOutlineMultipartRequest(t, "第一章 Go\n  阅读材料")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

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

func TestParseCourseOutlineNormalizesLLMOutput(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": "```json\n{\"chapters\":[{\"title\":\"   \",\"sections\":[{\"title\":\"忽略我\",\"type\":\"VIDEO\"}]},{\"title\":\"第二章 进阶\",\"orderIndex\":9,\"sections\":[{\"title\":\"  \",\"type\":\"TEXT\"},{\"title\":\"阅读说明\",\"type\":\"OTHER\"},{\"title\":\"实战演练\",\"type\":\"OTHER\",\"orderIndex\":7}]}]}\n```",
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
	c.Request = newOutlineMultipartRequest(t, "第二章 进阶\n  阅读说明\n  实战演练")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	data := decodeResponseData(t, w.Body.Bytes())
	if got := data["chapterCount"]; got != float64(1) {
		t.Fatalf("expected chapterCount 1, got %#v", got)
	}
	if got := data["sectionCount"]; got != float64(2) {
		t.Fatalf("expected sectionCount 2, got %#v", got)
	}

	chapters := data["chapters"].([]any)
	chapter := chapters[0].(map[string]any)
	if got := chapter["orderIndex"]; got != float64(1) {
		t.Fatalf("expected normalized chapter orderIndex 1, got %#v", got)
	}

	sections := chapter["sections"].([]any)
	firstSection := sections[0].(map[string]any)
	secondSection := sections[1].(map[string]any)
	if got := firstSection["type"]; got != "TEXT" {
		t.Fatalf("expected first section type TEXT, got %#v", got)
	}
	if got := firstSection["orderIndex"]; got != float64(1) {
		t.Fatalf("expected first section orderIndex 1, got %#v", got)
	}
	if got := secondSection["type"]; got != "VIDEO" {
		t.Fatalf("expected second section type VIDEO, got %#v", got)
	}
	if got := secondSection["orderIndex"]; got != float64(2) {
		t.Fatalf("expected second section orderIndex 2, got %#v", got)
	}
}

func TestParseCourseOutlineReturnsBadRequestWhenLLMAndRuleBothFail(t *testing.T) {
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
	c.Request = newOutlineMultipartRequest(t, "x")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestParseCourseOutlineReturnsBadRequestForEmptyFile(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newOutlineMultipartRequest(t, "   \n")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestParseCourseOutlineReturnsBadRequestForOversizedFile(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newOutlineMultipartRequestWithFilename(t, bytes.Repeat([]byte("a"), 2*1024*1024+1), "outline.txt")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestParseCourseOutlineReturnsBadRequestForInvalidSuffix(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newOutlineMultipartRequestWithFilename(t, []byte("第一章 Go"), "outline.pdf")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "ADMIN")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestParseCourseOutlineReturnsForbiddenForStudent(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newOutlineMultipartRequest(t, "第一章 Go\n  阅读材料")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "STUDENT")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", w.Code)
	}
}

func TestParseCourseOutlineReturnsForbiddenForOtherInstructor(t *testing.T) {
	withOutlineTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newOutlineMultipartRequest(t, "第一章 Go\n  阅读材料")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "INSTRUCTOR")
	c.Set("userID", int64(2))

	ParseCourseOutline(c)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", w.Code)
	}
}

func TestParseCourseOutlineDoesNotWriteCourseTables(t *testing.T) {
	withOutlineTestDB(t)

	beforeChapters := countRows(t, "course_chapters")
	beforeSections := countRows(t, "course_sections")

	t.Setenv("OPENAI_API_KEY", "")
	t.Setenv("DASHSCOPE_API_KEY", "")
	t.Setenv("OPENAI_BASE_URL", "")
	t.Setenv("LLM_MODEL", "")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = newOutlineMultipartRequest(t, "第一章 Go\n  阅读材料")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("role", "INSTRUCTOR")
	c.Set("userID", int64(1))

	ParseCourseOutline(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	afterChapters := countRows(t, "course_chapters")
	afterSections := countRows(t, "course_sections")
	if beforeChapters != afterChapters {
		t.Fatalf("expected course_chapters count unchanged, before=%d after=%d", beforeChapters, afterChapters)
	}
	if beforeSections != afterSections {
		t.Fatalf("expected course_sections count unchanged, before=%d after=%d", beforeSections, afterSections)
	}
}

func newOutlineMultipartRequest(t *testing.T, content string) *http.Request {
	t.Helper()

	return newOutlineMultipartRequestWithFilename(t, []byte(content), "outline.txt")
}

func newOutlineMultipartRequestWithFilename(t *testing.T, content []byte, filename string) *http.Request {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	fileWriter, err := writer.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fileWriter.Write(content); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/courses/1/parse-outline", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func withOutlineTestDB(t *testing.T) {
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
		`CREATE TABLE course_chapters (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL, title TEXT NOT NULL, order_index INTEGER NOT NULL)`,
		`CREATE TABLE course_sections (id INTEGER PRIMARY KEY AUTOINCREMENT, chapter_id INTEGER NOT NULL, title TEXT NOT NULL, order_index INTEGER NOT NULL, type TEXT NOT NULL)`,
		`INSERT INTO courses (id, instructor_id) VALUES (1, 1)`,
		`INSERT INTO courses (id, instructor_id) VALUES (2, 2)`,
		`INSERT INTO course_chapters (course_id, title, order_index) VALUES (1, '手动章节', 1)`,
		`INSERT INTO course_sections (chapter_id, title, order_index, type) VALUES (1, '手动课时', 1, 'TEXT')`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("seed sqlite memory db: %v", err)
		}
	}
}

func countRows(t *testing.T, table string) int {
	t.Helper()

	var count int
	if err := database.DB.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count); err != nil {
		t.Fatalf("count rows from %s: %v", table, err)
	}
	return count
}

func decodeResponseData(t *testing.T, body []byte) map[string]any {
	t.Helper()

	var response struct {
		Code    int            `json:"code"`
		Message string         `json:"message"`
		Data    map[string]any `json:"data"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return response.Data
}

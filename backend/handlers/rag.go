package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	original_rag "github.com/online-education-platform/backend/rag"
	"github.com/online-education-platform/backend/utils"
	"go.uber.org/zap"
)

const ragMaxChunks = 200

// ---- 权限辅助 ----

func isCourseInstructorOrAdmin(c *gin.Context, courseID int64) bool {
	roleVal, _ := c.Get("role")
	role, _ := roleVal.(string)
	if role == "ADMIN" {
		return true
	}
	if role != "INSTRUCTOR" {
		return false
	}
	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)
	var instructorID int64
	err := database.DB.QueryRow(`SELECT instructor_id FROM courses WHERE id = ?`, courseID).Scan(&instructorID)
	return err == nil && instructorID == userID
}

func isCourseAccessible(c *gin.Context, courseID int64) bool {
	if isCourseInstructorOrAdmin(c, courseID) {
		return true
	}
	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM course_enrollments WHERE course_id=? AND student_id=?`, courseID, userID).Scan(&count) //nolint:errcheck
	return count > 0
}

// ---- UploadRAGDocument ----

// UploadRAGDocument POST /courses/:id/rag/documents
func UploadRAGDocument(c *gin.Context) {
	courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的课程 ID")
		return
	}
	if !isCourseInstructorOrAdmin(c, courseID) {
		utils.Forbidden(c, "权限不足，仅课程教师或管理员可上传知识库文档")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.BadRequest(c, "请上传文件（字段名: file）")
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(file)
	if err != nil {
		utils.InternalServerError(c, "读取文件失败")
		return
	}
	text := string(raw)
	charCount := len([]rune(text))

	chunks := original_rag.ChunkText(text, 500, 50)
	if len(chunks) == 0 {
		utils.BadRequest(c, "文件内容为空")
		return
	}
	if len(chunks) > ragMaxChunks {
		chunks = chunks[:ragMaxChunks]
	}

	embedClient := &original_rag.EmbedClient{
		APIKey:  utils.GetEnv("OPENAI_API_KEY", "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"),
		BaseURL: utils.GetEnv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
	}
	embeddings, err := embedClient.Embed(chunks)
	if err != nil {
		utils.GetLogger().Error("RAG embedding 失败", zap.Error(err))
		utils.InternalServerError(c, "向量化失败: "+err.Error())
		return
	}

	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)

	res, err := database.DB.Exec(
		`INSERT INTO rag_documents(course_id, filename, char_count, chunk_count, created_by, created_at)
		 VALUES(?,?,?,?,?,?)`,
		courseID, header.Filename, charCount, len(chunks), userID, time.Now(),
	)
	if err != nil {
		utils.InternalServerError(c, "保存文档记录失败")
		return
	}
	docID, _ := res.LastInsertId()

	for i, content := range chunks {
		var embJSON []byte
		if i < len(embeddings) && embeddings[i] != nil {
			embJSON, _ = json.Marshal(embeddings[i])
		}
		database.DB.Exec( //nolint:errcheck
			`INSERT INTO rag_chunks(doc_id, course_id, chunk_index, content, embedding, created_at)
			 VALUES(?,?,?,?,?,?)`,
			docID, courseID, i, content, string(embJSON), time.Now(),
		)
	}

	utils.GetLogger().Info("RAG 文档上传完成",
		zap.String("filename", header.Filename),
		zap.Int("chunks", len(chunks)),
	)
	utils.Success(c, gin.H{
		"doc_id":      docID,
		"filename":    header.Filename,
		"char_count":  charCount,
		"chunk_count": len(chunks),
	})
}

// ---- ListRAGDocuments ----

// ListRAGDocuments GET /courses/:id/rag/documents
func ListRAGDocuments(c *gin.Context) {
	courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的课程 ID")
		return
	}
	if !isCourseAccessible(c, courseID) {
		utils.Forbidden(c, "权限不足")
		return
	}

	rows, err := database.DB.Query(
		`SELECT d.id, d.filename, d.char_count, d.chunk_count, d.created_at, u.username
		 FROM rag_documents d
		 JOIN users u ON u.id = d.created_by
		 WHERE d.course_id = ?
		 ORDER BY d.created_at DESC`,
		courseID,
	)
	if err != nil {
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	type docItem struct {
		ID         int64  `json:"id"`
		Filename   string `json:"filename"`
		CharCount  int    `json:"char_count"`
		ChunkCount int    `json:"chunk_count"`
		CreatedAt  string `json:"created_at"`
		CreatedBy  string `json:"created_by"`
	}
	docs := make([]docItem, 0)
	for rows.Next() {
		var d docItem
		var t time.Time
		if err := rows.Scan(&d.ID, &d.Filename, &d.CharCount, &d.ChunkCount, &t, &d.CreatedBy); err != nil {
			continue
		}
		d.CreatedAt = t.Format(time.RFC3339)
		docs = append(docs, d)
	}
	utils.Success(c, docs)
}

// ---- DeleteRAGDocument ----

// DeleteRAGDocument DELETE /courses/:id/rag/documents/:docId
func DeleteRAGDocument(c *gin.Context) {
	courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的课程 ID")
		return
	}
	docID, err := strconv.ParseInt(c.Param("docId"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的文件 ID")
		return
	}
	if !isCourseInstructorOrAdmin(c, courseID) {
		utils.Forbidden(c, "权限不足")
		return
	}

	var cnt int
	database.DB.QueryRow(`SELECT COUNT(*) FROM rag_documents WHERE id=? AND course_id=?`, docID, courseID).Scan(&cnt) //nolint:errcheck
	if cnt == 0 {
		utils.NotFound(c, "文档不存在或不属于该课程")
		return
	}

	if _, err := database.DB.Exec(`DELETE FROM rag_documents WHERE id=?`, docID); err != nil {
		utils.InternalServerError(c, "删除失败")
		return
	}
	utils.Success(c, gin.H{"deleted": true})
}

// ---- QueryRAGExtended ----

// QueryRAGExtended POST /courses/:id/rag/query
func QueryRAGExtended(c *gin.Context) {
	courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的课程 ID")
		return
	}
	if !isCourseAccessible(c, courseID) {
		utils.Forbidden(c, "请先选课")
		return
	}

	var req struct {
		Question  string `json:"question" binding:"required"`
		SessionID string `json:"session_id"` // 可选，用于多轮对话记忆
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}

	apiKey := utils.GetEnv("OPENAI_API_KEY", "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")
	baseURL := utils.GetEnv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")

	// 1. 检索上下文 (常规逻辑)
	embedClient := &original_rag.EmbedClient{APIKey: apiKey, BaseURL: baseURL}
	queryEmbeddings, _ := embedClient.Embed([]string{req.Question})
	queryVec := queryEmbeddings[0]

	chunkRows, _ := database.DB.Query(`SELECT id, content, embedding FROM rag_chunks WHERE course_id=?`, courseID)
	var allChunks []original_rag.Chunk
	for chunkRows.Next() {
		var ch original_rag.Chunk
		var embStr string
		chunkRows.Scan(&ch.ID, &ch.Content, &embStr)
		json.Unmarshal([]byte(embStr), &ch.Embedding)
		allChunks = append(allChunks, ch)
	}
	topChunks := original_rag.TopK(queryVec, allChunks, 5)
	contexts := make([]string, len(topChunks))
	for i, ch := range topChunks {
		contexts[i] = ch.Content
	}

	// 2. 模拟多轮对话记忆 (简单的数据库实现，若无 Redis)
	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)
	
	history := []original_rag.ChatMessage{}
	if req.SessionID != "" {
		// 从数据库 rag_queries 中拉取最近 5 轮该 Session 的对话
		rows, _ := database.DB.Query(`
			SELECT question, answer FROM rag_queries 
			WHERE course_id=? AND user_id=? AND session_id=? 
			ORDER BY created_at DESC LIMIT 5`, 
			courseID, userID, req.SessionID,
		)
		for rows.Next() {
			var q, a string
			rows.Scan(&q, &a)
			history = append([]original_rag.ChatMessage{
				{Role: "user", Content: q},
				{Role: "assistant", Content: a},
			}, history...)
		}
		rows.Close()
	}

	// 3. 生成回答
	genClient := &original_rag.GenClient{APIKey: apiKey, BaseURL: baseURL}
	answer, err := genClient.GenerateWithHistory(req.Question, contexts, history)
	if err != nil {
		utils.InternalServerError(c, "生成失败")
		return
	}

	// 4. 保存对话记录
	database.DB.Exec(
		`INSERT INTO rag_queries(course_id, user_id, session_id, question, answer, created_at)
		 VALUES(?,?,?,?,?,?)`,
		courseID, userID, req.SessionID, req.Question, answer, time.Now(),
	)

	utils.Success(c, gin.H{"answer": answer})
}

// ---- QueryRAG ----

// QueryRAG POST /courses/:id/rag/query
func QueryRAG(c *gin.Context) {
	courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的课程 ID")
		return
	}
	if !isCourseAccessible(c, courseID) {
		utils.Forbidden(c, "请先选课或确认教师/管理员权限")
		return
	}

	var req struct {
		Question string `json:"question" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "请提供 question 字段")
		return
	}

	apiKey := utils.GetEnv("OPENAI_API_KEY", "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")
	baseURL := utils.GetEnv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")

	embedClient := &original_rag.EmbedClient{APIKey: apiKey, BaseURL: baseURL}
	queryEmbeddings, err := embedClient.Embed([]string{req.Question})
	if err != nil {
		utils.InternalServerError(c, "问题向量化失败: "+err.Error())
		return
	}
	if len(queryEmbeddings) == 0 || queryEmbeddings[0] == nil {
		utils.InternalServerError(c, "问题向量化返回空结果")
		return
	}
	queryVec := queryEmbeddings[0]

	chunkRows, err := database.DB.Query(
		`SELECT id, doc_id, content, embedding FROM rag_chunks
		 WHERE course_id=? AND embedding IS NOT NULL AND embedding != ''`,
		courseID,
	)
	if err != nil {
		utils.InternalServerError(c, "检索失败")
		return
	}
	defer chunkRows.Close()

	var allChunks []original_rag.Chunk
	for chunkRows.Next() {
		var ch original_rag.Chunk
		var embStr string
		if err := chunkRows.Scan(&ch.ID, &ch.DocID, &ch.Content, &embStr); err != nil {
			continue
		}
		var emb []float32
		if err := json.Unmarshal([]byte(embStr), &emb); err == nil {
			ch.Embedding = emb
		}
		allChunks = append(allChunks, ch)
	}

	if len(allChunks) == 0 {
		utils.Success(c, gin.H{
			"answer":  "该课程暂无知识库文档，请教师先上传资料。",
			"sources": []string{},
		})
		return
	}

	topChunks := original_rag.TopK(queryVec, allChunks, 5)
	contexts := make([]string, len(topChunks))
	sourceIDs := make([]int64, len(topChunks))
	for i, ch := range topChunks {
		contexts[i] = ch.Content
		sourceIDs[i] = ch.ID
	}

	genClient := &original_rag.GenClient{
		APIKey:  apiKey,
		BaseURL: baseURL,
		Model:   utils.GetEnv("LLM_MODEL", "google/gemini-2.5-flash-preview"),
	}
	answer, err := genClient.Generate(req.Question, contexts)
	if err != nil {
		utils.GetLogger().Error("RAG 生成失败", zap.Error(err))
		utils.InternalServerError(c, "生成答案失败: "+err.Error())
		return
	}

	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)
	sourceJSON, _ := json.Marshal(sourceIDs)
	database.DB.Exec( //nolint:errcheck
		`INSERT INTO rag_queries(course_id, user_id, question, answer, source_chunks, created_at)
		 VALUES(?,?,?,?,?,?)`,
		courseID, userID, req.Question, answer, string(sourceJSON), time.Now(),
	)

	utils.Success(c, gin.H{
		"answer":  answer,
		"sources": contexts,
	})
}

// ---- GetRAGQueryHistory ----

// GetRAGQueryHistory GET /courses/:id/rag/queries
func GetRAGQueryHistory(c *gin.Context) {
	courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的课程 ID")
		return
	}
	if !isCourseAccessible(c, courseID) {
		utils.Forbidden(c, "权限不足")
		return
	}

	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(int64)

	var rows *sql.Rows
	if isCourseInstructorOrAdmin(c, courseID) {
		rows, err = database.DB.Query(
			`SELECT id, user_id, question, answer, created_at FROM rag_queries
			 WHERE course_id=? ORDER BY created_at DESC LIMIT 100`,
			courseID,
		)
	} else {
		rows, err = database.DB.Query(
			`SELECT id, user_id, question, answer, created_at FROM rag_queries
			 WHERE course_id=? AND user_id=? ORDER BY created_at DESC LIMIT 50`,
			courseID, userID,
		)
	}
	if err != nil {
		utils.InternalServerError(c, "查询历史失败")
		return
	}
	defer rows.Close()

	type queryItem struct {
		ID        int64  `json:"id"`
		UserID    int64  `json:"user_id"`
		Question  string `json:"question"`
		Answer    string `json:"answer"`
		CreatedAt string `json:"created_at"`
	}
	result := make([]queryItem, 0)
	for rows.Next() {
		var q queryItem
		var t time.Time
		var answer sql.NullString
		if err := rows.Scan(&q.ID, &q.UserID, &q.Question, &answer, &t); err != nil {
			continue
		}
		q.Answer = answer.String
		q.CreatedAt = t.Format(time.RFC3339)
		result = append(result, q)
	}
	utils.Success(c, result)
}

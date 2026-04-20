package handlers

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "os"
    "strconv"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/online-education-platform/backend/database"
    ragpkg "github.com/online-education-platform/backend/rag"
    "github.com/online-education-platform/backend/utils"
    "go.uber.org/zap"
)

const (
    ragMaxChunks    = 200
    ragChunkSize    = 600
    ragChunkOverlap = 80
    ragTopK         = 5
)

type ragSource struct {
    ChunkID    int64  `json:"chunkId"`
    DocumentID int64  `json:"documentId"`
    Filename   string `json:"filename"`
    ChunkIndex int    `json:"chunkIndex"`
    Content    string `json:"content"`
}

type ragQueryHistoryItem struct {
    ID        int64       `json:"id"`
    UserID    int64       `json:"user_id"`
    SessionID string      `json:"session_id"`
    Question  string      `json:"question"`
    Answer    string      `json:"answer"`
    Sources   []ragSource `json:"sources"`
    CreatedAt string      `json:"created_at"`
}

type storedRAGChunk struct {
    ragpkg.Chunk
    ChunkIndex int
    Filename   string
}

func isCourseInstructorOrAdmin(c *gin.Context, courseID int64) bool {
    ok, err := canManageCourse(c, courseID)
    return err == nil && ok
}

func isCourseAccessible(c *gin.Context, courseID int64) bool {
    ok, err := canAccessCourse(c, courseID)
    return err == nil && ok
}

func getRAGConfig() (apiKey, baseURL, model string, err error) {
    apiKey = strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
    if apiKey == "" {
        return "", "", "", fmt.Errorf("缺少 OPENAI_API_KEY 配置，无法执行 RAG 向量化或问答")
    }

    baseURL = strings.TrimSpace(os.Getenv("OPENAI_BASE_URL"))
    model = strings.TrimSpace(os.Getenv("LLM_MODEL"))
    return apiKey, baseURL, model, nil
}

func getCurrentUserID(c *gin.Context) int64 {
    userIDVal, _ := c.Get("userID")
    userID, _ := userIDVal.(int64)
    return userID
}

func defaultSessionID(courseID, userID int64, sessionID string) string {
    sessionID = strings.TrimSpace(sessionID)
    if sessionID != "" {
        return sessionID
    }
    return fmt.Sprintf("course_%d_user_%d", courseID, userID)
}

func loadRecentRAGHistory(courseID, userID int64, sessionID string, limit int) ([]ragpkg.ChatMessage, error) {
    if sessionID == "" || limit <= 0 {
        return nil, nil
    }

    rows, err := database.DB.Query(
        `SELECT question, answer
         FROM rag_queries
         WHERE course_id = ? AND user_id = ? AND session_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        courseID, userID, sessionID, limit,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    type pair struct {
        question string
        answer   string
    }

    pairs := make([]pair, 0, limit)
    for rows.Next() {
        var item pair
        var answer sql.NullString
        if err := rows.Scan(&item.question, &answer); err != nil {
            continue
        }
        item.answer = answer.String
        pairs = append(pairs, item)
    }

    history := make([]ragpkg.ChatMessage, 0, len(pairs)*2)
    for i := len(pairs) - 1; i >= 0; i-- {
        history = append(history, ragpkg.ChatMessage{Role: "user", Content: pairs[i].question})
        if strings.TrimSpace(pairs[i].answer) != "" {
            history = append(history, ragpkg.ChatMessage{Role: "assistant", Content: pairs[i].answer})
        }
    }
    return history, nil
}

func fetchCourseChunks(courseID int64) ([]storedRAGChunk, error) {
    rows, err := database.DB.Query(
        `SELECT c.id, c.doc_id, COALESCE(c.chunk_index, 0), c.content, c.embedding, d.filename
         FROM rag_chunks c
         JOIN rag_documents d ON d.id = c.doc_id
         WHERE COALESCE(c.course_id, d.course_id) = ? AND c.embedding IS NOT NULL AND c.embedding != ''
         ORDER BY c.doc_id ASC, COALESCE(c.chunk_index, c.id) ASC`,
        courseID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    chunks := make([]storedRAGChunk, 0)
    for rows.Next() {
        var item storedRAGChunk
        var embedding string
        if err := rows.Scan(&item.ID, &item.DocID, &item.ChunkIndex, &item.Content, &embedding, &item.Filename); err != nil {
            continue
        }
        if err := json.Unmarshal([]byte(embedding), &item.Embedding); err != nil || len(item.Embedding) == 0 {
            continue
        }
        chunks = append(chunks, item)
    }

    return chunks, nil
}

func buildRAGSources(chunks []storedRAGChunk) ([]ragSource, []string, []int64) {
    sources := make([]ragSource, 0, len(chunks))
    contexts := make([]string, 0, len(chunks))
    sourceIDs := make([]int64, 0, len(chunks))

    for _, chunk := range chunks {
        sources = append(sources, ragSource{
            ChunkID:    chunk.ID,
            DocumentID: chunk.DocID,
            Filename:   chunk.Filename,
            ChunkIndex: chunk.ChunkIndex,
            Content:    chunk.Content,
        })
        contexts = append(contexts, chunk.Content)
        sourceIDs = append(sourceIDs, chunk.ID)
    }

    return sources, contexts, sourceIDs
}

func decodeSourceIDs(raw string) []int64 {
    raw = strings.TrimSpace(raw)
    if raw == "" {
        return nil
    }

    var ids []int64
    if err := json.Unmarshal([]byte(raw), &ids); err == nil {
        return ids
    }
    return nil
}

func loadSourcesByChunkIDs(chunkIDs []int64) ([]ragSource, error) {
    if len(chunkIDs) == 0 {
        return []ragSource{}, nil
    }

    placeholders := make([]string, 0, len(chunkIDs))
    args := make([]interface{}, 0, len(chunkIDs))
    for _, id := range chunkIDs {
        placeholders = append(placeholders, "?")
        args = append(args, id)
    }

    rows, err := database.DB.Query(
        fmt.Sprintf(
            `SELECT c.id, c.doc_id, d.filename, COALESCE(c.chunk_index, 0), c.content
             FROM rag_chunks c
             JOIN rag_documents d ON d.id = c.doc_id
             WHERE c.id IN (%s)`,
            strings.Join(placeholders, ","),
        ),
        args...,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    sourceMap := make(map[int64]ragSource, len(chunkIDs))
    for rows.Next() {
        var source ragSource
        if err := rows.Scan(&source.ChunkID, &source.DocumentID, &source.Filename, &source.ChunkIndex, &source.Content); err != nil {
            continue
        }
        sourceMap[source.ChunkID] = source
    }

    sources := make([]ragSource, 0, len(chunkIDs))
    for _, id := range chunkIDs {
        if source, ok := sourceMap[id]; ok {
            sources = append(sources, source)
        }
    }
    return sources, nil
}

func saveRAGQuery(courseID, userID int64, sessionID, question, answer string, sourceIDs []int64) {
    sourceJSON, _ := json.Marshal(sourceIDs)
    if _, err := database.DB.Exec(
        `INSERT INTO rag_queries(course_id, user_id, session_id, question, answer, source_chunks, created_at)
         VALUES(?,?,?,?,?,?,?)`,
        courseID, userID, sessionID, question, answer, string(sourceJSON), time.Now(),
    ); err != nil {
        utils.GetLogger().Warn("failed to persist rag query", zap.Error(err))
    }
}

func parseCourseID(c *gin.Context) (int64, bool) {
    courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        utils.BadRequest(c, "无效的课程 ID")
        return 0, false
    }
    return courseID, true
}

func UploadRAGDocument(c *gin.Context) {
    courseID, ok := parseCourseID(c)
    if !ok {
        return
    }
    if !isCourseInstructorOrAdmin(c, courseID) {
        utils.Forbidden(c, "仅课程教师或管理员可以上传知识库文档")
        return
    }

    apiKey, baseURL, _, cfgErr := getRAGConfig()
    if cfgErr != nil {
        utils.InternalServerError(c, cfgErr.Error())
        return
    }

    file, header, err := c.Request.FormFile("file")
    if err != nil {
        utils.BadRequest(c, "请上传 file 字段的文档")
        return
    }
    defer file.Close()

    text, err := ragpkg.ExtractText(header.Filename, file)
    if err != nil {
        utils.BadRequest(c, "文档解析失败: "+err.Error())
        return
    }

    charCount := len([]rune(text))
    if charCount == 0 {
        utils.BadRequest(c, "文档内容为空")
        return
    }

    chunks := ragpkg.ChunkText(text, ragChunkSize, ragChunkOverlap)
    if len(chunks) == 0 {
        utils.BadRequest(c, "文档内容为空")
        return
    }
    if len(chunks) > ragMaxChunks {
        chunks = chunks[:ragMaxChunks]
    }

    embedClient := &ragpkg.EmbedClient{APIKey: apiKey, BaseURL: baseURL}
    embeddings, err := embedClient.Embed(chunks)
    if err != nil {
        utils.GetLogger().Error("rag embedding failed", zap.Error(err))
        utils.InternalServerError(c, "文档向量化失败: "+err.Error())
        return
    }

    userID := getCurrentUserID(c)
    tx, err := database.DB.Begin()
    if err != nil {
        utils.InternalServerError(c, "创建文档事务失败")
        return
    }
    defer tx.Rollback() //nolint:errcheck

    res, err := tx.Exec(
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
        embeddingJSON, _ := json.Marshal(embeddings[i])
        if _, err := tx.Exec(
            `INSERT INTO rag_chunks(doc_id, course_id, chunk_index, content, embedding, created_at)
             VALUES(?,?,?,?,?,?)`,
            docID, courseID, i, content, string(embeddingJSON), time.Now(),
        ); err != nil {
            utils.InternalServerError(c, "保存文档分块失败")
            return
        }
    }

    if err := tx.Commit(); err != nil {
        utils.InternalServerError(c, "提交文档失败")
        return
    }

    utils.Success(c, gin.H{
        "id":          docID,
        "filename":    header.Filename,
        "char_count":  charCount,
        "chunk_count": len(chunks),
    })
}

func ListRAGDocuments(c *gin.Context) {
    courseID, ok := parseCourseID(c)
    if !ok {
        return
    }
    if !isCourseAccessible(c, courseID) {
        utils.Forbidden(c, "没有权限访问该课程知识库")
        return
    }

    rows, err := database.DB.Query(
        `SELECT d.id,
                d.filename,
                COALESCE(d.char_count, 0),
                COALESCE(d.chunk_count, 0),
                COALESCE(strftime('%Y-%m-%dT%H:%M:%SZ', d.created_at), ''),
                COALESCE(u.username, '')
         FROM rag_documents d
         LEFT JOIN users u ON u.id = d.created_by
         WHERE d.course_id = ?
         ORDER BY COALESCE(d.created_at, '1970-01-01 00:00:00') DESC, d.id DESC`,
        courseID,
    )
    if err != nil {
        utils.InternalServerError(c, "查询知识库文档失败")
        return
    }
    defer rows.Close()

    type item struct {
        ID         int64  `json:"id"`
        Filename   string `json:"filename"`
        CharCount  int    `json:"char_count"`
        ChunkCount int    `json:"chunk_count"`
        CreatedAt  string `json:"created_at"`
        CreatedBy  string `json:"created_by"`
    }

    result := make([]item, 0)
    for rows.Next() {
        var doc item
        if err := rows.Scan(&doc.ID, &doc.Filename, &doc.CharCount, &doc.ChunkCount, &doc.CreatedAt, &doc.CreatedBy); err != nil {
            continue
        }
        result = append(result, doc)
    }

    utils.Success(c, result)
}

func DeleteRAGDocument(c *gin.Context) {
    courseID, ok := parseCourseID(c)
    if !ok {
        return
    }
    docID, err := strconv.ParseInt(c.Param("docId"), 10, 64)
    if err != nil {
        utils.BadRequest(c, "无效的文档 ID")
        return
    }
    if !isCourseInstructorOrAdmin(c, courseID) {
        utils.Forbidden(c, "没有权限删除该文档")
        return
    }

    var count int
    database.DB.QueryRow(
        `SELECT COUNT(*) FROM rag_documents WHERE id = ? AND course_id = ?`,
        docID, courseID,
    ).Scan(&count) //nolint:errcheck
    if count == 0 {
        utils.NotFound(c, "文档不存在或不属于当前课程")
        return
    }

    if _, err := database.DB.Exec(`DELETE FROM rag_documents WHERE id = ?`, docID); err != nil {
        utils.InternalServerError(c, "删除文档失败")
        return
    }

    utils.Success(c, gin.H{"deleted": true})
}

func QueryRAGExtended(c *gin.Context) {
    courseID, ok := parseCourseID(c)
    if !ok {
        return
    }
    if !isCourseAccessible(c, courseID) {
        utils.Forbidden(c, "请先选课后再访问课程知识库")
        return
    }

    var req struct {
        Question  string `json:"question" binding:"required"`
        SessionID string `json:"session_id"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.BadRequest(c, "请提供 question 字段")
        return
    }

    req.Question = strings.TrimSpace(req.Question)
    if req.Question == "" {
        utils.BadRequest(c, "问题不能为空")
        return
    }

    apiKey, baseURL, model, cfgErr := getRAGConfig()
    if cfgErr != nil {
        utils.InternalServerError(c, cfgErr.Error())
        return
    }

    userID := getCurrentUserID(c)
    sessionID := defaultSessionID(courseID, userID, req.SessionID)

    allChunks, err := fetchCourseChunks(courseID)
    if err != nil {
        utils.InternalServerError(c, "读取课程知识库失败")
        return
    }
    if len(allChunks) == 0 {
        utils.Success(c, gin.H{
            "answer":     "当前课程还没有可用的知识库文档，请先由教师上传课程资料。",
            "sources":    []ragSource{},
            "session_id": sessionID,
        })
        return
    }

    embedClient := &ragpkg.EmbedClient{APIKey: apiKey, BaseURL: baseURL}
    queryEmbeddings, err := embedClient.Embed([]string{req.Question})
    if err != nil || len(queryEmbeddings) == 0 || len(queryEmbeddings[0]) == 0 {
        if err == nil {
            err = fmt.Errorf("问题向量为空")
        }
        utils.InternalServerError(c, "问题向量化失败: "+err.Error())
        return
    }

    baseChunks := make([]ragpkg.Chunk, 0, len(allChunks))
    chunkMap := make(map[int64]storedRAGChunk, len(allChunks))
    for _, chunk := range allChunks {
        baseChunks = append(baseChunks, chunk.Chunk)
        chunkMap[chunk.ID] = chunk
    }

    topBaseChunks := ragpkg.TopK(queryEmbeddings[0], baseChunks, ragTopK)
    if len(topBaseChunks) == 0 {
        utils.Success(c, gin.H{
            "answer":     "当前课程资料中没有找到与问题相关的内容，请换个问法或先补充课程资料。",
            "sources":    []ragSource{},
            "session_id": sessionID,
        })
        return
    }

    selected := make([]storedRAGChunk, 0, len(topBaseChunks))
    for _, chunk := range topBaseChunks {
        if full, ok := chunkMap[chunk.ID]; ok {
            selected = append(selected, full)
        }
    }
    sources, contexts, sourceIDs := buildRAGSources(selected)

    history, err := loadRecentRAGHistory(courseID, userID, sessionID, 5)
    if err != nil {
        utils.GetLogger().Warn("failed to load rag history", zap.Error(err))
    }

    genClient := &ragpkg.GenClient{APIKey: apiKey, BaseURL: baseURL, Model: model}
    answer, err := genClient.GenerateWithHistory(req.Question, contexts, history)
    if err != nil {
        utils.GetLogger().Error("rag generation failed", zap.Error(err))
        utils.InternalServerError(c, "生成回答失败: "+err.Error())
        return
    }

    saveRAGQuery(courseID, userID, sessionID, req.Question, answer, sourceIDs)
    utils.Success(c, gin.H{
        "answer":     answer,
        "sources":    sources,
        "session_id": sessionID,
    })
}

func QueryRAG(c *gin.Context) {
    QueryRAGExtended(c)
}

func GetRAGQueryHistory(c *gin.Context) {
    courseID, ok := parseCourseID(c)
    if !ok {
        return
    }
    if !isCourseAccessible(c, courseID) {
        utils.Forbidden(c, "没有权限访问该课程知识库")
        return
    }

    userID := getCurrentUserID(c)
    query := `SELECT id, user_id, COALESCE(session_id, ''), question, answer, COALESCE(source_chunks, ''), created_at
              FROM rag_queries
              WHERE course_id = ?`
    args := []interface{}{courseID}
    if !isCourseInstructorOrAdmin(c, courseID) {
        query += ` AND user_id = ?`
        args = append(args, userID)
    }
    query += ` ORDER BY created_at DESC LIMIT 50`

    rows, err := database.DB.Query(query, args...)
    if err != nil {
        utils.InternalServerError(c, "查询问答历史失败")
        return
    }
    defer rows.Close()

    result := make([]ragQueryHistoryItem, 0)
    for rows.Next() {
        var item ragQueryHistoryItem
        var answer sql.NullString
        var rawSources string
        var createdAt time.Time
        if err := rows.Scan(&item.ID, &item.UserID, &item.SessionID, &item.Question, &answer, &rawSources, &createdAt); err != nil {
            continue
        }
        item.Answer = answer.String
        item.CreatedAt = createdAt.Format(time.RFC3339)
        item.Sources, _ = loadSourcesByChunkIDs(decodeSourceIDs(rawSources))
        result = append(result, item)
    }

    utils.Success(c, result)
}

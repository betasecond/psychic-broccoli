package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
	"go.uber.org/zap"
)

// ParsedQuestion 解析出的题目结构
type ParsedQuestion struct {
	Type       string   `json:"type"`
	Stem       string   `json:"stem"`
	Options    []string `json:"options,omitempty"`
	Answer     string   `json:"answer"`
	Score      float64  `json:"score"`
	Confidence float64  `json:"confidence"` // 0.0–1.0，置信度评分
	Issues     []string `json:"issues"`     // 具体问题列表
}

// calcConfidence 计算一道题的置信度评分（满分100，归一化到0.0-1.0）
func calcConfidence(q *ParsedQuestion) {
	score := 100
	issues := []string{}

	if strings.TrimSpace(q.Stem) == "" {
		score -= 40
		issues = append(issues, "题干为空")
	}

	if (q.Type == "SINGLE_CHOICE" || q.Type == "MULTIPLE_CHOICE") && len(q.Options) < 2 {
		score -= 30
		issues = append(issues, "选择题选项少于2个")
	}

	if strings.TrimSpace(q.Answer) == "" {
		score -= 20
		issues = append(issues, "答案为空")
	}

	// 选项字母与答案字母匹配检查
	if q.Type == "SINGLE_CHOICE" && len(q.Options) > 0 && len(q.Answer) == 1 {
		ans := strings.ToUpper(q.Answer)
		if ans < "A" || rune(ans[0]) > rune('A')+rune(len(q.Options)-1) {
			score -= 10
			issues = append(issues, "答案字母超出选项范围")
		}
	}

	if score < 0 {
		score = 0
	}
	q.Confidence = float64(score) / 100.0
	q.Issues = issues
}

// ParseQuestionsWithAI 优先使用 LLM 解析/生成题目，失败时回退到本地规则解析
func ParseQuestionsWithAI(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}
	examID, ok := parseExamIDParam(c)
	if !ok {
		return
	}
	if !ensureExamManageable(c, examID, "权限不足") {
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.BadRequest(c, "请上传文件")
		return
	}
	defer file.Close()

	if header.Size > 2*1024*1024 {
		utils.BadRequest(c, "文件大小不能超过2MB")
		return
	}

	filename := strings.ToLower(header.Filename)
	if !strings.HasSuffix(filename, ".txt") &&
		!strings.HasSuffix(filename, ".md") &&
		!strings.HasSuffix(filename, ".csv") {
		utils.BadRequest(c, "仅支持 .txt / .md / .csv 格式的文件")
		return
	}

	content, err := io.ReadAll(file)
	if err != nil {
		utils.InternalServerError(c, "读取文件失败")
		return
	}

	text := strings.TrimSpace(string(content))
	if text == "" {
		utils.BadRequest(c, "文件内容为空")
		return
	}

	questions, llmErr := parseQuestionsWithLLM(c, text)
	if llmErr == nil {
		questions = normalizeParsedQuestions(questions, 0.8)
		if len(questions) == 0 {
			llmErr = newLLMFallbackError(llmFallbackReasonValidationFailed)
		}
	}
	parseMode := "llm"
	fallbackReason := ""
	if llmErr != nil {
		utils.GetLogger().Warn("LLM 题目解析失败，回退到规则解析", zap.Error(llmErr))
		fallbackReason = llmFallbackReason(llmErr)
		questions = normalizeParsedQuestions(parseQuestions(text), 0)
		parseMode = "rule_fallback"
	}
	if len(questions) == 0 {
		utils.BadRequest(c, "未能识别任何题目，请检查文件格式")
		return
	}

	response := gin.H{
		"questions": questions,
		"count":     len(questions),
		"parseMode": parseMode,
	}
	if parseMode == "rule_fallback" && fallbackReason != "" {
		response["fallbackReason"] = fallbackReason
	}
	utils.Success(c, response)
}

func parseQuestionsWithLLM(c *gin.Context, text string) ([]ParsedQuestion, error) {
	systemPrompt := `你是在线教育平台 CourseArk 的考试题目结构化助手。
请把用户提供的题目文本解析为严格 JSON；如果用户给出的是自然语言出题要求，则直接生成结构化题目 JSON。
只输出 JSON，不要输出 Markdown、解释或代码块。
JSON 格式必须为：
{
  "questions": [
    {
      "type": "SINGLE_CHOICE",
      "stem": "题干",
      "options": ["选项A", "选项B"],
      "answer": "A",
      "score": 3,
      "confidence": 0.8,
      "issues": []
    }
  ]
}
题型只能是 SINGLE_CHOICE、MULTIPLE_CHOICE、TRUE_FALSE、SHORT_ANSWER。
要求：
1. questions 至少 1 项。
2. 选择题 options 为纯选项文本，不带 A. / B. 前缀。
3. SINGLE_CHOICE answer 为单个字母。
4. MULTIPLE_CHOICE answer 为逗号分隔字母，如 A,C。
5. TRUE_FALSE answer 为 true 或 false。
6. SHORT_ANSWER answer 为参考答案文本。
7. score 必须大于 0，confidence 范围为 0 到 1，issues 无问题时返回空数组。`
	userPrompt := "请解析或生成以下考试题目内容：\n\n" + text

	raw, err := completeWithConfiguredLLM(c, systemPrompt, userPrompt)
	if err != nil {
		return nil, err
	}

	jsonText, err := extractJSONObject(raw)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Questions []ParsedQuestion `json:"questions"`
	}
	if err := json.Unmarshal([]byte(jsonText), &payload); err != nil {
		return nil, newLLMFallbackError(llmFallbackReasonJSONUnmarshalFailed, err)
	}
	if len(payload.Questions) == 0 {
		return nil, newLLMFallbackError(llmFallbackReasonValidationFailed)
	}
	return payload.Questions, nil
}

// ParseQuestionsStream SSE 流式解析题目文件
func ParseQuestionsStream(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.BadRequest(c, "请上传文件")
		return
	}
	defer file.Close()

	if header.Size > 2*1024*1024 {
		utils.BadRequest(c, "文件大小不能超过2MB")
		return
	}

	filename := strings.ToLower(header.Filename)
	if !strings.HasSuffix(filename, ".txt") &&
		!strings.HasSuffix(filename, ".md") &&
		!strings.HasSuffix(filename, ".csv") {
		utils.BadRequest(c, "仅支持 .txt / .md / .csv 格式的文件")
		return
	}

	content, err := io.ReadAll(file)
	if err != nil {
		utils.InternalServerError(c, "读取文件失败")
		return
	}

	text := strings.TrimSpace(string(content))
	if text == "" {
		utils.BadRequest(c, "文件内容为空")
		return
	}

	questions := parseQuestions(text)

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // 禁用 Nginx 缓冲

	ctx := c.Request.Context()
	c.Stream(func(w io.Writer) bool {
		for i, q := range questions {
			// 检查客户端是否已断连
			select {
			case <-ctx.Done():
				return false
			default:
			}

			data, _ := json.Marshal(gin.H{
				"index":    i + 1,
				"question": q,
				"done":     false,
			})
			fmt.Fprintf(w, "data: %s\n\n", data)
		}

		// 发送结束信号
		endData, _ := json.Marshal(gin.H{
			"done":  true,
			"total": len(questions),
		})
		fmt.Fprintf(w, "data: %s\n\n", endData)
		return false
	})
}

// ConfirmParseRequest 确认导入解析结果的请求体
type ConfirmParseRequest struct {
	ExamID             int64            `json:"examId" binding:"required"`
	OriginalQuestions  []ParsedQuestion `json:"originalQuestions" binding:"required"`
	ConfirmedQuestions []ParsedQuestion `json:"confirmedQuestions" binding:"required"`
}

// ConfirmParsedQuestions 确认并批量导入解析题目，同时记录 AI 修改记录（PLAN-05）
func ConfirmParsedQuestions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未授权")
		return
	}
	role, _ := c.Get("role")
	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	var req ConfirmParseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误")
		return
	}
	if len(req.ConfirmedQuestions) == 0 {
		utils.BadRequest(c, "confirmedQuestions 至少包含 1 道题")
		return
	}
	examID, ok := parseExamIDParam(c)
	if !ok {
		return
	}
	if examID != req.ExamID {
		utils.BadRequest(c, "路径考试 ID 与请求体 examId 不一致")
		return
	}
	if !ensureExamManageable(c, examID, "权限不足") {
		return
	}

	// 验证考试是否存在
	var examExists int
	database.DB.QueryRow("SELECT COUNT(1) FROM exams WHERE id = ?", req.ExamID).Scan(&examExists)
	if examExists == 0 {
		utils.NotFound(c, "考试不存在")
		return
	}

	// 获取当前题目最大 order_index
	var maxOrder int
	database.DB.QueryRow("SELECT COALESCE(MAX(order_index), 0) FROM exam_questions WHERE exam_id = ?", req.ExamID).Scan(&maxOrder)

	// 批量写入题目
	insertedCount := 0
	successfulQuestions := make([]ParsedQuestion, 0, len(req.ConfirmedQuestions))
	for _, q := range req.ConfirmedQuestions {
		normalized, valid := normalizeParsedQuestion(q, 0)
		if !valid {
			continue
		}

		optionsJSONBytes, err := json.Marshal(normalized.Options)
		if err != nil {
			utils.GetLogger().Warn("序列化题目选项失败", zap.Error(err))
			continue
		}

		_, err = database.DB.Exec(`
			INSERT INTO exam_questions (exam_id, type, stem, options, answer, score, order_index)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, req.ExamID, normalized.Type, normalized.Stem, string(optionsJSONBytes), normalized.Answer, normalized.Score, maxOrder+insertedCount+1)
		if err != nil {
			utils.GetLogger().Warn("批量导入题目失败", zap.String("stem", normalized.Stem), zap.Error(err))
			continue
		}
		insertedCount++
		successfulQuestions = append(successfulQuestions, normalized)
	}
	if insertedCount == 0 {
		utils.BadRequest(c, "没有可导入的有效题目")
		return
	}

	// 记录 AI 修改（PLAN-05）：对比原始与确认版本
	origJSON, _ := json.Marshal(req.OriginalQuestions)
	confirmedJSON, _ := json.Marshal(successfulQuestions)
	diffSummary := buildDiffSummary(req.OriginalQuestions, successfulQuestions, len(req.ConfirmedQuestions)-insertedCount)

	_, err := database.DB.Exec(`
		INSERT INTO ai_corrections (exam_id, user_id, original_json, corrected_json, diff_summary)
		VALUES (?, ?, ?, ?, ?)
	`, req.ExamID, userID, string(origJSON), string(confirmedJSON), diffSummary)
	if err != nil {
		utils.GetLogger().Warn("记录 AI 修改失败", zap.Error(err))
		// 不阻断主流程
	}

	utils.Success(c, gin.H{
		"inserted": insertedCount,
		"total":    len(req.ConfirmedQuestions),
	})
}

func parseExamIDParam(c *gin.Context) (int64, bool) {
	examID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的考试 ID")
		return 0, false
	}
	return examID, true
}

func ensureExamManageable(c *gin.Context, examID int64, message string) bool {
	courseID, err := courseIDFromExamID(examID)
	if err == sql.ErrNoRows {
		utils.NotFound(c, "考试不存在")
		return false
	}
	if err != nil {
		utils.InternalServerError(c, "服务器错误")
		return false
	}
	return ensureCourseInstructorOrAdmin(c, courseID, message)
}

// buildDiffSummary 生成原始与确认版本的差异摘要
func buildDiffSummary(orig, confirmed []ParsedQuestion, skippedCount int) string {
	changes := 0
	for i := range confirmed {
		if i >= len(orig) {
			changes++
			continue
		}
		if orig[i].Stem != confirmed[i].Stem ||
			orig[i].Answer != confirmed[i].Answer ||
			orig[i].Type != confirmed[i].Type {
			changes++
		}
	}
	return fmt.Sprintf("共导入 %d 道题，其中 %d 道被修改，跳过 %d 道", len(confirmed), changes, skippedCount)
}

// GetAICorrections 获取当前用户最近 N 条 AI 修改记录（PLAN-05）
func GetAICorrections(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.Unauthorized(c, "未授权")
		return
	}

	limitStr := c.DefaultQuery("limit", "5")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 50 {
		limit = 5
	}

	rows, err := database.DB.Query(`
		SELECT id, exam_id, original_json, corrected_json, diff_summary, created_at
		FROM ai_corrections
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, userID, limit)
	if err != nil {
		utils.GetLogger().Error("查询 AI 修改记录失败", zap.Error(err))
		utils.InternalServerError(c, "查询失败")
		return
	}
	defer rows.Close()

	type Correction struct {
		ID            int64  `json:"id"`
		ExamID        int64  `json:"examId"`
		OriginalJSON  string `json:"originalJson"`
		CorrectedJSON string `json:"correctedJson"`
		DiffSummary   string `json:"diffSummary"`
		CreatedAt     string `json:"createdAt"`
	}

	corrections := []Correction{}
	for rows.Next() {
		var c Correction
		if err := rows.Scan(&c.ID, &c.ExamID, &c.OriginalJSON, &c.CorrectedJSON, &c.DiffSummary, &c.CreatedAt); err != nil {
			continue
		}
		corrections = append(corrections, c)
	}

	utils.Success(c, corrections)
}

// ----- 本地规则解析核心逻辑 -----

var (
	// 题型段落标题匹配
	reSectionSingle   = regexp.MustCompile(`(?i)单选题`)
	reSectionMultiple = regexp.MustCompile(`(?i)多选题`)
	reSectionTF       = regexp.MustCompile(`(?i)判断题`)
	reSectionShort    = regexp.MustCompile(`(?i)简答题|问答题`)

	// 题目编号行：以数字开头，后跟点/顿号/括号
	reQuestionNum = regexp.MustCompile(`^\s*\d+[\.、．。\)）]\s*`)

	// 选项行：A. / A、 / A） / （A）等
	reOption = regexp.MustCompile(`^[（\(]?([A-Ea-e])[）\)\.][\s、．]*(.+)`)

	// 答案行
	reAnswer = regexp.MustCompile(`(?i)答案[：:]\s*(.+)`)

	// 分值行
	reScore = regexp.MustCompile(`(?i)分值[：:]\s*(\d+\.?\d*)`)
)

// 猜测当前题型（根据上下文section标题）
func detectSectionType(line string) string {
	switch {
	case reSectionMultiple.MatchString(line):
		return "MULTIPLE_CHOICE"
	case reSectionSingle.MatchString(line):
		return "SINGLE_CHOICE"
	case reSectionTF.MatchString(line):
		return "TRUE_FALSE"
	case reSectionShort.MatchString(line):
		return "SHORT_ANSWER"
	}
	return ""
}

// 规范化答案
func normalizeAnswer(raw, qtype string) string {
	raw = strings.TrimSpace(raw)
	upper := strings.ToUpper(raw)

	switch qtype {
	case "TRUE_FALSE":
		if strings.Contains(upper, "正确") || upper == "T" || upper == "TRUE" || upper == "对" || upper == "是" || upper == "√" {
			return "true"
		}
		if strings.Contains(upper, "错误") || upper == "F" || upper == "FALSE" || upper == "错" || upper == "否" || upper == "×" {
			return "false"
		}
		return ""
	case "MULTIPLE_CHOICE":
		seen := map[string]struct{}{}
		letters := []string{}
		for _, ch := range upper {
			if ch >= 'A' && ch <= 'E' {
				letter := string(ch)
				if _, exists := seen[letter]; exists {
					continue
				}
				seen[letter] = struct{}{}
				letters = append(letters, letter)
			}
		}
		sort.Strings(letters)
		return strings.Join(letters, ",")
	case "SINGLE_CHOICE":
		for _, ch := range upper {
			if ch >= 'A' && ch <= 'E' {
				return string(ch)
			}
		}
	}
	return raw
}

// 默认分值
func defaultScore(qtype string) float64 {
	switch qtype {
	case "MULTIPLE_CHOICE":
		return 5
	case "SHORT_ANSWER":
		return 10
	default:
		return 3
	}
}

func normalizeParsedQuestions(questions []ParsedQuestion, defaultConfidence float64) []ParsedQuestion {
	result := make([]ParsedQuestion, 0, len(questions))
	for _, question := range questions {
		normalized, ok := normalizeParsedQuestion(question, defaultConfidence)
		if !ok {
			continue
		}
		result = append(result, normalized)
	}
	return result
}

func normalizeParsedQuestion(question ParsedQuestion, defaultConfidence float64) (ParsedQuestion, bool) {
	normalized := ParsedQuestion{
		Type:       strings.TrimSpace(question.Type),
		Stem:       strings.TrimSpace(question.Stem),
		Answer:     strings.TrimSpace(question.Answer),
		Score:      question.Score,
		Confidence: question.Confidence,
		Issues:     append([]string{}, question.Issues...),
	}

	if normalized.Issues == nil {
		normalized.Issues = []string{}
	}

	if normalized.Stem == "" {
		return ParsedQuestion{}, false
	}

	qtype, changed := normalizeQuestionType(normalized.Type)
	if qtype == "" {
		return ParsedQuestion{}, false
	}
	normalized.Type = qtype
	if changed {
		normalized.Issues = append(normalized.Issues, "题型已归一化")
	}

	normalized.Options = normalizeQuestionOptions(question.Options)
	switch normalized.Type {
	case "SINGLE_CHOICE", "MULTIPLE_CHOICE":
		if len(normalized.Options) < 2 {
			return ParsedQuestion{}, false
		}
	case "TRUE_FALSE", "SHORT_ANSWER":
		normalized.Options = []string{}
	}

	normalized.Answer = normalizeAnswer(normalized.Answer, normalized.Type)
	if !isValidNormalizedAnswer(normalized.Answer, normalized.Type, len(normalized.Options)) {
		return ParsedQuestion{}, false
	}

	if normalized.Score <= 0 {
		normalized.Score = defaultScore(normalized.Type)
		normalized.Issues = append(normalized.Issues, "分值缺失或非法，已使用默认分值")
	}

	if normalized.Confidence <= 0 {
		if defaultConfidence > 0 {
			normalized.Confidence = defaultConfidence
		} else {
			calcConfidence(&normalized)
		}
	} else if normalized.Confidence > 1 {
		normalized.Confidence = 1
		normalized.Issues = append(normalized.Issues, "置信度超出范围，已截断为 1")
	}

	if normalized.Confidence < 0 {
		if defaultConfidence > 0 {
			normalized.Confidence = defaultConfidence
		} else {
			normalized.Confidence = 0
		}
		normalized.Issues = append(normalized.Issues, "置信度低于 0，已修正")
	}

	if normalized.Issues == nil {
		normalized.Issues = []string{}
	}
	return normalized, true
}

func normalizeQuestionType(raw string) (string, bool) {
	normalized := strings.ToUpper(strings.TrimSpace(raw))
	switch normalized {
	case "SINGLE_CHOICE", "SINGLECHOICE", "SINGLE CHOICE", "单选", "单选题":
		return "SINGLE_CHOICE", normalized != "SINGLE_CHOICE"
	case "MULTIPLE_CHOICE", "MULTIPLECHOICE", "MULTIPLE CHOICE", "多选", "多选题":
		return "MULTIPLE_CHOICE", normalized != "MULTIPLE_CHOICE"
	case "TRUE_FALSE", "TRUEFALSE", "TRUE FALSE", "判断", "判断题":
		return "TRUE_FALSE", normalized != "TRUE_FALSE"
	case "SHORT_ANSWER", "SHORTANSWER", "SHORT ANSWER", "简答", "简答题", "问答题":
		return "SHORT_ANSWER", normalized != "SHORT_ANSWER"
	default:
		return "", false
	}
}

func normalizeQuestionOptions(options []string) []string {
	if len(options) == 0 {
		return []string{}
	}
	result := make([]string, 0, len(options))
	for _, option := range options {
		text := strings.TrimSpace(option)
		text = reOption.ReplaceAllString(text, `$2`)
		text = strings.TrimSpace(text)
		if text == "" {
			continue
		}
		result = append(result, text)
	}
	return result
}

func isValidNormalizedAnswer(answer, qtype string, optionCount int) bool {
	switch qtype {
	case "SINGLE_CHOICE":
		return len(answer) == 1 && answer[0] >= 'A' && answer[0] < byte('A'+optionCount)
	case "MULTIPLE_CHOICE":
		if answer == "" {
			return false
		}
		for _, letter := range strings.Split(answer, ",") {
			if len(letter) != 1 || letter[0] < 'A' || letter[0] >= byte('A'+optionCount) {
				return false
			}
		}
		return true
	case "TRUE_FALSE":
		return answer == "true" || answer == "false"
	case "SHORT_ANSWER":
		return strings.TrimSpace(answer) != ""
	default:
		return false
	}
}

func normalizeStoredExamAnswer(raw string) string {
	text := strings.TrimSpace(raw)
	if text == "" {
		return ""
	}

	var decoded string
	if err := json.Unmarshal([]byte(text), &decoded); err == nil {
		return decoded
	}
	return text
}

// parseQuestions 从文本中解析所有题目
func parseQuestions(text string) []ParsedQuestion {
	lines := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n")

	var questions []ParsedQuestion
	currentSection := "SINGLE_CHOICE" // 默认单选

	// 当前题目缓存
	type qBuf struct {
		stem    strings.Builder
		options []string
		answer  string
		score   float64
		qtype   string
		active  bool
	}
	var buf qBuf

	flush := func() {
		if !buf.active {
			return
		}
		stem := strings.TrimSpace(buf.stem.String())
		if stem == "" {
			buf = qBuf{}
			return
		}
		score := buf.score
		if score == 0 {
			score = defaultScore(buf.qtype)
		}
		q := ParsedQuestion{
			Type:   buf.qtype,
			Stem:   stem,
			Answer: normalizeAnswer(buf.answer, buf.qtype),
			Score:  score,
		}
		if len(buf.options) > 0 {
			q.Options = buf.options
		}
		// 计算置信度（PLAN-02）
		calcConfidence(&q)
		questions = append(questions, q)
		buf = qBuf{}
	}

	for _, raw := range lines {
		line := strings.TrimRightFunc(raw, unicode.IsSpace)

		// 空行：不打断题目，继续
		if strings.TrimSpace(line) == "" {
			continue
		}

		// 检查是否是段落标题（===、---、一、二、等）
		if t := detectSectionType(line); t != "" {
			flush()
			currentSection = t
			continue
		}

		// 检查答案行
		if m := reAnswer.FindStringSubmatch(line); m != nil {
			buf.answer = strings.TrimSpace(m[1])
			continue
		}

		// 检查分值行
		if m := reScore.FindStringSubmatch(line); m != nil {
			if v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64); err == nil {
				buf.score = v
			}
			continue
		}

		// 检查选项行
		if m := reOption.FindStringSubmatch(line); m != nil {
			if buf.active {
				buf.options = append(buf.options, strings.TrimSpace(m[2]))
			}
			continue
		}

		// 检查题目编号行（新题开始）
		if reQuestionNum.MatchString(line) {
			flush()
			buf.active = true
			buf.qtype = currentSection
			stem := reQuestionNum.ReplaceAllString(line, "")
			buf.stem.WriteString(strings.TrimSpace(stem))
			continue
		}

		// 其他行：追加到当前题干
		if buf.active {
			buf.stem.WriteString(" ")
			buf.stem.WriteString(strings.TrimSpace(line))
		}
	}

	flush()
	return questions
}

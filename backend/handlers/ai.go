package handlers

import (
	"io"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/utils"
)

// ParsedQuestion 解析出的题目结构
type ParsedQuestion struct {
	Type    string   `json:"type"`
	Stem    string   `json:"stem"`
	Options []string `json:"options,omitempty"`
	Answer  string   `json:"answer"`
	Score   float64  `json:"score"`
}

// ParseQuestionsWithAI 本地规则解析题目文件（无需外部API）
func ParseQuestionsWithAI(c *gin.Context) {
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
	if len(questions) == 0 {
		utils.BadRequest(c, "未能识别任何题目，请检查文件格式")
		return
	}

	utils.Success(c, gin.H{
		"questions": questions,
		"count":     len(questions),
	})
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
		return "false"
	case "MULTIPLE_CHOICE":
		// 把 "AC" / "A C" / "A、C" / "A,C" 统一为 "A,C"
		letters := []string{}
		for _, ch := range upper {
			if ch >= 'A' && ch <= 'E' {
				letters = append(letters, string(ch))
			}
		}
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

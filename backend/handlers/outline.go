package handlers

import (
	"encoding/json"
	"io"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/online-education-platform/backend/database"
	"github.com/online-education-platform/backend/utils"
	"go.uber.org/zap"
)

// ParsedSection 解析出的课时结构
type ParsedSection struct {
	Title      string `json:"title"`
	OrderIndex int    `json:"orderIndex"`
	Type       string `json:"type"` // VIDEO | TEXT
}

// ParsedChapter 解析出的章节结构
type ParsedChapter struct {
	Title      string          `json:"title"`
	OrderIndex int             `json:"orderIndex"`
	Sections   []ParsedSection `json:"sections"`
}

var (
	// 章节标题识别：第X章、Chapter X、一级标题(# xxx)、纯数字开头 "1. " "1、"
	reChapter = regexp.MustCompile(
		`(?i)^(第[一二三四五六七八九十百\d]+[章节讲]|chapter\s*\d+|#\s+|\d+[\.、]\s+)(.+)$`,
	)
	// 课时识别：X.X / 缩进 + 内容 / ## / - / * / ○
	reSection = regexp.MustCompile(
		`(?i)^(\s{2,}|\t+|##\s+|\d+\.\d+[\.\s]|[-*○▶►]\s+)(.+)$`,
	)
	// 视频关键词 → 默认 VIDEO，含"阅读/文档/文字/读"时设为 TEXT
	reTextKeyword = regexp.MustCompile(`(?i)阅读|文档|文字|图文|读|text|doc`)
)

// ParseCourseOutline 优先使用 LLM 解析课程大纲，失败时回退到本地规则解析
func ParseCourseOutline(c *gin.Context) {
	courseID := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if role != "INSTRUCTOR" && role != "ADMIN" {
		utils.Forbidden(c, "权限不足")
		return
	}

	// 验证课程归属
	if role == "INSTRUCTOR" {
		var instructorID int64
		if err := database.DB.QueryRow(`SELECT instructor_id FROM courses WHERE id = ?`, courseID).Scan(&instructorID); err != nil {
			utils.NotFound(c, "课程不存在")
			return
		}
		if instructorID != userID.(int64) {
			utils.Forbidden(c, "权限不足")
			return
		}
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.BadRequest(c, "请上传文件")
		return
	}
	defer file.Close()

	if header.Size > 2*1024*1024 {
		utils.BadRequest(c, "文件大小不能超过 2MB")
		return
	}
	fname := strings.ToLower(header.Filename)
	if !strings.HasSuffix(fname, ".txt") && !strings.HasSuffix(fname, ".md") {
		utils.BadRequest(c, "仅支持 .txt / .md 格式")
		return
	}

	content, err := io.ReadAll(file)
	if err != nil {
		utils.InternalServerError(c, "读取文件失败")
		return
	}
	if strings.TrimSpace(string(content)) == "" {
		utils.BadRequest(c, "文件内容为空")
		return
	}

	text := string(content)
	chapters, llmErr := parseOutlineWithLLM(c, text)
	parseMode := "llm"
	fallbackReason := ""
	if llmErr != nil {
		utils.GetLogger().Warn("LLM 大纲解析失败，回退到规则解析", zap.Error(llmErr))
		fallbackReason = llmFallbackReason(llmErr)
		chapters = parseOutline(text)
		parseMode = "rule_fallback"
	}
	if len(chapters) == 0 {
		utils.BadRequest(c, "未能识别任何章节，请检查文件格式")
		return
	}

	response := gin.H{
		"chapters":     chapters,
		"chapterCount": len(chapters),
		"parseMode":    parseMode,
		"sectionCount": func() int {
			total := 0
			for _, ch := range chapters {
				total += len(ch.Sections)
			}
			return total
		}(),
	}
	if parseMode == "rule_fallback" && fallbackReason != "" {
		response["fallbackReason"] = fallbackReason
	}
	utils.Success(c, response)
}

func parseOutlineWithLLM(c *gin.Context, text string) ([]ParsedChapter, error) {
	systemPrompt := `你是在线教育平台 CourseArk 的课程大纲结构化助手。
请把用户提供的课程大纲解析为严格 JSON。只输出 JSON，不要输出 Markdown、解释或代码块。
JSON 格式必须为：
{
  "chapters": [
    {
      "title": "章节标题",
      "orderIndex": 1,
      "sections": [
        {"title": "课时标题", "orderIndex": 1, "type": "VIDEO"}
      ]
    }
  ]
}
要求：
1. chapters 至少 1 项，title 不得为空。
2. sections 可以为空；如能识别课时则填入。
3. type 只能是 VIDEO 或 TEXT。含阅读、文档、文字、图文、text、doc 的课时用 TEXT，其余默认 VIDEO。
4. orderIndex 从 1 开始连续编号。`
	userPrompt := "请解析以下课程大纲：\n\n" + text

	raw, err := completeWithConfiguredLLM(c, systemPrompt, userPrompt)
	if err != nil {
		return nil, err
	}
	jsonText, err := extractJSONObject(raw)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Chapters []ParsedChapter `json:"chapters"`
	}
	if err := json.Unmarshal([]byte(jsonText), &payload); err != nil {
		return nil, newLLMFallbackError(llmFallbackReasonJSONUnmarshalFailed, err)
	}
	return normalizeParsedChapters(payload.Chapters)
}

func normalizeParsedChapters(chapters []ParsedChapter) ([]ParsedChapter, error) {
	result := make([]ParsedChapter, 0, len(chapters))
	for _, chapter := range chapters {
		chapter.Title = strings.TrimSpace(chapter.Title)
		if chapter.Title == "" {
			continue
		}

		sections := make([]ParsedSection, 0, len(chapter.Sections))
		for _, section := range chapter.Sections {
			section.Title = strings.TrimSpace(section.Title)
			if section.Title == "" {
				continue
			}
			section.Type = strings.ToUpper(strings.TrimSpace(section.Type))
			if section.Type != "TEXT" && section.Type != "VIDEO" {
				if reTextKeyword.MatchString(section.Title) {
					section.Type = "TEXT"
				} else {
					section.Type = "VIDEO"
				}
			}
			section.OrderIndex = len(sections) + 1
			sections = append(sections, section)
		}

		chapter.OrderIndex = len(result) + 1
		chapter.Sections = sections
		result = append(result, chapter)
	}
	if len(result) == 0 {
		return nil, newLLMFallbackError(llmFallbackReasonValidationFailed)
	}
	return result, nil
}

// parseOutline 从文本解析章节与课时
func parseOutline(text string) []ParsedChapter {
	lines := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n")

	var chapters []ParsedChapter
	chapterIdx := 0

	for _, raw := range lines {
		line := strings.TrimRightFunc(raw, unicode.IsSpace)
		if strings.TrimSpace(line) == "" {
			continue
		}

		// 尝试匹配章节
		if m := reChapter.FindStringSubmatch(line); m != nil {
			title := strings.TrimSpace(m[2])
			if title == "" {
				continue
			}
			chapterIdx++
			chapters = append(chapters, ParsedChapter{
				Title:      title,
				OrderIndex: chapterIdx,
				Sections:   []ParsedSection{},
			})
			continue
		}

		// 尝试匹配课时（归属到最后一个章节）
		if m := reSection.FindStringSubmatch(line); m != nil && len(chapters) > 0 {
			title := strings.TrimSpace(m[2])
			if title == "" {
				continue
			}
			sType := "VIDEO"
			if reTextKeyword.MatchString(title) {
				sType = "TEXT"
			}
			last := &chapters[len(chapters)-1]
			last.Sections = append(last.Sections, ParsedSection{
				Title:      title,
				OrderIndex: len(last.Sections) + 1,
				Type:       sType,
			})
			continue
		}

		// 既不像章节也不像课时，但有内容 → 作为章节处理（防止漏识别）
		if len(strings.TrimSpace(line)) > 2 && len(chapters) == 0 {
			chapterIdx++
			chapters = append(chapters, ParsedChapter{
				Title:      strings.TrimSpace(line),
				OrderIndex: chapterIdx,
				Sections:   []ParsedSection{},
			})
		}
	}

	// 过滤掉空标题的章节
	result := make([]ParsedChapter, 0, len(chapters))
	for _, ch := range chapters {
		if strings.TrimSpace(ch.Title) != "" {
			result = append(result, ch)
		}
	}

	// 修正 orderIndex 为连续
	for i := range result {
		result[i].OrderIndex = i + 1
		for j := range result[i].Sections {
			result[i].Sections[j].OrderIndex = j + 1
		}
	}

	return result
}

// stripLeadingNum 移除章节前缀（"第一章 " / "1. " 等），提取纯标题
// 供调试用，目前通过 regex 分组直接提取
func stripLeadingNum(s string) string {
	re := regexp.MustCompile(`^\d+[\.\s]+`)
	return strings.TrimSpace(re.ReplaceAllString(s, ""))
}

var _ = strconv.Itoa // 避免 import 未使用

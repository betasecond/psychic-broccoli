package rag

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const defaultGenBaseURL = "https://openrouter.ai/api/v1"
const defaultGenModel = "google/gemini-2.5-flash"
const defaultGenMaxTokens = 2048
const defaultGenTimeout = 45 * time.Second

var ErrGenerationTimeout = errors.New("generation timeout")

const systemPrompt = `你是在线教育平台中的课程学习助手。
请严格只依据提供的课程资料片段回答问题，不要编造资料中没有的信息。
如果当前资料不足以支持回答，请明确回复：“当前课程资料中未找到足够依据来回答这个问题。”
回答风格要简洁、清晰，适合教学和复习场景。
不要输出“好的”“根据资料”等寒暄或过程说明，直接给出答案正文。
当用户要求整理、改写、生成 Markdown、生成大纲或清单时，输出可直接使用的 Markdown 成品：使用清晰标题、列表或表格，不要用代码块包裹，不要只复述原文。`

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GenClient struct {
	APIKey     string
	BaseURL    string
	Model      string
	HTTPClient *http.Client
}

type chatRequest struct {
	Model     string        `json:"model"`
	Messages  []ChatMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *GenClient) GenerateWithHistory(question string, contexts []string, history []ChatMessage) (string, error) {
	messages := []ChatMessage{{Role: "system", Content: systemPrompt}}
	messages = append(messages, history...)
	messages = append(messages, ChatMessage{Role: "user", Content: buildUserPrompt(question, contexts)})
	return c.generate(messages)
}

func (c *GenClient) Generate(question string, contexts []string) (string, error) {
	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: buildUserPrompt(question, contexts)},
	}
	return c.generate(messages)
}

func (c *GenClient) Complete(system, user string) (string, error) {
	messages := []ChatMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	}
	return c.generate(messages)
}

func buildUserPrompt(question string, contexts []string) string {
	var builder strings.Builder
	builder.WriteString("[课程资料]\n")
	for i, context := range contexts {
		builder.WriteString(fmt.Sprintf("[%d] %s\n\n", i+1, context))
	}
	builder.WriteString("[学生问题]\n")
	builder.WriteString(question)
	return builder.String()
}

func (c *GenClient) generate(messages []ChatMessage) (string, error) {
	if strings.TrimSpace(c.APIKey) == "" {
		return "", fmt.Errorf("missing OPENAI_API_KEY")
	}

	base := strings.TrimRight(strings.TrimSpace(c.BaseURL), "/")
	if base == "" {
		base = defaultGenBaseURL
	}
	model := strings.TrimSpace(c.Model)
	if model == "" {
		model = defaultGenModel
	}

	body, err := json.Marshal(chatRequest{
		Model:     model,
		Messages:  messages,
		MaxTokens: defaultGenMaxTokens,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(http.MethodPost, base+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("HTTP-Referer", "https://github.com/betasecond/psychic-broccoli")
	req.Header.Set("X-Title", "CourseArk")

	resp, err := c.httpClient().Do(req)
	if err != nil {
		if isTimeoutError(err) {
			return "", fmt.Errorf("%w: generation API request failed", ErrGenerationTimeout)
		}
		return "", fmt.Errorf("generation API request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var res chatResponse
	if err := json.Unmarshal(raw, &res); err != nil {
		return "", fmt.Errorf("generation API response parse failed: %w", err)
	}
	if res.Error != nil {
		return "", fmt.Errorf("generation API error: %s", res.Error.Message)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return "", fmt.Errorf("generation API returned status %d", resp.StatusCode)
	}
	if len(res.Choices) == 0 {
		return "", fmt.Errorf("generation API returned empty choices")
	}

	return strings.TrimSpace(res.Choices[0].Message.Content), nil
}

func isTimeoutError(err error) bool {
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	msg := strings.ToLower(err.Error())
	return errors.Is(err, http.ErrHandlerTimeout) ||
		strings.Contains(msg, "timeout") ||
		strings.Contains(msg, "deadline exceeded")
}

func (c *GenClient) httpClient() *http.Client {
	if c.HTTPClient != nil {
		return c.HTTPClient
	}
	return &http.Client{Timeout: generationTimeout()}
}

func generationTimeout() time.Duration {
	for _, key := range []string{"LLM_TIMEOUT_SECONDS", "RAG_GENERATION_TIMEOUT_SECONDS"} {
		raw := strings.TrimSpace(os.Getenv(key))
		if raw == "" {
			continue
		}
		seconds, err := strconv.Atoi(raw)
		if err == nil && seconds > 0 {
			return time.Duration(seconds) * time.Second
		}
	}
	return defaultGenTimeout
}

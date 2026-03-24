package rag

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const defaultGenBaseURL = "https://openrouter.ai/api/v1"
const defaultGenModel = "google/gemini-2.5-flash-preview"

// GenClient 调用 OpenRouter Chat Completion API 生成答案
type GenClient struct {
	APIKey  string
	BaseURL string // 默认 https://openrouter.ai/api/v1
	Model   string // 默认 google/gemini-2.5-flash-preview，可通过 LLM_MODEL 环境变量覆盖
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

const systemPrompt = `你是课程助教，请严格根据下方提供的参考资料和历史对话语境回答学生问题。
如果参考资料中没有足够信息，直接说"根据现有资料无法回答该问题"，不要编造内容。`

// GenerateWithHistory 带历史对话记录的生成
func (c *GenClient) GenerateWithHistory(question string, contexts []string, history []chatMessage) (string, error) {
	base := c.BaseURL
	if base == "" {
		base = defaultGenBaseURL
	}

	var sb strings.Builder
	sb.WriteString("【参考资料】\n")
	for i, ctx := range contexts {
		fmt.Fprintf(&sb, "[%d] %s\n\n", i+1, ctx)
	}

	messages := []chatMessage{
		{Role: "system", Content: systemPrompt},
	}
	// 加入历史记录
	messages = append(messages, history...)
	// 加入当前问题和资料
	messages = append(messages, chatMessage{Role: "user", Content: sb.String() + "\n【当前问题】\n" + question})

	model := c.Model
	if model == "" {
		model = defaultGenModel
	}

	body, err := json.Marshal(chatRequest{
		Model:    model,
		Messages: messages,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(http.MethodPost, base+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer " + c.APIKey)

	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()

	var res chatResponse
	json.NewDecoder(resp.Body).Decode(&res)
	
	if len(res.Choices) == 0 {
		return "", fmt.Errorf("生成失败")
	}
	return res.Choices[0].Message.Content, nil
}

// Generate 根据 question 和检索到的 contexts 生成答案
func (c *GenClient) Generate(question string, contexts []string) (string, error) {
	base := c.BaseURL
	if base == "" {
		base = defaultGenBaseURL
	}
	model := c.Model
	if model == "" {
		model = defaultGenModel
	}

	var sb strings.Builder
	sb.WriteString("【参考资料】\n")
	for i, ctx := range contexts {
		fmt.Fprintf(&sb, "[%d] %s\n\n", i+1, ctx)
	}
	sb.WriteString("【学生问题】\n")
	sb.WriteString(question)

	body, err := json.Marshal(chatRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: sb.String()},
		},
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

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("生成 API 请求失败: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var res chatResponse
	if err := json.Unmarshal(raw, &res); err != nil {
		return "", fmt.Errorf("生成 API 响应解析失败: %w", err)
	}
	if res.Error != nil {
		return "", fmt.Errorf("生成 API 错误: %s", res.Error.Message)
	}
	if len(res.Choices) == 0 {
		return "", fmt.Errorf("生成 API 返回空 choices")
	}
	return res.Choices[0].Message.Content, nil
}

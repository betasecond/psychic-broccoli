package rag

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const defaultGenBaseURL = "https://api.openai.com/v1"
const genModel = "gpt-4o-mini"

// GenClient 调用 OpenAI Chat Completion API 生成答案
type GenClient struct {
	APIKey  string
	BaseURL string // 默认 https://api.openai.com/v1，可指向国内代理
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

const systemPrompt = `你是课程助教，请严格根据下方提供的参考资料回答学生问题。
如果参考资料中没有足够信息，直接说"根据现有资料无法回答该问题"，不要编造内容。`

// Generate 根据 question 和检索到的 contexts 生成答案
func (c *GenClient) Generate(question string, contexts []string) (string, error) {
	base := c.BaseURL
	if base == "" {
		base = defaultGenBaseURL
	}

	var sb strings.Builder
	sb.WriteString("【参考资料】\n")
	for i, ctx := range contexts {
		fmt.Fprintf(&sb, "[%d] %s\n\n", i+1, ctx)
	}
	sb.WriteString("【学生问题】\n")
	sb.WriteString(question)

	body, err := json.Marshal(chatRequest{
		Model: genModel,
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

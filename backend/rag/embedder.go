package rag

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const defaultEmbedBaseURL = "https://api.openai.com/v1"
const embedModel = "text-embedding-3-small"

// EmbedClient 调用 OpenAI Embedding API
type EmbedClient struct {
	APIKey  string
	BaseURL string // 默认 https://api.openai.com/v1，可指向国内代理
}

type embedRequest struct {
	Input []string `json:"input"`
	Model string   `json:"model"`
}

type embedResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Embed 批量对 texts 做向量化，返回与 texts 等长的 embedding 切片。
// OpenAI text-embedding-3-small 维度 1536。
func (c *EmbedClient) Embed(texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}
	base := c.BaseURL
	if base == "" {
		base = defaultEmbedBaseURL
	}

	body, err := json.Marshal(embedRequest{
		Input: texts,
		Model: embedModel,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, base+"/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("embedding API 请求失败: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var res embedResponse
	if err := json.Unmarshal(raw, &res); err != nil {
		return nil, fmt.Errorf("embedding API 响应解析失败: %w", err)
	}
	if res.Error != nil {
		return nil, fmt.Errorf("embedding API 错误: %s", res.Error.Message)
	}

	// 按 index 排序还原顺序
	result := make([][]float32, len(texts))
	for _, d := range res.Data {
		if d.Index < len(result) {
			result[d.Index] = d.Embedding
		}
	}
	return result, nil
}

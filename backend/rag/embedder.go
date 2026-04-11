package rag

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "strings"
)

const defaultEmbedBaseURL = "https://openrouter.ai/api/v1"
const defaultEmbedModel = "openai/text-embedding-3-small"

type EmbedClient struct {
    APIKey  string
    BaseURL string
    Model   string
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

func (c *EmbedClient) Embed(texts []string) ([][]float32, error) {
    if len(texts) == 0 {
        return nil, nil
    }
    if strings.TrimSpace(c.APIKey) == "" {
        return nil, fmt.Errorf("missing OPENAI_API_KEY")
    }

    base := strings.TrimRight(strings.TrimSpace(c.BaseURL), "/")
    if base == "" {
        base = defaultEmbedBaseURL
    }
    model := strings.TrimSpace(c.Model)
    if model == "" {
        model = defaultEmbedModel
    }

    body, err := json.Marshal(embedRequest{Input: texts, Model: model})
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest(http.MethodPost, base+"/embeddings", bytes.NewReader(body))
    if err != nil {
        return nil, err
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.APIKey)
    req.Header.Set("HTTP-Referer", "https://github.com/betasecond/psychic-broccoli")
    req.Header.Set("X-Title", "CourseArk")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("embedding API request failed: %w", err)
    }
    defer resp.Body.Close()

    raw, _ := io.ReadAll(resp.Body)
    var res embedResponse
    if err := json.Unmarshal(raw, &res); err != nil {
        return nil, fmt.Errorf("embedding API response parse failed: %w", err)
    }
    if res.Error != nil {
        return nil, fmt.Errorf("embedding API error: %s", res.Error.Message)
    }
    if resp.StatusCode >= http.StatusBadRequest {
        return nil, fmt.Errorf("embedding API returned status %d", resp.StatusCode)
    }

    result := make([][]float32, len(texts))
    for _, item := range res.Data {
        if item.Index >= 0 && item.Index < len(result) {
            result[item.Index] = item.Embedding
        }
    }
    return result, nil
}

package handlers

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	ragpkg "github.com/online-education-platform/backend/rag"
)

const (
	llmFallbackReasonMissingKey          = "missing_key"
	llmFallbackReasonRequestFailed       = "request_failed"
	llmFallbackReasonTimeout             = "timeout"
	llmFallbackReasonBadStatus           = "bad_status"
	llmFallbackReasonEmptyResponse       = "empty_response"
	llmFallbackReasonJSONNotFound        = "json_not_found"
	llmFallbackReasonJSONUnmarshalFailed = "json_unmarshal_failed"
	llmFallbackReasonValidationFailed    = "validation_failed"
	llmFallbackReasonRuleParseFailed     = "rule_parse_failed"
)

type llmFallbackError struct {
	reason string
	cause  error
}

func (e *llmFallbackError) Error() string {
	if e.cause != nil {
		return e.reason + ": " + e.cause.Error()
	}
	return e.reason
}

func (e *llmFallbackError) Reason() string {
	return e.reason
}

func (e *llmFallbackError) Unwrap() error {
	return e.cause
}

func newLLMFallbackError(reason string, cause ...error) error {
	var err error
	if len(cause) > 0 {
		err = cause[0]
	}
	return &llmFallbackError{reason: reason, cause: err}
}

func llmFallbackReason(err error) string {
	var fallbackErr *llmFallbackError
	if errors.As(err, &fallbackErr) {
		return fallbackErr.reason
	}
	return ""
}

func completeWithConfiguredLLM(c *gin.Context, systemPrompt, userPrompt string) (string, error) {
	cfg, err := getRAGConfig(c)
	if err != nil {
		return "", newLLMFallbackError(llmFallbackReasonMissingKey, err)
	}
	client := &ragpkg.GenClient{
		APIKey:  cfg.APIKey,
		BaseURL: cfg.BaseURL,
		Model:   cfg.LLMModel,
	}
	raw, err := client.Complete(systemPrompt, userPrompt)
	if err != nil {
		return "", mapLLMRequestError(err)
	}
	if strings.TrimSpace(raw) == "" {
		return "", newLLMFallbackError(llmFallbackReasonEmptyResponse)
	}
	return raw, nil
}

func extractJSONObject(raw string) (string, error) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return "", newLLMFallbackError(llmFallbackReasonJSONNotFound)
	}

	if fencedJSON, ok := extractMarkdownJSONBlock(text); ok {
		return fencedJSON, nil
	}

	if fullJSON, ok := sliceJSONObject(text); ok {
		return fullJSON, nil
	}

	return "", newLLMFallbackError(llmFallbackReasonJSONNotFound)
}

func extractMarkdownJSONBlock(text string) (string, bool) {
	lowerText := strings.ToLower(text)
	searchFrom := 0
	for {
		relativeStart := strings.Index(lowerText[searchFrom:], "```json")
		if relativeStart < 0 {
			return "", false
		}

		blockStart := searchFrom + relativeStart
		contentStart := blockStart + len("```json")
		relativeEnd := strings.Index(text[contentStart:], "```")
		if relativeEnd < 0 {
			return "", false
		}

		blockContent := strings.TrimSpace(text[contentStart : contentStart+relativeEnd])
		if jsonText, ok := sliceJSONObject(blockContent); ok {
			return jsonText, true
		}

		searchFrom = contentStart + relativeEnd + len("```")
		if searchFrom >= len(text) {
			return "", false
		}
	}
}

func sliceJSONObject(text string) (string, bool) {
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start < 0 || end < 0 || end <= start {
		return "", false
	}
	return text[start : end+1], true
}

func mapLLMRequestError(err error) error {
	if reason := llmFallbackReason(err); reason != "" {
		return err
	}
	if errors.Is(err, ragpkg.ErrGenerationTimeout) {
		return newLLMFallbackError(llmFallbackReasonTimeout, err)
	}

	message := strings.ToLower(err.Error())
	switch {
	case strings.Contains(message, "missing openai_api_key"),
		strings.Contains(message, "缺少 rag api key"):
		return newLLMFallbackError(llmFallbackReasonMissingKey, err)
	case strings.Contains(message, "returned status"):
		return newLLMFallbackError(llmFallbackReasonBadStatus, err)
	case strings.Contains(message, "empty choices"),
		strings.Contains(message, "empty response"):
		return newLLMFallbackError(llmFallbackReasonEmptyResponse, err)
	default:
		return newLLMFallbackError(llmFallbackReasonRequestFailed, err)
	}
}

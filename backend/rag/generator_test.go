package rag

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGenClientCompleteReturnsTimeoutError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := &GenClient{
		APIKey:     "test-key",
		BaseURL:    server.URL,
		Model:      "test-model",
		HTTPClient: &http.Client{Timeout: 10 * time.Millisecond},
	}

	_, err := client.Complete("system", "user")
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
	if !errors.Is(err, ErrGenerationTimeout) {
		t.Fatalf("expected ErrGenerationTimeout, got %v", err)
	}
}

package handlers

import "testing"

func TestExtractJSONObjectFromMarkdownJSONBlock(t *testing.T) {
	raw := "这里是说明\n```json\n{\n  \"chapters\": []\n}\n```\n后续说明"

	got, err := extractJSONObject(raw)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	want := "{\n  \"chapters\": []\n}"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestExtractJSONObjectFromWrappedText(t *testing.T) {
	raw := "结果如下：{\"chapters\":[{\"title\":\"第一章\"}]} 请查收"

	got, err := extractJSONObject(raw)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	want := "{\"chapters\":[{\"title\":\"第一章\"}]}"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestExtractJSONObjectReturnsReasonWhenJSONMissing(t *testing.T) {
	_, err := extractJSONObject("这是普通说明，不含 JSON。")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if reason := llmFallbackReason(err); reason != llmFallbackReasonJSONNotFound {
		t.Fatalf("expected reason %q, got %q", llmFallbackReasonJSONNotFound, reason)
	}
}

func TestExtractJSONObjectDoesNotPrevalidateMalformedJSON(t *testing.T) {
	raw := "```json\n{\"chapters\": [}\n```"

	got, err := extractJSONObject(raw)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	want := "{\"chapters\": [}"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

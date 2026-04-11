package rag

import "strings"

func ChunkText(text string, size, overlap int) []string {
    text = strings.TrimSpace(text)
    if text == "" {
        return nil
    }
    if size <= 0 {
        size = 600
    }
    if overlap < 0 {
        overlap = 0
    }

    runes := []rune(text)
    if len(runes) <= size {
        return []string{text}
    }

    chunks := make([]string, 0)
    start := 0
    for start < len(runes) {
        end := start + size
        if end >= len(runes) {
            chunks = append(chunks, strings.TrimSpace(string(runes[start:])))
            break
        }

        cut := end
        for i := end; i < len(runes) && i < end+100; i++ {
            switch runes[i] {
            case '。', '！', '？', '.', '!', '?', '\n':
                cut = i + 1
                i = len(runes)
            }
        }

        chunk := strings.TrimSpace(string(runes[start:cut]))
        if chunk != "" {
            chunks = append(chunks, chunk)
        }

        next := cut - overlap
        if next <= start {
            next = start + 1
        }
        start = next
    }

    return chunks
}

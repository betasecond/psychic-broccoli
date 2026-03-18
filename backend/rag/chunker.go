package rag

import "strings"

// ChunkText 将长文本切块，size 为每块目标字数，overlap 为相邻块重叠字数。
// 在句末（。！？\n）切分，避免截断句子。
func ChunkText(text string, size, overlap int) []string {
	text = strings.TrimSpace(text)
	if len([]rune(text)) <= size {
		if text == "" {
			return nil
		}
		return []string{text}
	}

	runes := []rune(text)
	total := len(runes)
	var chunks []string

	start := 0
	for start < total {
		end := start + size
		if end >= total {
			chunks = append(chunks, string(runes[start:]))
			break
		}

		// 向后寻找最近的句末标点（最多再看 100 字）
		cut := end
		for i := end; i < end+100 && i < total; i++ {
			r := runes[i]
			if r == '。' || r == '！' || r == '？' || r == '…' || r == '\n' {
				cut = i + 1
				break
			}
		}

		chunks = append(chunks, string(runes[start:cut]))
		// 下一块从 cut-overlap 处开始，保证重叠
		next := cut - overlap
		if next <= start {
			next = start + 1 // 防止死循环
		}
		start = next
	}
	return chunks
}

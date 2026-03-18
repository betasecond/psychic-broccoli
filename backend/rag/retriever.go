package rag

import (
	"math"
	"sort"
)

// Chunk 表示一个已向量化的文本块
type Chunk struct {
	ID        int64
	DocID     int64
	Content   string
	Embedding []float32
}

// CosineSimilarity 计算两个向量的余弦相似度，返回 [-1, 1]
func CosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}
	denom := math.Sqrt(normA) * math.Sqrt(normB)
	if denom == 0 {
		return 0
	}
	return float32(dot / denom)
}

// TopK 从 chunks 中找出与 query 最相似的前 k 个，按相似度降序返回
func TopK(query []float32, chunks []Chunk, k int) []Chunk {
	type scored struct {
		chunk Chunk
		score float32
	}
	scored_chunks := make([]scored, 0, len(chunks))
	for _, c := range chunks {
		if len(c.Embedding) == 0 {
			continue
		}
		scored_chunks = append(scored_chunks, scored{
			chunk: c,
			score: CosineSimilarity(query, c.Embedding),
		})
	}
	sort.Slice(scored_chunks, func(i, j int) bool {
		return scored_chunks[i].score > scored_chunks[j].score
	})
	if k > len(scored_chunks) {
		k = len(scored_chunks)
	}
	result := make([]Chunk, k)
	for i := range result {
		result[i] = scored_chunks[i].chunk
	}
	return result
}

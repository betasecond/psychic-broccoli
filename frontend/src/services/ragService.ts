import api from './api'

export interface RagDocument {
  id: number
  filename: string
  char_count: number
  chunk_count: number
  created_at: string
  created_by: string
}

export interface RagQueryResult {
  answer: string
  sources: string[]
}

export interface RagQueryHistory {
  id: number
  user_id: number
  question: string
  answer: string
  created_at: string
}

const ragService = {
  // 教师上传文档
  uploadDocument(courseId: number, file: File): Promise<RagDocument> {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/courses/${courseId}/rag/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // 列出课程知识库文档
  listDocuments(courseId: number): Promise<RagDocument[]> {
    return api.get(`/courses/${courseId}/rag/documents`)
  },

  // 删除文档
  deleteDocument(courseId: number, docId: number): Promise<void> {
    return api.delete(`/courses/${courseId}/rag/documents/${docId}`)
  },

  // 提问
  query(courseId: number, question: string): Promise<RagQueryResult> {
    return api.post(`/courses/${courseId}/rag/query`, { question })
  },

  // 查询历史
  getHistory(courseId: number): Promise<RagQueryHistory[]> {
    return api.get(`/courses/${courseId}/rag/queries`)
  },
}

export default ragService

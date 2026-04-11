import api from './api'

export interface RagDocument {
  id: number
  filename: string
  char_count: number
  chunk_count: number
  created_at?: string
  created_by?: string
}

export interface RagSource {
  chunkId: number
  documentId: number
  filename: string
  chunkIndex: number
  content: string
}

export interface RagQueryResult {
  answer: string
  sources: RagSource[]
  session_id?: string
}

export interface RagQueryHistory {
  id: number
  user_id: number
  session_id?: string
  question: string
  answer: string
  sources: RagSource[]
  created_at: string
}

const ragService = {
  uploadDocument(courseId: number, file: File): Promise<RagDocument> {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/courses/${courseId}/rag/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  listDocuments(courseId: number): Promise<RagDocument[]> {
    return api.get(`/courses/${courseId}/rag/documents`)
  },

  deleteDocument(courseId: number, docId: number): Promise<void> {
    return api.delete(`/courses/${courseId}/rag/documents/${docId}`)
  },

  query(courseId: number, question: string, sessionId?: string): Promise<RagQueryResult> {
    return api.post(`/courses/${courseId}/rag/query`, {
      question,
      session_id: sessionId,
    })
  },

  getHistory(courseId: number): Promise<RagQueryHistory[]> {
    return api.get(`/courses/${courseId}/rag/queries`)
  },
}

export default ragService

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

export type RagProvider = 'dashscope' | 'openrouter'

const RAG_API_KEY_STORAGE = 'courseark.rag.apiKey'
const RAG_PROVIDER_STORAGE = 'courseark.rag.provider'

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && !!window.sessionStorage

export const ragCredentialStore = {
  get(): { apiKey: string; provider: RagProvider } {
    if (!canUseSessionStorage()) {
      return { apiKey: '', provider: 'dashscope' }
    }
    const provider = window.sessionStorage.getItem(
      RAG_PROVIDER_STORAGE
    ) as RagProvider | null
    return {
      apiKey: window.sessionStorage.getItem(RAG_API_KEY_STORAGE) || '',
      provider: provider === 'openrouter' ? 'openrouter' : 'dashscope',
    }
  },

  set(apiKey: string, provider: RagProvider) {
    if (!canUseSessionStorage()) return
    window.sessionStorage.setItem(RAG_API_KEY_STORAGE, apiKey.trim())
    window.sessionStorage.setItem(RAG_PROVIDER_STORAGE, provider)
  },

  clear() {
    if (!canUseSessionStorage()) return
    window.sessionStorage.removeItem(RAG_API_KEY_STORAGE)
    window.sessionStorage.removeItem(RAG_PROVIDER_STORAGE)
  },
}

const ragCredentialHeaders = () => {
  const { apiKey, provider } = ragCredentialStore.get()
  if (!apiKey) return {}
  return {
    'X-RAG-API-Key': apiKey,
    'X-RAG-Provider': provider,
  }
}

const ragService = {
  uploadDocument(courseId: number, file: File): Promise<RagDocument> {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/courses/${courseId}/rag/documents`, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...ragCredentialHeaders(),
      },
    })
  },

  listDocuments(courseId: number): Promise<RagDocument[]> {
    return api.get(`/courses/${courseId}/rag/documents`)
  },

  deleteDocument(courseId: number, docId: number): Promise<void> {
    return api.delete(`/courses/${courseId}/rag/documents/${docId}`)
  },

  query(
    courseId: number,
    question: string,
    sessionId?: string
  ): Promise<RagQueryResult> {
    return api.post(
      `/courses/${courseId}/rag/query`,
      {
        question,
        session_id: sessionId,
      },
      {
        headers: ragCredentialHeaders(),
      }
    )
  },

  getHistory(courseId: number): Promise<RagQueryHistory[]> {
    return api.get(`/courses/${courseId}/rag/queries`)
  },
}

export default ragService

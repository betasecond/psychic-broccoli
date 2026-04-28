import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examService, type ConfirmParsedQuestionsRequest } from '../examService'
import api from '../api'

vi.mock('../api')
const mockedApi = vi.mocked(api)

describe('examService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sessionStorage.getItem).mockReset()
  })

  describe('parseQuestionsFromFile', () => {
    it('includes temporary rag headers when session credentials exist', async () => {
      mockedApi.post.mockResolvedValue({
        questions: [],
        count: 0,
        parseMode: 'llm',
      } as any)

      vi.mocked(sessionStorage.getItem).mockImplementation((key: string) => {
        if (key === 'courseark.rag.apiKey') return 'temp-key'
        if (key === 'courseark.rag.provider') return 'openrouter'
        return null
      })

      const file = new File(['questions'], 'questions.txt', { type: 'text/plain' })
      await examService.parseQuestionsFromFile(7, file)

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/exams/7/parse-questions',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-RAG-API-Key': 'temp-key',
            'X-RAG-Provider': 'openrouter',
          },
        }
      )
    })

    it('does not send empty rag headers when no temporary key exists', async () => {
      mockedApi.post.mockResolvedValue({
        questions: [],
        count: 0,
        parseMode: 'rule_fallback',
      } as any)

      vi.mocked(sessionStorage.getItem).mockReturnValue(null)

      const file = new File(['questions'], 'questions.txt', { type: 'text/plain' })
      await examService.parseQuestionsFromFile(9, file)

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/exams/9/parse-questions',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
    })
  })

  describe('confirmParsedQuestions', () => {
    it('posts parsed question confirmation to the batch confirm endpoint', async () => {
      mockedApi.post.mockResolvedValue({
        inserted: 2,
        total: 3,
      } as any)

      const payload: ConfirmParsedQuestionsRequest = {
        examId: 11,
        originalQuestions: [
          {
            type: 'SINGLE_CHOICE',
            stem: '原始题目',
            options: ['A', 'B'],
            answer: 'A',
            score: 3,
            confidence: 0.8,
            issues: [],
          },
        ],
        confirmedQuestions: [
          {
            type: 'SINGLE_CHOICE',
            stem: '确认题目',
            options: ['A', 'B'],
            answer: 'A',
            score: 3,
            confidence: 0.8,
            issues: [],
          },
        ],
      }

      await examService.confirmParsedQuestions(11, payload)

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/exams/11/questions/confirm',
        payload
      )
    })
  })
})

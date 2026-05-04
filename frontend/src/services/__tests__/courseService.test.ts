import { beforeEach, describe, expect, it, vi } from 'vitest'
import { courseService } from '../courseService'
import api from '../api'

vi.mock('../api')
const mockedApi = vi.mocked(api)

describe('courseService.parseOutline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sessionStorage.getItem).mockReset()
  })

  it('includes temporary rag headers when session credentials exist', async () => {
    mockedApi.post.mockResolvedValue({
      chapters: [],
      chapterCount: 0,
      sectionCount: 0,
      parseMode: 'llm',
    } as any)

    vi.mocked(sessionStorage.getItem).mockImplementation((key: string) => {
      if (key === 'courseark.rag.apiKey') return 'temp-key'
      if (key === 'courseark.rag.provider') return 'openrouter'
      return null
    })

    const file = new File(['outline'], 'outline.txt', { type: 'text/plain' })
    await courseService.parseOutline(12, file)

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/courses/12/parse-outline',
      expect.any(FormData),
      {
        timeout: 60000,
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
      chapters: [],
      chapterCount: 0,
      sectionCount: 0,
      parseMode: 'rule_fallback',
    } as any)

    vi.mocked(sessionStorage.getItem).mockReturnValue(null)

    const file = new File(['outline'], 'outline.txt', { type: 'text/plain' })
    await courseService.parseOutline(18, file)

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/courses/18/parse-outline',
      expect.any(FormData),
      {
        timeout: 60000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
  })
})

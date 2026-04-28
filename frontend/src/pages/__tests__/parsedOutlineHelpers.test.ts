import { describe, expect, it } from 'vitest'
import {
  countSelectedOutline,
  getFriendlyOutlineFallbackReason,
  getOutlineFileValidationError,
  hasPendingOutlineImport,
  normalizeParsedOutlineForUI,
  validateParsedOutlineForImport,
} from '../teacher/courses/parsedOutlineHelpers'

describe('parsedOutlineHelpers', () => {
  it('normalizes parsed outline data for UI state', () => {
    const result = normalizeParsedOutlineForUI([
      {
        title: '  第一章  ',
        sections: [
          { title: ' 课时一 ', type: 'TEXT' },
          { title: '课时二', type: 'UNKNOWN' },
        ],
      },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]._selected).toBe(true)
    expect(result[0].sections[0]._selected).toBe(true)
    expect(result[0].sections[0].type).toBe('TEXT')
    expect(result[0].sections[1].type).toBe('VIDEO')
  })

  it('counts selected chapters and sections', () => {
    const chapters = normalizeParsedOutlineForUI([
      {
        title: '第一章',
        sections: [{ title: '课时一', type: 'VIDEO' }],
      },
      {
        title: '第二章',
        sections: [{ title: '课时二', type: 'TEXT' }],
      },
    ])

    chapters[1]._selected = false

    expect(countSelectedOutline(chapters)).toEqual({
      chapters: 1,
      sections: 1,
    })
  })

  it('validates selected outline items before import', () => {
    const chapters = normalizeParsedOutlineForUI([
      {
        title: '',
        sections: [{ title: '课时一', type: 'VIDEO' }],
      },
    ])

    expect(validateParsedOutlineForImport(chapters)).toBe(
      '请选择并填写有效的章节标题'
    )

    chapters[0].title = '第一章'
    chapters[0].sections[0].title = ''

    expect(validateParsedOutlineForImport(chapters)).toBe(
      '请选择并填写有效的课时标题'
    )
  })

  it('detects pending items and friendly fallback messages', () => {
    const chapters = normalizeParsedOutlineForUI([
      {
        title: '第一章',
        sections: [{ title: '课时一', type: 'VIDEO' }],
      },
    ])

    expect(hasPendingOutlineImport(chapters)).toBe(true)
    chapters[0]._saved = true
    expect(hasPendingOutlineImport(chapters)).toBe(false)
    expect(getFriendlyOutlineFallbackReason('json_unmarshal_failed')).toContain(
      '无法解析'
    )
  })

  it('validates outline file extension and size', () => {
    expect(
      getOutlineFileValidationError(
        new File(['hello'], 'outline.pdf', { type: 'application/pdf' })
      )
    ).toBe('仅支持 .txt / .md 文件')

    expect(
      getOutlineFileValidationError(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'outline.txt', {
          type: 'text/plain',
        })
      )
    ).toBe('文件大小不能超过 2MB')
  })
})

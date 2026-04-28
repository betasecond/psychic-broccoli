import type {
  ParsedOutlineChapter,
  ParsedOutlineSection,
} from '@/services/courseService'

export type ParsedOutlineSectionUI = ParsedOutlineSection & {
  _selected: boolean
  _saved?: boolean
  _error?: string
}

export type ParsedOutlineChapterUI = Omit<ParsedOutlineChapter, 'sections'> & {
  sections: ParsedOutlineSectionUI[]
  _selected: boolean
  _saved?: boolean
  _saving?: boolean
  _error?: string
  _createdChapterId?: number
}

export function normalizeParsedOutlineForUI(
  chapters: unknown[]
): ParsedOutlineChapterUI[] {
  return chapters.map((chapter, chapterIndex) =>
    normalizeParsedOutlineChapterForUI(
      chapter as Partial<ParsedOutlineChapter>,
      chapterIndex
    )
  )
}

export function normalizeParsedOutlineChapterForUI(
  chapter: Partial<ParsedOutlineChapter>,
  chapterIndex = 0
): ParsedOutlineChapterUI {
  const normalizedSections = Array.isArray(chapter.sections)
    ? chapter.sections.map((section, sectionIndex) =>
        normalizeParsedOutlineSectionForUI(
          section as Partial<ParsedOutlineSection>,
          sectionIndex
        )
      )
    : []

  return {
    title: String(chapter.title ?? '').trim(),
    orderIndex:
      typeof chapter.orderIndex === 'number' && chapter.orderIndex > 0
        ? chapter.orderIndex
        : chapterIndex + 1,
    sections: normalizedSections,
    _selected: true,
    _saved: false,
    _saving: false,
    _error: undefined,
    _createdChapterId: undefined,
  }
}

export function normalizeParsedOutlineSectionForUI(
  section: Partial<ParsedOutlineSection>,
  sectionIndex = 0
): ParsedOutlineSectionUI {
  return {
    title: String(section.title ?? '').trim(),
    orderIndex:
      typeof section.orderIndex === 'number' && section.orderIndex > 0
        ? section.orderIndex
        : sectionIndex + 1,
    type: normalizeOutlineSectionType(section.type),
    _selected: true,
    _saved: false,
    _error: undefined,
  }
}

export function normalizeOutlineSectionType(
  type?: string
): 'VIDEO' | 'TEXT' {
  return type === 'TEXT' ? 'TEXT' : 'VIDEO'
}

export function getOutlineFileValidationError(file: File): string | null {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.txt') && !name.endsWith('.md')) {
    return '仅支持 .txt / .md 文件'
  }
  if (file.size > 2 * 1024 * 1024) {
    return '文件大小不能超过 2MB'
  }
  return null
}

export function getFriendlyOutlineFallbackReason(reason?: string): string {
  switch (reason) {
    case 'missing_key':
      return '未提供临时模型 Key，已切换为规则解析。'
    case 'timeout':
      return '模型请求超时，已切换为规则解析。'
    case 'request_failed':
      return '模型请求失败，已切换为规则解析。'
    case 'bad_status':
      return '模型服务返回异常状态，已切换为规则解析。'
    case 'empty_response':
      return '模型返回内容为空，已切换为规则解析。'
    case 'json_not_found':
      return '模型返回中未提取到有效 JSON，已切换为规则解析。'
    case 'json_unmarshal_failed':
      return '模型返回结构无法解析，已切换为规则解析。'
    case 'validation_failed':
      return '模型解析结果未通过校验，已切换为规则解析。'
    case 'rule_parse_failed':
      return '规则解析也未成功，请检查文件内容。'
    default:
      return '模型解析未成功，已切换为规则解析。'
  }
}

export function countSelectedOutline(chapters: ParsedOutlineChapterUI[]): {
  chapters: number
  sections: number
} {
  return chapters.reduce(
    (accumulator, chapter) => {
      if (chapter._selected) {
        accumulator.chapters += 1
      }
      accumulator.sections += chapter.sections.filter(section => {
        return chapter._selected && section._selected
      }).length
      return accumulator
    },
    { chapters: 0, sections: 0 }
  )
}

export function hasPendingOutlineImport(
  chapters: ParsedOutlineChapterUI[]
): boolean {
  return chapters.some(chapter => {
    if (!chapter._selected || chapter._saved) {
      return false
    }
    if (chapter.sections.length === 0) {
      return true
    }
    return chapter.sections.some(section => section._selected && !section._saved)
  })
}

export function validateParsedOutlineForImport(
  chapters: ParsedOutlineChapterUI[]
): string | null {
  const selectedChapters = chapters.filter(chapter => chapter._selected)
  if (selectedChapters.length === 0) {
    return '至少选择 1 个章节后才能导入'
  }

  for (const chapter of selectedChapters) {
    if (!chapter.title.trim()) {
      return '请选择并填写有效的章节标题'
    }

    for (const section of chapter.sections) {
      if (!section._selected) {
        continue
      }
      if (!section.title.trim()) {
        return '请选择并填写有效的课时标题'
      }
    }
  }

  return null
}

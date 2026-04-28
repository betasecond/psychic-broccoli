import type {
  ConfirmParsedQuestionsRequest,
  ParsedExamQuestion,
} from '@/services/examService'

export type ParsedQuestionUI = ParsedExamQuestion & {
  _selected?: boolean
  _editing?: boolean
  _error?: string
}

export function normalizeParsedQuestionsForUI(
  questions: unknown[]
): ParsedQuestionUI[] {
  return questions.map(question =>
    normalizeParsedQuestionForUI(question as Partial<ParsedExamQuestion>)
  )
}

export function normalizeParsedQuestionForUI(
  question: Partial<ParsedExamQuestion>
): ParsedQuestionUI {
  return {
    type: normalizeQuestionType(question.type),
    stem: String(question.stem ?? '').trim(),
    options: normalizeQuestionOptions(question.options),
    answer: String(question.answer ?? '').trim(),
    score: typeof question.score === 'number' ? question.score : 0,
    confidence:
      typeof question.confidence === 'number' ? question.confidence : undefined,
    issues: Array.isArray(question.issues)
      ? question.issues.map(item => String(item))
      : [],
    _selected: true,
    _editing: false,
    _error: undefined,
  }
}

export function stripQuestionUIFields(
  question: ParsedQuestionUI | ParsedExamQuestion
): ParsedExamQuestion {
  return {
    type: normalizeQuestionType(question.type),
    stem: String(question.stem ?? '').trim(),
    options: normalizeQuestionOptions(question.options),
    answer: String(question.answer ?? '').trim(),
    score: typeof question.score === 'number' ? question.score : 0,
    confidence:
      typeof question.confidence === 'number' ? question.confidence : undefined,
    issues: Array.isArray(question.issues)
      ? question.issues.map(item => String(item))
      : [],
  }
}

export function buildConfirmParsedQuestionsPayload(
  examId: number,
  originalQuestions: ParsedExamQuestion[],
  currentQuestions: ParsedQuestionUI[]
): ConfirmParsedQuestionsRequest {
  return {
    examId,
    originalQuestions: originalQuestions.map(stripQuestionUIFields),
    confirmedQuestions: currentQuestions
      .filter(question => question._selected)
      .map(stripQuestionUIFields),
  }
}

export function validateParsedQuestionForConfirm(
  question: ParsedQuestionUI
): string | null {
  if (!question.stem.trim()) {
    return '请输入题干'
  }
  if (question.score <= 0 || question.score > 100) {
    return '请输入有效分值'
  }

  if (
    question.type === 'SINGLE_CHOICE' ||
    question.type === 'MULTIPLE_CHOICE'
  ) {
    const validOptions = question.options.filter(option => option.trim())
    if (validOptions.length < 2) {
      return '选择题至少需要 2 个选项'
    }
  }

  if (question.type === 'SINGLE_CHOICE' && !/^[A-F]$/.test(question.answer)) {
    return '请选择正确答案'
  }

  if (
    question.type === 'MULTIPLE_CHOICE' &&
    !question.answer
      .split(',')
      .map(item => item.trim())
      .filter(Boolean).length
  ) {
    return '请选择至少一个正确答案'
  }

  if (
    question.type === 'TRUE_FALSE' &&
    question.answer !== 'true' &&
    question.answer !== 'false'
  ) {
    return '请选择正确答案'
  }

  if (question.type === 'SHORT_ANSWER' && !question.answer.trim()) {
    return '请输入参考答案'
  }

  return null
}

export function getFriendlyFallbackReason(reason?: string): string {
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

export function getConfidenceMeta(confidence?: number): {
  color: string
  label: string
  text: string
} {
  if (typeof confidence !== 'number') {
    return { color: 'default', label: '-', text: '未知' }
  }
  if (confidence >= 0.85) {
    return { color: 'success', label: '高', text: confidence.toFixed(2) }
  }
  if (confidence >= 0.6) {
    return { color: 'warning', label: '中', text: confidence.toFixed(2) }
  }
  return { color: 'error', label: '低', text: confidence.toFixed(2) }
}

export function changeParsedQuestionType(
  question: ParsedQuestionUI,
  nextType: ParsedExamQuestion['type']
): ParsedQuestionUI {
  const nextQuestion: ParsedQuestionUI = {
    ...question,
    type: nextType,
    issues: [...question.issues],
  }

  if (nextType === 'TRUE_FALSE') {
    nextQuestion.options = []
    nextQuestion.answer =
      question.answer === 'false' || question.answer === 'true'
        ? question.answer
        : 'true'
    return nextQuestion
  }

  if (nextType === 'SHORT_ANSWER') {
    nextQuestion.options = []
    return nextQuestion
  }

  nextQuestion.options =
    question.options.length >= 2
      ? [...question.options]
      : [...question.options, '', ''].slice(0, 2)

  if (nextType === 'SINGLE_CHOICE') {
    if (question.type === 'MULTIPLE_CHOICE' && question.answer.includes(',')) {
      const firstAnswer = question.answer.split(',')[0]?.trim() || 'A'
      nextQuestion.answer = firstAnswer
      nextQuestion.issues = [
        ...nextQuestion.issues,
        '已从多选答案中保留第一个选项',
      ]
      return nextQuestion
    }
    nextQuestion.answer = question.answer.trim() || 'A'
    return nextQuestion
  }

  if (question.type === 'SINGLE_CHOICE' && question.answer.trim()) {
    nextQuestion.answer = question.answer.trim()
    return nextQuestion
  }
  nextQuestion.answer = question.answer.trim()
  return nextQuestion
}

export function getQuestionFileValidationError(file: File): string | null {
  const name = file.name.toLowerCase()
  if (
    !name.endsWith('.txt') &&
    !name.endsWith('.md') &&
    !name.endsWith('.csv')
  ) {
    return '仅支持 .txt / .md / .csv 文件'
  }
  if (file.size > 2 * 1024 * 1024) {
    return '文件大小不能超过 2MB'
  }
  return null
}

function normalizeQuestionType(
  type?: ParsedExamQuestion['type']
): ParsedExamQuestion['type'] {
  switch (type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
    case 'SHORT_ANSWER':
      return type
    default:
      return 'SINGLE_CHOICE'
  }
}

function normalizeQuestionOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map(item => String(item ?? '').trim())
  }
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item ?? '').trim())
      }
    } catch {
      return []
    }
  }
  return []
}

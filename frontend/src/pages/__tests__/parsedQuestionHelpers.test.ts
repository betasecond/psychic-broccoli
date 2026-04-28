import { describe, expect, it } from 'vitest'
import {
  buildConfirmParsedQuestionsPayload,
  changeParsedQuestionType,
  getConfidenceMeta,
  getFriendlyFallbackReason,
  getQuestionFileValidationError,
  normalizeParsedQuestionsForUI,
  stripQuestionUIFields,
  validateParsedQuestionForConfirm,
} from '../teacher/exams/parsedQuestionHelpers'

describe('parsedQuestionHelpers', () => {
  it('normalizes parsed questions for UI display', () => {
    const result = normalizeParsedQuestionsForUI([
      {
        type: 'MULTIPLE_CHOICE',
        stem: '  题目  ',
        options: '["A. one","B. two"]',
        answer: 'A,C',
        score: 5,
        confidence: 0.72,
      },
      {
        type: 'TRUE_FALSE',
        stem: '判断题',
        options: 'invalid-json',
        answer: 'true',
        issues: ['需要检查'],
      },
    ])

    expect(result[0]._selected).toBe(true)
    expect(result[0].options).toEqual(['A. one', 'B. two'])
    expect(result[1].options).toEqual([])
    expect(result[1].issues).toEqual(['需要检查'])
  })

  it('strips UI fields when building confirm payload', () => {
    const payload = buildConfirmParsedQuestionsPayload(
      8,
      [
        {
          type: 'SINGLE_CHOICE',
          stem: '原始题',
          options: ['A', 'B'],
          answer: 'A',
          score: 3,
          confidence: 0.8,
          issues: [],
        },
      ],
      [
        {
          type: 'SINGLE_CHOICE',
          stem: '确认题',
          options: ['A', 'B'],
          answer: 'A',
          score: 3,
          confidence: 0.9,
          issues: [],
          _selected: true,
          _editing: true,
          _error: 'ignore',
        },
        {
          type: 'SINGLE_CHOICE',
          stem: '未选中题',
          options: ['A', 'B'],
          answer: 'A',
          score: 3,
          confidence: 0.9,
          issues: [],
          _selected: false,
        },
      ]
    )

    expect(payload.examId).toBe(8)
    expect(payload.confirmedQuestions).toHaveLength(1)
    expect(payload.confirmedQuestions[0]).toEqual({
      type: 'SINGLE_CHOICE',
      stem: '确认题',
      options: ['A', 'B'],
      answer: 'A',
      score: 3,
      confidence: 0.9,
      issues: [],
    })
    expect(stripQuestionUIFields({
      type: 'TRUE_FALSE',
      stem: '判断题',
      options: ['x'],
      answer: 'true',
      score: 2,
      confidence: 0.5,
      issues: [],
      _selected: true,
    })).toEqual({
      type: 'TRUE_FALSE',
      stem: '判断题',
      options: ['x'],
      answer: 'true',
      score: 2,
      confidence: 0.5,
      issues: [],
    })
  })

  it('changes question type with expected local editing rules', () => {
    const result = changeParsedQuestionType(
      {
        type: 'MULTIPLE_CHOICE',
        stem: '题目',
        options: ['A', 'B', 'C'],
        answer: 'A,C',
        score: 4,
        confidence: 0.7,
        issues: [],
        _selected: true,
      },
      'SINGLE_CHOICE'
    )

    expect(result.type).toBe('SINGLE_CHOICE')
    expect(result.answer).toBe('A')
    expect(result.issues).toContain('已从多选答案中保留第一个选项')
  })

  it('validates parsed question fields before confirm', () => {
    expect(
      validateParsedQuestionForConfirm({
        type: 'SINGLE_CHOICE',
        stem: '',
        options: ['A', 'B'],
        answer: 'A',
        score: 3,
        issues: [],
      })
    ).toBe('请输入题干')

    expect(
      validateParsedQuestionForConfirm({
        type: 'MULTIPLE_CHOICE',
        stem: '题目',
        options: ['A'],
        answer: 'A',
        score: 3,
        issues: [],
      })
    ).toBe('选择题至少需要 2 个选项')
  })

  it('returns fallback, confidence, and file validation helpers', () => {
    expect(getFriendlyFallbackReason('json_unmarshal_failed')).toContain('无法解析')
    expect(getConfidenceMeta(0.91)).toEqual({
      color: 'success',
      label: '高',
      text: '0.91',
    })
    expect(
      getQuestionFileValidationError(
        new File(['x'], 'bad.pdf', { type: 'application/pdf' })
      )
    ).toBe('仅支持 .txt / .md / .csv 文件')
  })
})

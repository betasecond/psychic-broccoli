import api from './api'

// 类型定义
export interface Exam {
  id: number
  courseId: number
  title: string
  startTime: string
  endTime: string
  createdAt: string
  courseTitle?: string
  status?: string
  submitted?: boolean
  submissionId?: number
  submittedAt?: string
  totalScore?: number
}

export interface ExamQuestion {
  id: number
  examId: number
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  stem: string
  options?: string
  answer: string
  score: number
  orderIndex: number
}

export interface ExamSubmission {
  id: number
  examId: number
  studentId: number
  submittedAt: string
  totalScore?: number
  examTitle?: string
  courseTitle?: string
  studentName?: string
  studentEmail?: string
  answers?: ExamAnswer[]
}

export interface ExamAnswer {
  questionId: number
  type: string
  stem: string
  score: number
  studentAnswer: string
  correctAnswer: string
  options?: string
  scoreAwarded?: number
}

export interface ExamStatistics {
  totalStudents: number
  participated: number
  notParticipated: number
  participationRate: number
  avgScore?: number
  maxScore?: number
  minScore?: number
  passCount: number
  passRate: number
}

export interface CreateExamRequest {
  courseId: number
  title: string
  startTime: string
  endTime: string
}

export interface UpdateExamRequest {
  courseId: number
  title: string
  startTime: string
  endTime: string
}

export interface AddQuestionRequest {
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  stem: string
  options?: string
  answer: string
  score: number
  orderIndex: number
}

export interface SubmitExamRequest {
  answers: {
    questionId: number
    answer: string
  }[]
}

export interface ExamsResponse {
  success: boolean
  data: {
    exams: Exam[]
  }
}

export interface ExamDetailResponse {
  success: boolean
  data: {
    exam: Exam
    questions: ExamQuestion[]
  }
}

export interface ExamResultsResponse {
  success: boolean
  data: ExamSubmission[]
}

export interface StatisticsResponse {
  success: boolean
  data: ExamStatistics
}

// Exam Service
export const examService = {
  // 获取考试列表
  async getExams(params?: { courseId?: number; title?: string; page?: number; pageSize?: number }): Promise<ExamsResponse> {
    return api.get('/exams', { params })
  },

  // 学生获取自己的考试列表
  async getMyExams(): Promise<ExamsResponse> {
    return api.get('/exams/my')
  },

  // 获取考试详情
  async getExam(id: number): Promise<ExamDetailResponse> {
    return api.get(`/exams/${id}`)
  },

  // 创建考试
  async createExam(data: CreateExamRequest): Promise<{ success: boolean; data: { id: number } }> {
    return api.post('/exams', data)
  },

  // 更新考试
  async updateExam(id: number, data: UpdateExamRequest): Promise<{ success: boolean; message: string }> {
    return api.put(`/exams/${id}`, data)
  },

  // 删除考试
  async deleteExam(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/exams/${id}`)
  },

  // 添加题目
  async addQuestion(examId: number, data: AddQuestionRequest): Promise<{ success: boolean; data: { id: number } }> {
    return api.post(`/exams/${examId}/questions`, data)
  },

  // 更新题目
  async updateQuestion(examId: number, questionId: number, data: AddQuestionRequest): Promise<{ success: boolean; message: string }> {
    return api.put(`/exams/${examId}/questions/${questionId}`, data)
  },

  // 删除题目
  async deleteQuestion(examId: number, questionId: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/exams/${examId}/questions/${questionId}`)
  },

  // 提交答卷
  async submitExam(id: number, data: SubmitExamRequest): Promise<{ success: boolean; message: string; data: { submissionId: number; totalScore: number } }> {
    return api.post(`/exams/${id}/submit`, data)
  },

  // 获取考试成绩列表（教师）
  async getExamResults(id: number): Promise<ExamResultsResponse> {
    return api.get(`/exams/${id}/results`)
  },

  // 学生获取自己的答卷
  async getMySubmission(examId: number): Promise<{ success: boolean; data: ExamSubmission }> {
    return api.get(`/exams/${examId}/my-submission`)
  },

  // 获取答卷详情（教师）
  async getSubmissionDetail(id: number): Promise<{ success: boolean; data: ExamSubmission }> {
    return api.get(`/exams/submissions/${id}`)
  },

  // 获取考试统计
  async getExamStatistics(id: number): Promise<StatisticsResponse> {
    return api.get(`/exams/${id}/statistics`)
  },

  // AI解析题目文件
  async parseQuestionsFromFile(examId: number, file: File): Promise<{ questions: any[]; count: number }> {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/exams/${examId}/parse-questions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as any
  },
}


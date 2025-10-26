import api from './api'

// 类型定义
export interface Assignment {
  id: number
  courseId: number
  title: string
  content?: string
  attachments?: string
  deadline?: string
  createdAt: string
  courseTitle?: string
  submitted?: boolean
  graded?: boolean
  grade?: number
  feedback?: string
  submissionId?: number
  submittedAt?: string
}

export interface AssignmentSubmission {
  id: number
  assignmentId: number
  studentId: number
  content?: string
  attachments?: string
  submittedAt?: string
  grade?: number
  feedback?: string
  assignmentTitle?: string
  courseTitle?: string
  studentName?: string
  studentEmail?: string
}

export interface AssignmentStatistics {
  totalStudents: number
  submitted: number
  graded: number
  ungraded: number
  notSubmitted: number
  submitRate: number
  avgGrade?: number
}

export interface CreateAssignmentRequest {
  courseId: number
  title: string
  content?: string
  deadline?: string
}

export interface UpdateAssignmentRequest {
  courseId: number
  title: string
  content?: string
  deadline?: string
}

export interface SubmitAssignmentRequest {
  content?: string
  attachments?: string
}

export interface GradeAssignmentRequest {
  grade: number
  feedback?: string
}

export interface AssignmentsResponse {
  success: boolean
  data: {
    assignments: Assignment[]
  }
}

export interface AssignmentResponse {
  success: boolean
  data: Assignment
}

export interface SubmissionsResponse {
  success: boolean
  data: AssignmentSubmission[]
}

export interface StatisticsResponse {
  success: boolean
  data: AssignmentStatistics
}

// Assignment Service
export const assignmentService = {
  // 获取作业列表
  async getAssignments(params?: { courseId?: number; page?: number; pageSize?: number }): Promise<AssignmentsResponse> {
    return api.get('/assignments', { params })
  },

  // 学生获取自己的作业列表
  async getMyAssignments(): Promise<AssignmentsResponse> {
    return api.get('/assignments/my')
  },

  // 获取作业详情
  async getAssignment(id: number): Promise<AssignmentResponse> {
    return api.get(`/assignments/${id}`)
  },

  // 创建作业
  async createAssignment(data: CreateAssignmentRequest): Promise<{ success: boolean; data: { id: number } }> {
    return api.post('/assignments', data)
  },

  // 更新作业
  async updateAssignment(id: number, data: UpdateAssignmentRequest): Promise<{ success: boolean; message: string }> {
    return api.put(`/assignments/${id}`, data)
  },

  // 删除作业
  async deleteAssignment(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/assignments/${id}`)
  },

  // 提交作业
  async submitAssignment(id: number, data: SubmitAssignmentRequest): Promise<{ success: boolean; message: string }> {
    return api.post(`/assignments/${id}/submit`, data)
  },

  // 获取作业提交列表
  async getSubmissions(params?: { assignmentId?: number; studentId?: number }): Promise<SubmissionsResponse> {
    return api.get('/assignments/submissions', { params })
  },

  // 获取提交详情
  async getSubmissionDetail(id: number): Promise<{ success: boolean; data: AssignmentSubmission }> {
    return api.get(`/assignments/submissions/${id}`)
  },

  // 批改作业
  async gradeSubmission(id: number, data: GradeAssignmentRequest): Promise<{ success: boolean; message: string }> {
    return api.put(`/assignments/submissions/${id}/grade`, data)
  },

  // 获取作业统计
  async getAssignmentStatistics(id: number): Promise<StatisticsResponse> {
    return api.get(`/assignments/${id}/statistics`)
  },
}


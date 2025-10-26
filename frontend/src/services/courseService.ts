import api from './api'

// 类型定义
export interface Course {
  id: number
  title: string
  description?: string
  instructorId: number
  instructorName?: string
  categoryId?: number
  categoryName?: string
  createdAt: string
  enrolledAt?: string
  totalChapters?: number
  completedChapters?: number
  progress?: number
}

export interface CourseChapter {
  id: number
  courseId: number
  title: string
  orderIndex: number
  createdAt?: string
}

export interface CourseStatistics {
  studentCount: number
  assignmentCount: number
  examCount: number
  chapterCount: number
}

export interface CreateCourseRequest {
  title: string
  description?: string
  categoryId?: number
}

export interface UpdateCourseRequest {
  title: string
  description?: string
  categoryId?: number
}

export interface CreateChapterRequest {
  title: string
  orderIndex: number
}

export interface UpdateChapterRequest {
  title: string
  orderIndex: number
}

export interface CoursesResponse {
  success: boolean
  data: {
    courses: Course[]
  }
}

export interface CourseResponse {
  success: boolean
  data: Course
}

export interface ChaptersResponse {
  success: boolean
  data: CourseChapter[] | { chapters: CourseChapter[] }
}

export interface StatisticsResponse {
  success: boolean
  data: CourseStatistics
}

// Course Service
export const courseService = {
  // 获取课程列表
  async getCourses(params?: { categoryId?: number; page?: number; pageSize?: number }): Promise<CoursesResponse> {
    return api.get('/courses', { params })
  },

  // 学生获取已选课程列表
  async getMyCourses(): Promise<CoursesResponse> {
    return api.get('/courses/my')
  },

  // 获取课程详情
  async getCourse(id: number): Promise<CourseResponse> {
    return api.get(`/courses/${id}`)
  },

  // 创建课程
  async createCourse(data: CreateCourseRequest): Promise<{ success: boolean; data: { id: number } }> {
    return api.post('/courses', data)
  },

  // 更新课程
  async updateCourse(id: number, data: UpdateCourseRequest): Promise<{ success: boolean; message: string }> {
    return api.put(`/courses/${id}`, data)
  },

  // 删除课程
  async deleteCourse(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/courses/${id}`)
  },

  // 选课
  async enrollCourse(id: number): Promise<{ success: boolean; message: string }> {
    return api.post(`/courses/${id}/enroll`)
  },

  // 获取章节列表
  async getChapters(courseId: number): Promise<ChaptersResponse> {
    return api.get(`/courses/${courseId}/chapters`)
  },

  // 创建章节
  async createChapter(courseId: number, data: CreateChapterRequest): Promise<{ success: boolean; data: { id: number } }> {
    return api.post(`/courses/${courseId}/chapters`, data)
  },

  // 更新章节
  async updateChapter(courseId: number, chapterId: number, data: UpdateChapterRequest): Promise<{ success: boolean; message: string }> {
    return api.put(`/courses/${courseId}/chapters/${chapterId}`, data)
  },

  // 删除章节
  async deleteChapter(courseId: number, chapterId: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/courses/${courseId}/chapters/${chapterId}`)
  },

  // 获取课程统计
  async getCourseStatistics(id: number): Promise<StatisticsResponse> {
    return api.get(`/courses/${id}/statistics`)
  },
}


import api from './api'

// 类型定义
export interface Course {
  id: number
  title: string
  description?: string
  coverImageUrl?: string
  instructorId: number
  instructorName?: string
  categoryId?: number
  categoryName?: string
  status: string  // DRAFT | PUBLISHED | ARCHIVED
  enrolled?: boolean
  createdAt: string
  updatedAt?: string
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

export interface CourseSection {
  id: number
  chapterId: number
  title: string
  orderIndex: number
  type: 'VIDEO' | 'TEXT'
  videoUrl?: string
  content?: string
}

export interface CreateSectionRequest {
  title: string
  type: 'VIDEO' | 'TEXT'
  orderIndex: number
  videoUrl?: string
  content?: string
}

export interface UpdateSectionRequest extends CreateSectionRequest {}

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
  coverImageUrl?: string
}

export interface UpdateCourseRequest {
  title: string
  description?: string
  categoryId?: number
  coverImageUrl?: string
}

export interface CreateChapterRequest {
  title: string
  orderIndex: number
}

export interface UpdateChapterRequest {
  title: string
  orderIndex: number
}

export interface Category {
  id: number
  name: string
  description?: string
}

export interface CourseMaterial {
  id: number
  courseId: number
  uploaderID: number
  uploaderName?: string
  name: string
  url: string
  size: number
  courseTitle?: string
  createdAt: string
}

export interface CoursesResponse {
  courses: Course[]
  total?: number
  page?: number
  pageSize?: number
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
  async getCourses(params?: {
    categoryId?: number
    page?: number
    pageSize?: number
    instructorId?: number
    status?: string
  }): Promise<CoursesResponse> {
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

  // 获取课程分类列表
  async getCategories(): Promise<Category[]> {
    return api.get('/categories')
  },

  // ── 课时（Section）方法 ──

  // 获取章节课时列表
  async getSections(courseId: number, chapterId: number): Promise<CourseSection[]> {
    const res = await api.get(`/courses/${courseId}/chapters/${chapterId}/sections`)
    return Array.isArray(res) ? (res as unknown as CourseSection[]) : []
  },

  // 创建课时
  async createSection(courseId: number, chapterId: number, data: CreateSectionRequest): Promise<{ id: number }> {
    return api.post(`/courses/${courseId}/chapters/${chapterId}/sections`, data) as unknown as { id: number }
  },

  // 更新课时
  async updateSection(courseId: number, chapterId: number, sectionId: number, data: UpdateSectionRequest): Promise<void> {
    await api.put(`/courses/${courseId}/chapters/${chapterId}/sections/${sectionId}`, data)
  },

  // 删除课时
  async deleteSection(courseId: number, chapterId: number, sectionId: number): Promise<void> {
    await api.delete(`/courses/${courseId}/chapters/${chapterId}/sections/${sectionId}`)
  },

  // 获取课程学生列表（教师用）
  async getCourseStudents(courseId: number): Promise<{ students: any[]; total: number }> {
    return api.get(`/courses/${courseId}/students`) as any
  },

  // AI 解析课程大纲文件
  async parseOutline(courseId: number, file: File): Promise<{
    chapters: Array<{
      title: string
      orderIndex: number
      sections: Array<{ title: string; orderIndex: number; type: string }>
    }>
    chapterCount: number
    sectionCount: number
  }> {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/courses/${courseId}/parse-outline`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as any
  },

  // ── 课程资料（Material）方法 ──

  async getCourseMaterials(courseId: number): Promise<{ materials: CourseMaterial[]; total: number }> {
    return api.get(`/courses/${courseId}/materials`) as any
  },

  async uploadCourseMaterial(courseId: number, file: File): Promise<CourseMaterial> {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/courses/${courseId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as any
  },

  async deleteCourseMaterial(courseId: number, materialId: number): Promise<void> {
    await api.delete(`/courses/${courseId}/materials/${materialId}`)
  },
}


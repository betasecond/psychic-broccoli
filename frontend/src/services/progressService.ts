import api from './api'

// 更新学习进度
export const updateProgress = async (courseId: number, progress: number): Promise<void> => {
  await api.put(`/courses/${courseId}/progress`, { progress })
}

// 标记章节完成
export const completeChapter = async (chapterId: number): Promise<{
  message: string
  progress: number
  completedCount: number
  totalCount: number
}> => {
  const response = await api.post(`/chapters/${chapterId}/complete`)
  return response
}

export const progressService = {
  updateProgress,
  completeChapter,
}

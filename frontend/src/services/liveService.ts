import api from './api'

// 类型定义
export interface LiveSession {
  id: number
  title: string
  description?: string
  streamName: string
  pushURL?: string  // 只有讲师能看到
  playURL: string
  status: 'SCHEDULED' | 'LIVE' | 'ENDED'
  scheduledTime?: string
  startedAt?: string
  endedAt?: string
  viewersCount: number
  createdAt: string
  course: {
    id: number
    title: string
  }
  instructor: {
    id: number
    username: string
  }
}

export interface LiveMessage {
  id: number
  content: string
  createdAt: string
  user: {
    id: number
    username: string
    avatarUrl?: string
  }
}

export interface CreateLiveRequest {
  courseId: number
  title: string
  description?: string
  scheduledTime?: string
}

export interface SendMessageRequest {
  content: string
}

class LiveService {
  // 创建直播
  async createLive(data: CreateLiveRequest): Promise<LiveSession> {
    return api.post('/live', data)
  }

  // 获取直播列表
  async getLiveList(params?: {
    courseId?: number
    status?: 'SCHEDULED' | 'LIVE' | 'ENDED'
  }): Promise<LiveSession[]> {
    return api.get('/live', { params })
  }

  // 获取直播详情
  async getLiveDetail(id: number): Promise<LiveSession> {
    return api.get(`/live/${id}`)
  }

  // 开始直播
  async startLive(id: number): Promise<void> {
    await api.put(`/live/${id}/start`)
  }

  // 结束直播
  async endLive(id: number): Promise<void> {
    await api.put(`/live/${id}/end`)
  }

  // 加入直播
  async joinLive(id: number): Promise<{ viewersCount: number }> {
    return api.post(`/live/${id}/join`)
  }

  // 离开直播
  async leaveLive(id: number): Promise<{ viewersCount: number }> {
    return api.post(`/live/${id}/leave`)
  }

  // 获取观看人数
  async getViewers(id: number): Promise<{ viewersCount: number }> {
    return api.get(`/live/${id}/viewers`)
  }

  // 获取聊天消息
  async getMessages(id: number, since?: string): Promise<LiveMessage[]> {
    const params = since ? { since } : {}
    return api.get(`/live/${id}/messages`, { params })
  }

  // 发送聊天消息
  async sendMessage(id: number, content: string): Promise<LiveMessage> {
    return api.post(`/live/${id}/messages`, { content })
  }

  // 获取消息数量
  async getMessageCount(id: number): Promise<{ count: number }> {
    return api.get(`/live/${id}/messages/count`)
  }

  // 删除消息
  async deleteMessage(id: number, messageId: number): Promise<void> {
    await api.delete(`/live/${id}/messages/${messageId}`)
  }
}

export const liveService = new LiveService()

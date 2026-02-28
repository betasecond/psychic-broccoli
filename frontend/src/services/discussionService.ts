import api from './api'

// 类型定义
export interface Discussion {
  id: number
  title: string
  content?: string
  status: 'OPEN' | 'CLOSED'
  replyCount: number  // ✅ 修复：改名为 replyCount，避免与 DiscussionDetail 的 replies 冲突
  createdAt: string
  course?: {
    id: number
    title: string
  }
  author?: {
    id: number
    username: string
    avatarUrl?: string
  }
}

export interface DiscussionReply {
  id: number
  content: string
  createdAt: string
  user: {
    id: number
    username: string
    avatarUrl?: string
  }
}

export interface DiscussionDetail extends Discussion {
  replies: DiscussionReply[]
}

export interface CreateDiscussionRequest {
  courseId: number
  title: string
  content: string
}

export interface ReplyDiscussionRequest {
  content: string
}

class DiscussionService {
  // 创建讨论
  async createDiscussion(data: CreateDiscussionRequest): Promise<{ id: number }> {
    const response = await api.post('/discussions', data)
    return response
  }

  // 获取讨论列表
  async getDiscussions(params?: {
    courseId?: number
    status?: 'OPEN' | 'CLOSED'
    keyword?: string
  }): Promise<Discussion[]> {
    const response = await api.get('/discussions', { params })
    return response
  }

  // 获取讨论详情
  async getDiscussionDetail(id: number): Promise<DiscussionDetail> {
    const response = await api.get(`/discussions/${id}`)
    return response
  }

  // 回复讨论
  async replyDiscussion(id: number, content: string): Promise<DiscussionReply> {
    const response = await api.post(`/discussions/${id}/replies`, { content })
    return response
  }

  // 关闭讨论
  async closeDiscussion(id: number): Promise<void> {
    await api.put(`/discussions/${id}/close`)
  }

  // 删除讨论
  async deleteDiscussion(id: number): Promise<void> {
    await api.delete(`/discussions/${id}`)
  }
}

export const discussionService = new DiscussionService()

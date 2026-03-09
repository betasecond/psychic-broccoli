import api from './api'

export interface Discussion {
  id: number
  title: string
  content?: string
  status: 'OPEN' | 'CLOSED'
  replyCount: number
  views: number
  likes: number
  heatScore: number
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
  likeCount: number
  favCount: number
  isLiked: boolean
  isFavorited: boolean
}

export interface DiscussionDetail extends Discussion {
  replies: DiscussionReply[]
}

export interface CreateDiscussionRequest {
  courseId: number
  title: string
  content: string
}

class DiscussionService {
  async createDiscussion(data: CreateDiscussionRequest): Promise<{ id: number }> {
    return await api.post('/discussions', data)
  }

  async getDiscussions(params?: {
    courseId?: number
    status?: 'OPEN' | 'CLOSED'
    keyword?: string
    sort?: 'hot' | 'latest'
  }): Promise<Discussion[]> {
    return await api.get('/discussions', { params })
  }

  async getDiscussionDetail(id: number): Promise<DiscussionDetail> {
    return await api.get(`/discussions/${id}`)
  }

  async replyDiscussion(id: number, content: string): Promise<DiscussionReply> {
    return await api.post(`/discussions/${id}/replies`, { content })
  }

  async closeDiscussion(id: number): Promise<void> {
    await api.put(`/discussions/${id}/close`)
  }

  async deleteDiscussion(id: number): Promise<void> {
    await api.delete(`/discussions/${id}`)
  }

  async likeReply(discussionId: number, replyId: number): Promise<{ liked: boolean }> {
    return await api.post(`/discussions/${discussionId}/replies/${replyId}/like`)
  }

  async favoriteReply(discussionId: number, replyId: number): Promise<{ favorited: boolean }> {
    return await api.post(`/discussions/${discussionId}/replies/${replyId}/favorite`)
  }
}

export const discussionService = new DiscussionService()

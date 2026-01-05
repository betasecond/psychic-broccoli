import api from './api'

export interface DiscussionReply {
  id: number
  discussionId: number
  content: string
  authorId: number
  authorName?: string
  createdAt: string
  updatedAt: string
}

export interface Discussion {
  id: number
  title: string
  content: string
  courseId: number
  courseTitle?: string
  authorId: number
  authorName?: string
  replies: number
  lastReplyAt?: string | null
  status: 'active' | 'closed' | string
  createdAt: string
  updatedAt: string
  repliesList?: DiscussionReply[]
}

export const discussionService = {
  async getDiscussions(): Promise<Discussion[]> {
    return api.get('/discussions')
  },

  async getDiscussion(id: number): Promise<Discussion> {
    return api.get(`/discussions/${id}`)
  },

  async createDiscussion(data: { title: string; content: string; courseId: number }): Promise<Discussion> {
    return api.post('/discussions', data)
  },

  async updateDiscussion(id: number, data: { title: string; content: string; status: string }): Promise<{ message: string }> {
    return api.put(`/discussions/${id}`, data)
  },

  async deleteDiscussion(id: number): Promise<{ message: string }> {
    return api.delete(`/discussions/${id}`)
  },

  async getReplies(discussionId: number): Promise<DiscussionReply[]> {
    return api.get(`/discussions/${discussionId}/replies`)
  },

  async createReply(discussionId: number, data: { content: string }): Promise<DiscussionReply> {
    return api.post(`/discussions/${discussionId}/replies`, data)
  },

  async updateReply(id: number, data: { content: string }): Promise<{ message: string }> {
    return api.put(`/discussion-replies/${id}`, data)
  },

  async deleteReply(id: number): Promise<{ message: string }> {
    return api.delete(`/discussion-replies/${id}`)
  },
}



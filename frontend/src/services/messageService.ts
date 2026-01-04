import api from './api'

// 消息类型定义
export interface Message {
  id: number
  userId: number
  title: string
  content: string
  date: string
  type: string
  status: 'read' | 'unread'
  sender: string
  createdAt: string
}

// 通知类型定义
export interface Notification {
  id: number
  title: string
  content: string
  date: string
  type: string
  createdAt: string
}

// 讨论类型定义
export interface Discussion {
  id: number
  title: string
  course: string
  author: string
  replies: number
  lastReply: string
  status: string
  createdAt: string
}

// 标记消息状态请求
export interface MarkMessageStatusRequest {
  status: 'read' | 'unread'
}

// 消息服务对象
export const messageService = {
  // 获取消息列表
  getMessages: async (): Promise<Message[]> => {
    try {
      return await api.get('/messages')
    } catch (error) {
      console.error('获取消息列表失败:', error)
      throw error
    }
  },

  // 标记消息状态
  markMessageStatus: async (
    messageId: number,
    status: 'read' | 'unread'
  ): Promise<{ message: string; status: 'read' | 'unread' }> => {
    try {
      return await api.put(`/messages/${messageId}/status`, { status })
    } catch (error) {
      console.error('标记消息状态失败:', error)
      throw error
    }
  },

  // 删除消息
  deleteMessage: async (messageId: number): Promise<{ message: string }> => {
    try {
      return await api.delete(`/messages/${messageId}`)
    } catch (error) {
      console.error('删除消息失败:', error)
      throw error
    }
  },

  // 获取通知列表
  getNotifications: async (): Promise<Notification[]> => {
    try {
      return await api.get('/notifications')
    } catch (error) {
      console.error('获取通知列表失败:', error)
      throw error
    }
  },

  // 获取课程讨论列表
  getDiscussions: async (): Promise<Discussion[]> => {
    try {
      return await api.get('/discussions')
    } catch (error) {
      console.error('获取课程讨论列表失败:', error)
      throw error
    }
  },
}
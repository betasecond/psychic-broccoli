import api from './api'

// 批量导入用户响应
export interface ImportUsersResponse {
  successCount: number
  errorCount: number
  errors: string[]
  message: string
}

// 用户列表响应
export interface UserListResponse {
  users: any[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// 用户信息
export interface User {
  id: number
  userId: number // 兼容旧字段名
  username: string
  fullName?: string
  email?: string
  avatarUrl?: string
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
  phone?: string
  gender?: string
  bio?: string
  createdAt: string
  updatedAt: string
}

// 用户服务类
class UserService {
  /**
   * 批量导入用户（从Excel文件）
   */
  async importUsersFromExcel(file: File): Promise<ImportUsersResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/auth/import-users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  }

  /**
   * 下载用户导入模板
   */
  async downloadUserTemplate(): Promise<Blob> {
    const blob = await api.get('/auth/user-template', {
      responseType: 'blob',
    })
    return blob
  }

  /**
   * 触发下载用户导入模板
   */
  async triggerDownloadTemplate(): Promise<void> {
    const blob = await this.downloadUserTemplate()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user_import_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  /**
   * 获取用户列表
   */
  async getUsers(params: { page?: number; pageSize?: number; role?: string } = {}): Promise<UserListResponse> {
    const response = await api.get('/users', { params })
    
    // 确保用户列表中的每个用户都有userId字段（兼容后端返回的id字段）
    const users = response.users.map((user: any) => ({
      ...user,
      userId: user.id // 将后端的id字段映射到前端需要的userId字段
    }))
    
    return {
      ...response,
      users
    }
  }
}

// 导出单例实例
export const userService = new UserService()
export default userService


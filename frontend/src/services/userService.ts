import api from './api'

// 批量导入用户响应
export interface ImportUsersResponse {
  successCount: number
  errorCount: number
  errors: string[]
  message: string
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
    return response.data
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
}

// 导出单例实例
export const userService = new UserService()
export default userService


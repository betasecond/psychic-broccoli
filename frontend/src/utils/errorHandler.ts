import { message } from 'antd'

export interface ApiError {
  message: string
  code?: string | number
  status?: number
}

export class ErrorHandler {
  /**
   * 处理API错误
   */
  static handleApiError(error: any): ApiError {
    let errorMessage = '操作失败，请稍后重试'
    let errorCode: string | number | undefined
    let status: number | undefined

    if (error.response) {
      // 服务器返回错误响应
      status = error.response.status
      const data = error.response.data

      if (data && data.message) {
        errorMessage = data.message
      } else {
        switch (status) {
          case 400:
            errorMessage = '请求参数错误'
            break
          case 401:
            errorMessage = '认证失败，请重新登录'
            break
          case 403:
            errorMessage = '权限不足，无法访问'
            break
          case 404:
            errorMessage = '请求的资源不存在'
            break
          case 409:
            errorMessage = '数据冲突，请刷新后重试'
            break
          case 422:
            errorMessage = '数据验证失败'
            break
          case 429:
            errorMessage = '请求过于频繁，请稍后重试'
            break
          case 500:
            errorMessage = '服务器内部错误'
            break
          case 502:
            errorMessage = '网关错误'
            break
          case 503:
            errorMessage = '服务暂不可用'
            break
          case 504:
            errorMessage = '请求超时'
            break
          default:
            errorMessage = `请求失败 (${status})`
        }
      }

      if (data && data.code) {
        errorCode = data.code
      }
    } else if (error.request) {
      // 网络错误
      errorMessage = '网络连接失败，请检查网络设置'
      errorCode = 'NETWORK_ERROR'
    } else if (error.message) {
      // 其他错误
      errorMessage = error.message
    }

    return {
      message: errorMessage,
      code: errorCode,
      status,
    }
  }

  /**
   * 显示错误消息
   */
  static showError(error: any, customMessage?: string): void {
    const apiError = this.handleApiError(error)
    const displayMessage = customMessage || apiError.message

    message.error({
      content: displayMessage,
      duration: 4,
      maxCount: 3,
    })
  }

  /**
   * 显示成功消息
   */
  static showSuccess(content: string): void {
    message.success({
      content,
      duration: 3,
      maxCount: 3,
    })
  }

  /**
   * 显示警告消息
   */
  static showWarning(content: string): void {
    message.warning({
      content,
      duration: 3,
      maxCount: 3,
    })
  }

  /**
   * 显示信息消息
   */
  static showInfo(content: string): void {
    message.info({
      content,
      duration: 3,
      maxCount: 3,
    })
  }

  /**
   * 处理表单验证错误
   */
  static handleValidationErrors(errors: Record<string, string[]>): void {
    const firstError = Object.values(errors)[0]?.[0]
    if (firstError) {
      this.showError({ message: firstError })
    }
  }

  /**
   * 记录错误到控制台（开发环境）
   */
  static logError(error: any, context?: string): void {
    if (import.meta.env.DEV) {
      console.group(`🚨 Error${context ? ` in ${context}` : ''}`)
      console.error('Error details:', error)
      if (error.response) {
        console.error('Response data:', error.response.data)
        console.error('Response status:', error.response.status)
        console.error('Response headers:', error.response.headers)
      }
      console.groupEnd()
    }
  }

  /**
   * 处理异步操作错误
   */
  static async handleAsyncError<T>(
    operation: () => Promise<T>,
    errorMessage?: string,
    context?: string
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      this.logError(error, context)
      this.showError(error, errorMessage)
      return null
    }
  }

  /**
   * 创建错误边界处理函数
   */
  static createErrorBoundaryHandler(componentName: string) {
    return (error: Error, errorInfo: any) => {
      this.logError(error, `${componentName} Error Boundary`)
      console.error('Error Info:', errorInfo)
      
      // 可以在这里添加错误上报逻辑
      // this.reportError(error, componentName, errorInfo)
    }
  }

  /**
   * 检查是否为认证错误
   */
  static isAuthError(error: any): boolean {
    return error.response?.status === 401 || 
           error.code === 'AUTH_ERROR' ||
           error.message?.includes('认证') ||
           error.message?.includes('登录')
  }

  /**
   * 检查是否为权限错误
   */
  static isPermissionError(error: any): boolean {
    return error.response?.status === 403 ||
           error.code === 'PERMISSION_ERROR' ||
           error.message?.includes('权限')
  }

  /**
   * 检查是否为网络错误
   */
  static isNetworkError(error: any): boolean {
    return !error.response && error.request ||
           error.code === 'NETWORK_ERROR' ||
           error.message?.includes('网络')
  }
}
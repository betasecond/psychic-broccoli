import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios'
import { message } from 'antd'
import { ErrorHandler } from '../utils/errorHandler'

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 增加超时时间
  headers: {
    'Content-Type': 'application/json',
  },
})

// 添加重试配置
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (
      typeof FormData !== 'undefined' &&
      config.data instanceof FormData &&
      config.headers
    ) {
      const headers = config.headers as any
      headers.delete?.('Content-Type')
      headers.delete?.('content-type')
      delete headers['Content-Type']
      delete headers['content-type']
    }
    
    // 添加请求ID用于调试
    if (config.headers) {
      config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    return config
  },
  error => {
    ErrorHandler.logError(error, 'Request Interceptor')
    return Promise.reject(error)
  }
)

// Response interceptor - Handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 记录成功响应（仅在开发环境）
    if (import.meta.env.DEV) {
      console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      })
    }
    
    // Handle response format: { code, message, data }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      // Return the actual data from the response
      return response.data.data
    }
    
    // Fallback for unexpected response formats
    return response.data
  },
  async (error: AxiosError) => {
    const config = error.config
    ErrorHandler.logError(error, 'Response Interceptor')

    // 重试机制 - 仅对网络错误进行重试
    if (
      !error.response &&
      config &&
      (!config.__retryCount || config.__retryCount < MAX_RETRIES)
    ) {
      config.__retryCount = (config.__retryCount || 0) + 1
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config.__retryCount))
      
      console.log(`🔄 Retrying request (${config.__retryCount}/${MAX_RETRIES}): ${config.url}`)
      
      return api(config)
    }

    const { response } = error

    if (response) {
      const { status, data } = response

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          
          // 避免在登录页面重复跳转
          if (!window.location.pathname.includes('/login')) {
            message.error('登录已过期，请重新登录')
            setTimeout(() => {
              window.location.href = '/login'
            }, 1000)
          }
          break
        case 403:
          // Forbidden
          message.error('没有权限访问该资源')
          break
        case 404:
          // Not found
          message.error('请求的资源不存在')
          break
        case 409:
          // Conflict
          message.error('数据冲突，请刷新后重试')
          break
        case 422:
          // Validation error
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach((err: unknown) => {
              const errorMessage =
                typeof err === 'object' && err !== null && 'message' in err
                  ? (err as { message: string }).message
                  : String(err)
              message.error(errorMessage)
            })
          } else {
            message.error(data.message || '请求参数错误')
          }
          break
        case 429:
          // Too Many Requests
          message.error('请求过于频繁，请稍后重试')
          break
        case 500:
          // Server error
          message.error('服务器内部错误，请稍后重试')
          break
        case 502:
          // Bad Gateway
          message.error('网关错误，请稍后重试')
          break
        case 503:
          // Service Unavailable
          message.error('服务暂不可用，请稍后重试')
          break
        case 504:
          // Gateway Timeout
          message.error('请求超时，请稍后重试')
          break
        default:
          // Other errors
          message.error(data.message || `请求失败 (${status})`)
      }
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      message.error('请求超时，请检查网络连接')
    } else if (error.code === 'ERR_NETWORK') {
      // Network error
      message.error('网络连接失败，请检查网络设置')
    } else {
      // Other network errors
      message.error('网络连接失败，请检查网络设置')
    }

    return Promise.reject(error)
  }
)

// 扩展 AxiosRequestConfig 类型以支持重试计数
declare module 'axios' {
  interface AxiosRequestConfig {
    __retryCount?: number
  }
}

export default api

import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { message } from 'antd'

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return the data directly for successful responses
    return response.data
  },
  error => {
    const { response } = error

    if (response) {
      const { status, data } = response

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token')
          message.error('登录已过期，请重新登录')
          // Don't redirect here, let the middleware handle it
          break
        case 403:
          // Forbidden
          message.error('没有权限访问该资源')
          break
        case 404:
          // Not found
          message.error('请求的资源不存在')
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
        case 500:
          // Server error
          message.error('服务器内部错误，请稍后重试')
          break
        default:
          // Other errors
          message.error(data.message || '请求失败，请重试')
      }
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      message.error('请求超时，请检查网络连接')
    } else {
      // Network error
      message.error('网络连接失败，请检查网络设置')
    }

    return Promise.reject(error)
  }
)

export default api

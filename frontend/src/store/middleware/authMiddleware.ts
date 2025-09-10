import { type Middleware } from '@reduxjs/toolkit'
import { logout } from '../slices/authSlice'
import { message } from 'antd'

interface ActionWithType {
  type: string
  payload?: unknown
  error?: { message?: string }
}

export const authMiddleware: Middleware = store => next => action => {
  const typedAction = action as ActionWithType
  
  // Handle authentication errors
  if (typedAction.type?.endsWith('/rejected')) {
    const error = typedAction.payload
    
    // If it's a 401 error, logout the user
    if (typedAction.error?.message?.includes('401') || (typeof error === 'string' && error.includes('未授权'))) {
      store.dispatch(logout())
      message.error('登录已过期，请重新登录')
      // Redirect to login page
      window.location.href = '/login'
      return next(action)
    }
    
    // Show error message for other errors
    if (error && typeof error === 'string') {
      message.error(error)
    }
  }
  
  // Handle successful actions
  if (typedAction.type?.endsWith('/fulfilled')) {
    // Show success messages for certain actions
    if (typedAction.type.includes('updateProfile')) {
      message.success('个人信息更新成功')
    } else if (typedAction.type.includes('changePassword')) {
      message.success('密码修改成功')
    } else if (typedAction.type.includes('register')) {
      message.success('注册成功，请登录')
    }
  }
  
  return next(action)
}
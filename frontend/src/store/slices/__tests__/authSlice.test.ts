import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import authSlice, { 
  loginAsync, 
  registerAsync, 
  getCurrentUserAsync, 
  updateProfileAsync,
  changePasswordAsync,
  logout,
  clearError 
} from '../authSlice'
import * as authService from '../../services/authService'

// Mock the auth service
vi.mock('../../services/authService')
const mockedAuthService = vi.mocked(authService)

describe('authSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth
      expect(state).toEqual({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      })
    })
  })

  describe('synchronous actions', () => {
    it('should handle logout', () => {
      // First set some state
      store.dispatch({
        type: 'auth/loginAsync/fulfilled',
        payload: {
          user: { userId: 1, username: 'test' },
          token: 'test-token',
        },
      })

      // Then logout
      store.dispatch(logout())
      
      const state = store.getState().auth
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle clearError', () => {
      // First set an error
      store.dispatch({
        type: 'auth/loginAsync/rejected',
        payload: 'Test error',
      })

      // Then clear error
      store.dispatch(clearError())
      
      const state = store.getState().auth
      expect(state.error).toBeNull()
    })
  })

  describe('loginAsync', () => {
    const mockCredentials = { username: 'testuser', password: 'password123' }
    const mockResponse = {
      user: { userId: 1, username: 'testuser', email: 'test@example.com', role: 'STUDENT' },
      token: 'mock-jwt-token',
    }

    it('should handle successful login', async () => {
      mockedAuthService.login.mockResolvedValue(mockResponse)

      await store.dispatch(loginAsync(mockCredentials))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockResponse.user)
      expect(state.token).toBe(mockResponse.token)
      expect(state.error).toBeNull()
    })

    it('should handle login failure', async () => {
      const errorMessage = '用户名或密码错误'
      mockedAuthService.login.mockRejectedValue(new Error(errorMessage))

      await store.dispatch(loginAsync(mockCredentials))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.error).toBe(errorMessage)
    })

    it('should set loading state during login', () => {
      mockedAuthService.login.mockImplementation(() => new Promise(() => {})) // Never resolves

      store.dispatch(loginAsync(mockCredentials))
      
      const state = store.getState().auth
      expect(state.loading).toBe(true)
    })
  })

  describe('registerAsync', () => {
    const mockRegisterData = {
      username: 'newuser',
      password: 'password123',
      confirmPassword: 'password123',
      email: 'new@example.com',
      role: 'STUDENT' as const,
    }
    const mockResponse = { userId: 1, username: 'newuser' }

    it('should handle successful registration', async () => {
      mockedAuthService.register.mockResolvedValue(mockResponse)

      await store.dispatch(registerAsync(mockRegisterData))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle registration failure', async () => {
      const errorMessage = '用户名已存在'
      mockedAuthService.register.mockRejectedValue(new Error(errorMessage))

      await store.dispatch(registerAsync(mockRegisterData))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('getCurrentUserAsync', () => {
    const mockUser = {
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'STUDENT' as const,
      avatarUrl: 'https://example.com/avatar.jpg',
    }

    it('should handle successful user fetch', async () => {
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser)

      await store.dispatch(getCurrentUserAsync())
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should handle user fetch failure', async () => {
      const errorMessage = '认证信息无效'
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error(errorMessage))

      await store.dispatch(getCurrentUserAsync())
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('updateProfileAsync', () => {
    const mockUpdateData = {
      email: 'updated@example.com',
      avatarUrl: 'https://example.com/new-avatar.jpg',
    }
    const mockUpdatedUser = {
      userId: 1,
      username: 'testuser',
      email: 'updated@example.com',
      role: 'STUDENT' as const,
      avatarUrl: 'https://example.com/new-avatar.jpg',
    }

    beforeEach(() => {
      // Set initial authenticated state
      store.dispatch({
        type: 'auth/loginAsync/fulfilled',
        payload: {
          user: { userId: 1, username: 'testuser', email: 'test@example.com', role: 'STUDENT' },
          token: 'test-token',
        },
      })
    })

    it('should handle successful profile update', async () => {
      mockedAuthService.updateProfile.mockResolvedValue(mockUpdatedUser)

      await store.dispatch(updateProfileAsync(mockUpdateData))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.user).toEqual(mockUpdatedUser)
      expect(state.error).toBeNull()
    })

    it('should handle profile update failure', async () => {
      const errorMessage = '邮箱已被使用'
      mockedAuthService.updateProfile.mockRejectedValue(new Error(errorMessage))

      await store.dispatch(updateProfileAsync(mockUpdateData))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('changePasswordAsync', () => {
    const mockPasswordData = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword123',
      confirmNewPassword: 'newPassword123',
    }

    beforeEach(() => {
      // Set initial authenticated state
      store.dispatch({
        type: 'auth/loginAsync/fulfilled',
        payload: {
          user: { userId: 1, username: 'testuser' },
          token: 'test-token',
        },
      })
    })

    it('should handle successful password change', async () => {
      mockedAuthService.changePassword.mockResolvedValue(undefined)

      await store.dispatch(changePasswordAsync(mockPasswordData))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle password change failure', async () => {
      const errorMessage = '当前密码错误'
      mockedAuthService.changePassword.mockRejectedValue(new Error(errorMessage))

      await store.dispatch(changePasswordAsync(mockPasswordData))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })
})
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as authService from '../authService'
import api from '../api'

// Mock the API module
vi.mock('../api')
const mockedApi = vi.mocked(api)

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    const mockCredentials = { username: 'testuser', password: 'password123' }
    const mockResponse = {
      data: {
        success: true,
        data: {
          accessToken: 'mock-jwt-token',
          tokenType: 'Bearer',
          user: {
            userId: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'STUDENT',
          },
        },
      },
    }

    it('should login successfully', async () => {
      mockedApi.post.mockResolvedValue(mockResponse)

      const result = await authService.login(mockCredentials)

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', mockCredentials)
      expect(result).toEqual({
        user: mockResponse.data.data.user,
        token: mockResponse.data.data.accessToken,
      })
    })

    it('should handle login error', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            message: '用户名或密码错误',
          },
        },
      }
      mockedApi.post.mockRejectedValue(errorResponse)

      await expect(authService.login(mockCredentials)).rejects.toThrow('用户名或密码错误')
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', mockCredentials)
    })

    it('should handle network error', async () => {
      mockedApi.post.mockRejectedValue(new Error('Network Error'))

      await expect(authService.login(mockCredentials)).rejects.toThrow('网络错误，请检查网络连接')
    })
  })

  describe('register', () => {
    const mockRegisterData = {
      username: 'newuser',
      password: 'password123',
      confirmPassword: 'password123',
      email: 'new@example.com',
      role: 'STUDENT' as const,
    }
    const mockResponse = {
      data: {
        success: true,
        data: {
          userId: 1,
          username: 'newuser',
        },
      },
    }

    it('should register successfully', async () => {
      mockedApi.post.mockResolvedValue(mockResponse)

      const result = await authService.register(mockRegisterData)

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', mockRegisterData)
      expect(result).toEqual(mockResponse.data.data)
    })

    it('should handle registration error', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            message: '用户名已存在',
          },
        },
      }
      mockedApi.post.mockRejectedValue(errorResponse)

      await expect(authService.register(mockRegisterData)).rejects.toThrow('用户名已存在')
    })
  })

  describe('getCurrentUser', () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      },
    }

    it('should get current user successfully', async () => {
      mockedApi.get.mockResolvedValue(mockResponse)

      const result = await authService.getCurrentUser()

      expect(mockedApi.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockResponse.data.data)
    })

    it('should handle unauthorized error', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            success: false,
            message: '认证信息无效',
          },
        },
      }
      mockedApi.get.mockRejectedValue(errorResponse)

      await expect(authService.getCurrentUser()).rejects.toThrow('认证信息无效')
    })
  })

  describe('updateProfile', () => {
    const mockUpdateData = {
      email: 'updated@example.com',
      avatarUrl: 'https://example.com/new-avatar.jpg',
    }
    const mockResponse = {
      data: {
        success: true,
        data: {
          userId: 1,
          username: 'testuser',
          email: 'updated@example.com',
          role: 'STUDENT',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
      },
    }

    it('should update profile successfully', async () => {
      mockedApi.put.mockResolvedValue(mockResponse)

      const result = await authService.updateProfile(mockUpdateData)

      expect(mockedApi.put).toHaveBeenCalledWith('/auth/profile', mockUpdateData)
      expect(result).toEqual(mockResponse.data.data)
    })

    it('should handle update error', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            message: '邮箱已被使用',
          },
        },
      }
      mockedApi.put.mockRejectedValue(errorResponse)

      await expect(authService.updateProfile(mockUpdateData)).rejects.toThrow('邮箱已被使用')
    })
  })

  describe('changePassword', () => {
    const mockPasswordData = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword123',
      confirmNewPassword: 'newPassword123',
    }
    const mockResponse = {
      data: {
        success: true,
        message: '密码修改成功',
      },
    }

    it('should change password successfully', async () => {
      mockedApi.put.mockResolvedValue(mockResponse)

      await authService.changePassword(mockPasswordData)

      expect(mockedApi.put).toHaveBeenCalledWith('/auth/password', mockPasswordData)
    })

    it('should handle password change error', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            message: '当前密码错误',
          },
        },
      }
      mockedApi.put.mockRejectedValue(errorResponse)

      await expect(authService.changePassword(mockPasswordData)).rejects.toThrow('当前密码错误')
    })
  })

  describe('checkUsernameAvailability', () => {
    it('should check username availability successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: true,
        },
      }
      mockedApi.get.mockResolvedValue(mockResponse)

      const result = await authService.checkUsernameAvailability('newuser')

      expect(mockedApi.get).toHaveBeenCalledWith('/auth/check-username', {
        params: { username: 'newuser' },
      })
      expect(result).toBe(true)
    })
  })

  describe('checkEmailAvailability', () => {
    it('should check email availability successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: false,
        },
      }
      mockedApi.get.mockResolvedValue(mockResponse)

      const result = await authService.checkEmailAvailability('existing@example.com')

      expect(mockedApi.get).toHaveBeenCalledWith('/auth/check-email', {
        params: { email: 'existing@example.com' },
      })
      expect(result).toBe(false)
    })
  })
})
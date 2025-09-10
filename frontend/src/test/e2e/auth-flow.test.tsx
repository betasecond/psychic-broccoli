import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils'
import App from '../../App'
import * as authService from '../../services/authService'

// Mock the auth service
vi.mock('../../services/authService')
const mockedAuthService = vi.mocked(authService)

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

describe('Authentication Flow E2E', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should complete full registration and login flow', async () => {
    // Mock successful registration
    const mockRegisterResponse = {
      userId: 1,
      username: 'newuser',
    }
    mockedAuthService.register.mockResolvedValue(mockRegisterResponse)
    mockedAuthService.checkUsernameAvailability.mockResolvedValue(true)
    mockedAuthService.checkEmailAvailability.mockResolvedValue(true)

    // Mock successful login
    const mockLoginResponse = {
      user: {
        userId: 1,
        username: 'newuser',
        email: 'new@example.com',
        role: 'STUDENT' as const,
      },
      token: 'mock-jwt-token',
    }
    mockedAuthService.login.mockResolvedValue(mockLoginResponse)

    renderWithProviders(<App />)

    // Should start at login page (or redirect to it)
    expect(screen.getByText('用户登录') || screen.getByText('立即注册')).toBeInTheDocument()

    // Navigate to register page
    const registerLink = screen.getByText('立即注册')
    await user.click(registerLink)

    // Fill out registration form
    await waitFor(() => {
      expect(screen.getByText('用户注册')).toBeInTheDocument()
    })

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const emailInput = screen.getByLabelText('邮箱')

    await user.type(usernameInput, 'newuser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.type(emailInput, 'new@example.com')

    // Submit registration
    const registerButton = screen.getByRole('button', { name: '注册' })
    await user.click(registerButton)

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('注册成功！请登录')).toBeInTheDocument()
    })

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Fill out login form
    const loginUsernameInput = screen.getByLabelText('用户名')
    const loginPasswordInput = screen.getByLabelText('密码')

    await user.type(loginUsernameInput, 'newuser')
    await user.type(loginPasswordInput, 'password123')

    // Submit login
    const loginButton = screen.getByRole('button', { name: '登录' })
    await user.click(loginButton)

    // Should redirect to student dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/student/dashboard')
    })

    // Should show user avatar with username
    await waitFor(() => {
      expect(screen.getByText('newuser')).toBeInTheDocument()
    })
  })

  it('should handle login with existing user and logout', async () => {
    // Mock successful login
    const mockLoginResponse = {
      user: {
        userId: 1,
        username: 'existinguser',
        email: 'existing@example.com',
        role: 'INSTRUCTOR' as const,
      },
      token: 'mock-jwt-token',
    }
    mockedAuthService.login.mockResolvedValue(mockLoginResponse)

    renderWithProviders(<App />)

    // Should be at login page
    expect(screen.getByText('用户登录')).toBeInTheDocument()

    // Fill out login form
    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')

    await user.type(usernameInput, 'existinguser')
    await user.type(passwordInput, 'password123')

    // Submit login
    const loginButton = screen.getByRole('button', { name: '登录' })
    await user.click(loginButton)

    // Should redirect to teacher dashboard (instructor role)
    await waitFor(() => {
      expect(window.location.pathname).toBe('/teacher/dashboard')
    })

    // Should show user avatar
    await waitFor(() => {
      expect(screen.getByText('existinguser')).toBeInTheDocument()
    })

    // Click on user avatar to open dropdown
    const avatarButton = screen.getByRole('button')
    await user.click(avatarButton)

    // Should show dropdown menu
    await waitFor(() => {
      expect(screen.getByText('退出登录')).toBeInTheDocument()
    })

    // Click logout
    const logoutButton = screen.getByText('退出登录')
    await user.click(logoutButton)

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument()
    })

    // User avatar should no longer be visible
    expect(screen.queryByText('existinguser')).not.toBeInTheDocument()
  })

  it('should handle authentication errors gracefully', async () => {
    // Mock login failure
    mockedAuthService.login.mockRejectedValue(new Error('用户名或密码错误'))

    renderWithProviders(<App />)

    // Fill out login form with wrong credentials
    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')

    await user.type(usernameInput, 'wronguser')
    await user.type(passwordInput, 'wrongpassword')

    // Submit login
    const loginButton = screen.getByRole('button', { name: '登录' })
    await user.click(loginButton)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
    })

    // Should remain on login page
    expect(screen.getByText('用户登录')).toBeInTheDocument()
  })

  it('should handle registration errors gracefully', async () => {
    // Mock registration failure
    mockedAuthService.register.mockRejectedValue(new Error('用户名已存在'))
    mockedAuthService.checkUsernameAvailability.mockResolvedValue(true)
    mockedAuthService.checkEmailAvailability.mockResolvedValue(true)

    renderWithProviders(<App />)

    // Navigate to register page
    const registerLink = screen.getByText('立即注册')
    await user.click(registerLink)

    // Fill out registration form
    await waitFor(() => {
      expect(screen.getByText('用户注册')).toBeInTheDocument()
    })

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const emailInput = screen.getByLabelText('邮箱')

    await user.type(usernameInput, 'existinguser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.type(emailInput, 'existing@example.com')

    // Submit registration
    const registerButton = screen.getByRole('button', { name: '注册' })
    await user.click(registerButton)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('用户名已存在')).toBeInTheDocument()
    })

    // Should remain on register page
    expect(screen.getByText('用户注册')).toBeInTheDocument()
  })

  it('should persist authentication state across page reloads', async () => {
    // Mock token in localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-jwt-token'
      if (key === 'user') return JSON.stringify({
        userId: 1,
        username: 'persisteduser',
        email: 'persisted@example.com',
        role: 'STUDENT',
      })
      return null
    })

    // Mock getCurrentUser to return user data
    const mockUser = {
      userId: 1,
      username: 'persisteduser',
      email: 'persisted@example.com',
      role: 'STUDENT' as const,
    }
    mockedAuthService.getCurrentUser.mockResolvedValue(mockUser)

    renderWithProviders(<App />)

    // Should automatically authenticate and show user avatar
    await waitFor(() => {
      expect(screen.getByText('persisteduser')).toBeInTheDocument()
    })

    // Should be on appropriate dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/student/dashboard')
    })
  })

  it('should handle token expiration and redirect to login', async () => {
    // Mock expired token scenario
    mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Token expired'))

    // Mock token in localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'expired-jwt-token'
      return null
    })

    renderWithProviders(<App />)

    // Should redirect to login page due to expired token
    await waitFor(() => {
      expect(screen.getByText('用户登录')).toBeInTheDocument()
    })

    // Token should be removed from localStorage
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
  })
})
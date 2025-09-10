import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import LoginPage from '../LoginPage'
import * as authService from '../../services/authService'

// Mock the auth service
vi.mock('../../services/authService')
const mockedAuthService = vi.mocked(authService)

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  }
})

describe('LoginPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('should render login form', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByText('用户登录')).toBeInTheDocument()
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(screen.getByText('还没有账号？')).toBeInTheDocument()
    expect(screen.getByText('立即注册')).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginPage />)

    const loginButton = screen.getByRole('button', { name: '登录' })
    await user.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument()
      expect(screen.getByText('请输入密码')).toBeInTheDocument()
    })
  })

  it('should show validation error for short password', async () => {
    renderWithProviders(<LoginPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const loginButton = screen.getByRole('button', { name: '登录' })

    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, '123')
    await user.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('密码长度不能少于6位')).toBeInTheDocument()
    })
  })

  it('should handle successful login', async () => {
    const mockLoginResponse = {
      user: {
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'STUDENT' as const,
      },
      token: 'mock-jwt-token',
    }

    mockedAuthService.login.mockResolvedValue(mockLoginResponse)

    renderWithProviders(<LoginPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const loginButton = screen.getByRole('button', { name: '登录' })

    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    await user.click(loginButton)

    await waitFor(() => {
      expect(mockedAuthService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      })
    })

    // Should navigate based on user role
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/student/dashboard')
    })
  })

  it('should handle login failure', async () => {
    mockedAuthService.login.mockRejectedValue(new Error('用户名或密码错误'))

    renderWithProviders(<LoginPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const loginButton = screen.getByRole('button', { name: '登录' })

    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should navigate to correct dashboard based on user role', async () => {
    const testCases = [
      { role: 'STUDENT', expectedPath: '/student/dashboard' },
      { role: 'INSTRUCTOR', expectedPath: '/teacher/dashboard' },
      { role: 'ADMIN', expectedPath: '/admin/dashboard' },
    ]

    for (const { role, expectedPath } of testCases) {
      mockNavigate.mockClear()
      
      const mockLoginResponse = {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: role as any,
        },
        token: 'mock-jwt-token',
      }

      mockedAuthService.login.mockResolvedValue(mockLoginResponse)

      renderWithProviders(<LoginPage />)

      const usernameInput = screen.getByLabelText('用户名')
      const passwordInput = screen.getByLabelText('密码')
      const loginButton = screen.getByRole('button', { name: '登录' })

      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath)
      })
    }
  })

  it('should show loading state during login', async () => {
    // Mock a delayed response
    mockedAuthService.login.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    renderWithProviders(<LoginPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const loginButton = screen.getByRole('button', { name: '登录' })

    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    await user.click(loginButton)

    // Should show loading state
    expect(screen.getByRole('button', { name: '登录中...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录中...' })).toBeDisabled()
  })

  it('should clear error when user starts typing', async () => {
    mockedAuthService.login.mockRejectedValue(new Error('用户名或密码错误'))

    renderWithProviders(<LoginPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const loginButton = screen.getByRole('button', { name: '登录' })

    // First, trigger an error
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
    })

    // Then start typing again
    await user.clear(usernameInput)
    await user.type(usernameInput, 'newuser')

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('用户名或密码错误')).not.toBeInTheDocument()
    })
  })

  it('should handle Enter key press to submit form', async () => {
    const mockLoginResponse = {
      user: {
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'STUDENT' as const,
      },
      token: 'mock-jwt-token',
    }

    mockedAuthService.login.mockResolvedValue(mockLoginResponse)

    renderWithProviders(<LoginPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')

    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    
    // Press Enter on password field
    fireEvent.keyPress(passwordInput, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => {
      expect(mockedAuthService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      })
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import RegisterPage from '../RegisterPage'
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

describe('RegisterPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('should render register form', () => {
    renderWithProviders(<RegisterPage />)

    expect(screen.getByText('用户注册')).toBeInTheDocument()
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument()
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument()
    expect(screen.getByLabelText('角色')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument()
    expect(screen.getByText('已有账号？')).toBeInTheDocument()
    expect(screen.getByText('立即登录')).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<RegisterPage />)

    const registerButton = screen.getByRole('button', { name: '注册' })
    await user.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument()
      expect(screen.getByText('请输入密码')).toBeInTheDocument()
      expect(screen.getByText('请确认密码')).toBeInTheDocument()
      expect(screen.getByText('请输入邮箱')).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email', async () => {
    renderWithProviders(<RegisterPage />)

    const emailInput = screen.getByLabelText('邮箱')
    const registerButton = screen.getByRole('button', { name: '注册' })

    await user.type(emailInput, 'invalid-email')
    await user.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument()
    })
  })

  it('should show validation error for short password', async () => {
    renderWithProviders(<RegisterPage />)

    const passwordInput = screen.getByLabelText('密码')
    const registerButton = screen.getByRole('button', { name: '注册' })

    await user.type(passwordInput, '123')
    await user.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText('密码长度不能少于6位')).toBeInTheDocument()
    })
  })

  it('should show validation error for mismatched passwords', async () => {
    renderWithProviders(<RegisterPage />)

    const passwordInput = screen.getByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const registerButton = screen.getByRole('button', { name: '注册' })

    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password456')
    await user.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText('两次密码输入不一致')).toBeInTheDocument()
    })
  })

  it('should handle successful registration', async () => {
    const mockRegisterResponse = {
      userId: 1,
      username: 'newuser',
    }

    mockedAuthService.register.mockResolvedValue(mockRegisterResponse)

    renderWithProviders(<RegisterPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const emailInput = screen.getByLabelText('邮箱')
    const registerButton = screen.getByRole('button', { name: '注册' })

    await user.type(usernameInput, 'newuser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.type(emailInput, 'new@example.com')
    await user.click(registerButton)

    await waitFor(() => {
      expect(mockedAuthService.register).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
        email: 'new@example.com',
        role: 'STUDENT', // Default role
      })
    })

    // Should show success message and navigate to login
    await waitFor(() => {
      expect(screen.getByText('注册成功！请登录')).toBeInTheDocument()
    })

    // Should navigate to login page after delay
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    }, { timeout: 3000 })
  })

  it('should handle registration failure', async () => {
    mockedAuthService.register.mockRejectedValue(new Error('用户名已存在'))

    renderWithProviders(<RegisterPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const emailInput = screen.getByLabelText('邮箱')
    const registerButton = screen.getByRole('button', { name: '注册' })

    await user.type(usernameInput, 'existinguser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.type(emailInput, 'existing@example.com')
    await user.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText('用户名已存在')).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should allow role selection', async () => {
    renderWithProviders(<RegisterPage />)

    const roleSelect = screen.getByLabelText('角色')
    
    // Click to open dropdown
    await user.click(roleSelect)
    
    // Should show role options
    await waitFor(() => {
      expect(screen.getByText('学生')).toBeInTheDocument()
      expect(screen.getByText('教师')).toBeInTheDocument()
    })

    // Select teacher role
    await user.click(screen.getByText('教师'))

    // Verify selection
    expect(roleSelect).toHaveValue('INSTRUCTOR')
  })

  it('should check username availability', async () => {
    mockedAuthService.checkUsernameAvailability.mockResolvedValue(false)

    renderWithProviders(<RegisterPage />)

    const usernameInput = screen.getByLabelText('用户名')
    
    await user.type(usernameInput, 'existinguser')
    
    // Trigger blur event to check availability
    await user.tab()

    await waitFor(() => {
      expect(mockedAuthService.checkUsernameAvailability).toHaveBeenCalledWith('existinguser')
    })

    await waitFor(() => {
      expect(screen.getByText('用户名已存在')).toBeInTheDocument()
    })
  })

  it('should check email availability', async () => {
    mockedAuthService.checkEmailAvailability.mockResolvedValue(false)

    renderWithProviders(<RegisterPage />)

    const emailInput = screen.getByLabelText('邮箱')
    
    await user.type(emailInput, 'existing@example.com')
    
    // Trigger blur event to check availability
    await user.tab()

    await waitFor(() => {
      expect(mockedAuthService.checkEmailAvailability).toHaveBeenCalledWith('existing@example.com')
    })

    await waitFor(() => {
      expect(screen.getByText('邮箱已被使用')).toBeInTheDocument()
    })
  })

  it('should show loading state during registration', async () => {
    // Mock a delayed response
    mockedAuthService.register.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    renderWithProviders(<RegisterPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const emailInput = screen.getByLabelText('邮箱')
    const registerButton = screen.getByRole('button', { name: '注册' })

    await user.type(usernameInput, 'newuser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.type(emailInput, 'new@example.com')
    await user.click(registerButton)

    // Should show loading state
    expect(screen.getByRole('button', { name: '注册中...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '注册中...' })).toBeDisabled()
  })

  it('should clear error when user starts typing', async () => {
    mockedAuthService.register.mockRejectedValue(new Error('用户名已存在'))

    renderWithProviders(<RegisterPage />)

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const confirmPasswordInput = screen.getByLabelText('确认密码')
    const emailInput = screen.getByLabelText('邮箱')
    const registerButton = screen.getByRole('button', { name: '注册' })

    // First, trigger an error
    await user.type(usernameInput, 'existinguser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.type(emailInput, 'existing@example.com')
    await user.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText('用户名已存在')).toBeInTheDocument()
    })

    // Then start typing again
    await user.clear(usernameInput)
    await user.type(usernameInput, 'newuser')

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('用户名已存在')).not.toBeInTheDocument()
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import UserAvatar from '../UserAvatar'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('UserAvatar', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render user avatar with username when authenticated', () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('should render default avatar when user has no avatar URL', () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
          avatarUrl: null,
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    expect(screen.getByText('testuser')).toBeInTheDocument()
    // Should show default avatar (first letter of username)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('should show dropdown menu when clicked', async () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    const avatarButton = screen.getByRole('button')
    await user.click(avatarButton)

    expect(screen.getByText('个人资料')).toBeInTheDocument()
    expect(screen.getByText('退出登录')).toBeInTheDocument()
  })

  it('should navigate to profile page when profile menu item is clicked', async () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    const avatarButton = screen.getByRole('button')
    await user.click(avatarButton)

    const profileMenuItem = screen.getByText('个人资料')
    await user.click(profileMenuItem)

    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('should handle logout when logout menu item is clicked', async () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    const { store } = renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    const avatarButton = screen.getByRole('button')
    await user.click(avatarButton)

    const logoutMenuItem = screen.getByText('退出登录')
    await user.click(logoutMenuItem)

    // Should dispatch logout action
    const state = store.getState().auth
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()

    // Should navigate to login page
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('should not render when user is not authenticated', () => {
    const unauthenticatedState = {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      },
    }

    const { container } = renderWithProviders(<UserAvatar />, { preloadedState: unauthenticatedState })

    expect(container.firstChild).toBeNull()
  })

  it('should show user role in dropdown', async () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'teacher',
          email: 'teacher@example.com',
          role: 'INSTRUCTOR',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    const avatarButton = screen.getByRole('button')
    await user.click(avatarButton)

    expect(screen.getByText('教师')).toBeInTheDocument()
  })

  it('should handle different user roles correctly', async () => {
    const testCases = [
      { role: 'STUDENT', expectedText: '学生' },
      { role: 'INSTRUCTOR', expectedText: '教师' },
      { role: 'ADMIN', expectedText: '管理员' },
    ]

    for (const { role, expectedText } of testCases) {
      const authenticatedState = {
        auth: {
          user: {
            userId: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: role as any,
          },
          token: 'mock-jwt-token',
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      }

      const { unmount } = renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

      const avatarButton = screen.getByRole('button')
      await user.click(avatarButton)

      expect(screen.getByText(expectedText)).toBeInTheDocument()

      unmount()
    }
  })

  it('should close dropdown when clicking outside', async () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    const avatarButton = screen.getByRole('button')
    await user.click(avatarButton)

    expect(screen.getByText('个人资料')).toBeInTheDocument()

    // Click outside
    fireEvent.click(document.body)

    // Dropdown should be closed (menu items should not be visible)
    expect(screen.queryByText('个人资料')).not.toBeInTheDocument()
  })

  it('should handle avatar image load error', async () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'STUDENT',
          avatarUrl: 'https://example.com/broken-avatar.jpg',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(<UserAvatar />, { preloadedState: authenticatedState })

    const avatarImage = screen.getByRole('img')
    
    // Simulate image load error
    fireEvent.error(avatarImage)

    // Should fallback to default avatar (first letter)
    expect(screen.getByText('T')).toBeInTheDocument()
  })
})
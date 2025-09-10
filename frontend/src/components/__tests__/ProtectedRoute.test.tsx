import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import ProtectedRoute from '../ProtectedRoute'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: any) => <div data-testid="navigate-to">{to}</div>,
  }
})

describe('ProtectedRoute', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when user is authenticated', () => {
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

    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: authenticatedState }
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    const unauthenticatedState = {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: unauthenticatedState }
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login')
  })

  it('should show loading spinner when authentication is loading', () => {
    const loadingState = {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: true,
        error: null,
      },
    }

    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: loadingState }
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument()
  })

  it('should render children when user has required role', () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'INSTRUCTOR',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(
      <ProtectedRoute requiredRole="INSTRUCTOR">
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: authenticatedState }
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument()
  })

  it('should redirect to unauthorized when user does not have required role', () => {
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

    renderWithProviders(
      <ProtectedRoute requiredRole="INSTRUCTOR">
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: authenticatedState }
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/unauthorized')
  })

  it('should allow access when user has one of the required roles', () => {
    const authenticatedState = {
      auth: {
        user: {
          userId: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'INSTRUCTOR',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(
      <ProtectedRoute requiredRoles={['INSTRUCTOR', 'ADMIN']}>
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: authenticatedState }
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument()
  })

  it('should redirect when user does not have any of the required roles', () => {
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

    renderWithProviders(
      <ProtectedRoute requiredRoles={['INSTRUCTOR', 'ADMIN']}>
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: authenticatedState }
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/unauthorized')
  })

  it('should redirect to custom path when specified', () => {
    const unauthenticatedState = {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(
      <ProtectedRoute redirectTo="/custom-login">
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: unauthenticatedState }
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-login')
  })

  it('should handle admin role access', () => {
    const adminState = {
      auth: {
        user: {
          userId: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    }

    renderWithProviders(
      <ProtectedRoute requiredRole="ADMIN">
        <TestComponent />
      </ProtectedRoute>,
      { preloadedState: adminState }
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument()
  })
})
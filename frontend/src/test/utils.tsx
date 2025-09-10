import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import authSlice from '../store/slices/authSlice'

// Create a test store
export const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState,
  })
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any
  store?: ReturnType<typeof createTestStore>
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    )
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}

// Mock user data
export const mockUser = {
  userId: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'STUDENT' as const,
  avatarUrl: 'https://example.com/avatar.jpg',
}

export const mockAuthState = {
  user: mockUser,
  token: 'mock-jwt-token',
  isAuthenticated: true,
  loading: false,
  error: null,
}

// Mock API responses
export const mockLoginResponse = {
  success: true,
  message: '登录成功',
  data: {
    accessToken: 'mock-jwt-token',
    tokenType: 'Bearer',
    user: mockUser,
  },
}

export const mockRegisterResponse = {
  success: true,
  message: '注册成功',
  data: {
    userId: 1,
    username: 'testuser',
  },
}
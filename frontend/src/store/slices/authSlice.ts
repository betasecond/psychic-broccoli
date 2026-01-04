import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { authService } from '../../services/authService'
import { sessionManager } from '../../utils/sessionManager'

// Types
export interface User {
  userId: number
  username: string
  email?: string
  avatarUrl?: string
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
  fullName?: string
  phone?: string
  gender?: string
  bio?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

// Initial state - attempting to load user from session
const initialState: AuthState = {
  user: sessionManager.getUser(),
  token: sessionManager.getToken(),
  isAuthenticated: !!sessionManager.getToken(),
  loading: false,
  error: null,
}

// Async thunks
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (
    credentials: { username: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.login(credentials)

      // 增加安全检查，防止 response 为空导致 TypeError
      if (!response) {
        throw new Error('登录失败：服务器未返回有效数据')
      }
      if (!response.accessToken) {
        throw new Error('登录失败：未获取到访问令牌')
      }

      // Save session using session manager
      sessionManager.saveSession(response.accessToken, response.user)
      return response
    } catch (error: any) {
      // 修复：提取错误信息字符串，而不是直接返回错误对象
      const errorMessage = 
        error.response?.data?.message ||
        error.message ||
        '登录失败，请重试'
      return rejectWithValue(errorMessage)
    }
  }
)

export const registerAsync = createAsyncThunk(
  'auth/register',
  async (
    userData: {
      username: string
      password: string
      confirmPassword: string
      role?: 'STUDENT' | 'INSTRUCTOR'
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.register(userData)
      return response
    } catch (error) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || '注册失败，请重试'
          : '注册失败，请重试'
      return rejectWithValue(errorMessage)
    }
  }
)

export const getCurrentUserAsync = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser()
      return response
    } catch (error) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || '获取用户信息失败'
          : '获取用户信息失败'
      return rejectWithValue(errorMessage)
    }
  }
)

export const updateProfileAsync = createAsyncThunk(
  'auth/updateProfile',
  async (
    profileData: { email?: string; avatarUrl?: string; fullName?: string; phone?: string; gender?: string; bio?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.updateProfile(profileData)
      return response
    } catch (error) {
      const errorMessage = 
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || '更新个人信息失败'
          : '更新个人信息失败'
      return rejectWithValue(errorMessage)
    }
  }
)

export const getUserProfileAsync = createAsyncThunk(
  'auth/getUserProfile',
  async (
    userId: string,
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.getUserProfile(userId)
      return response
    } catch (error) {
      const errorMessage = 
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || '获取用户信息失败'
          : '获取用户信息失败'
      return rejectWithValue(errorMessage)
    }
  }
)

export const changePasswordAsync = createAsyncThunk(
  'auth/changePassword',
  async (
    passwordData: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      await authService.changePassword(passwordData)
      return '密码修改成功'
    } catch (error) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || '密码修改失败'
          : '密码修改失败'
      return rejectWithValue(errorMessage)
    }
  }
)

const logoutAsyncThunk = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      // Call logout service to clean up client-side
      authService.logout()
      // Clear session using session manager
      sessionManager.clearSession()
      return true
    } catch (error) {
      // Even if logout fails, we should clear local state
      sessionManager.clearSession()
      return true
    }
  }
)

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: state => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
    },
    clearError: state => {
      state.error = null
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.error = null
    },
  },
  extraReducers: builder => {
    builder
      // Login
      .addCase(loginAsync.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.accessToken
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(registerAsync.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(registerAsync.fulfilled, state => {
        state.loading = false
        state.error = null
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Get current user
      .addCase(getCurrentUserAsync.pending, state => {
        state.loading = true
      })
      .addCase(getCurrentUserAsync.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(getCurrentUserAsync.rejected, (state, action) => {
        state.loading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = action.payload as string
      })
      // Update profile
      .addCase(updateProfileAsync.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(updateProfileAsync.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.error = null
      })
      .addCase(updateProfileAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Change password
      .addCase(changePasswordAsync.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(changePasswordAsync.fulfilled, state => {
        state.loading = false
        state.error = null
      })
      .addCase(changePasswordAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Logout
      .addCase(logoutAsyncThunk.pending, state => {
        state.loading = true
      })
      .addCase(logoutAsyncThunk.fulfilled, state => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.loading = false
        state.error = null
      })
      .addCase(logoutAsyncThunk.rejected, state => {
        // Even if logout fails, clear local state
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.loading = false
        state.error = null
      })
  },
})

export const { logout, clearError, setCredentials } = authSlice.actions
export const logoutAsync = logoutAsyncThunk
export default authSlice.reducer

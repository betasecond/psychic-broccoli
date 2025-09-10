import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { authService } from '../../services/authService'

// Types
export interface User {
  userId: number
  username: string
  email?: string
  avatarUrl?: string
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
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
      localStorage.setItem('token', response.accessToken)
      return response
    } catch (error) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || '登录失败，请重试'
          : '登录失败，请重试'
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
    profileData: { email?: string; avatarUrl?: string },
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
      localStorage.removeItem('token')
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
        localStorage.removeItem('token')
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
  },
})

export const { logout, clearError, setCredentials } = authSlice.actions
export default authSlice.reducer

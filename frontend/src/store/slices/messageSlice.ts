import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { messageService } from '../../services/messageService'
import type { Message, Notification, Discussion } from '../../services/messageService'

// 消息状态类型
export interface MessageState {
  messages: Message[]
  notifications: Notification[]
  discussions: Discussion[]
  loading: boolean
  error: string | null
}

// 初始状态
const initialState: MessageState = {
  messages: [],
  notifications: [],
  discussions: [],
  loading: false,
  error: null,
}

// 异步thunks

// 获取消息列表
export const fetchMessagesAsync = createAsyncThunk(
  'messages/fetchMessages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messageService.getMessages()
      return response
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.message ||
        error.message ||
        '获取消息列表失败'
      return rejectWithValue(errorMessage)
    }
  }
)

// 标记消息状态
export const markMessageStatusAsync = createAsyncThunk(
  'messages/markMessageStatus',
  async (
    { messageId, status }: { messageId: number; status: 'read' | 'unread' },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await messageService.markMessageStatus(messageId, status)
      // 更新本地状态
      dispatch(fetchMessagesAsync())
      return response
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.message ||
        error.message ||
        '更新消息状态失败'
      return rejectWithValue(errorMessage)
    }
  }
)

// 删除消息
export const deleteMessageAsync = createAsyncThunk(
  'messages/deleteMessage',
  async (
    messageId: number,
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await messageService.deleteMessage(messageId)
      // 更新本地状态
      dispatch(fetchMessagesAsync())
      return response
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.message ||
        error.message ||
        '删除消息失败'
      return rejectWithValue(errorMessage)
    }
  }
)

// 获取通知列表
export const fetchNotificationsAsync = createAsyncThunk(
  'messages/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messageService.getNotifications()
      return response
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.message ||
        error.message ||
        '获取通知列表失败'
      return rejectWithValue(errorMessage)
    }
  }
)

// 获取课程讨论列表
export const fetchDiscussionsAsync = createAsyncThunk(
  'messages/fetchDiscussions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messageService.getDiscussions()
      return response
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.message ||
        error.message ||
        '获取课程讨论列表失败'
      return rejectWithValue(errorMessage)
    }
  }
)

// 消息slice
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // 获取消息列表
    builder
      .addCase(fetchMessagesAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMessagesAsync.fulfilled, (state, action: PayloadAction<Message[]>) => {
        state.loading = false
        state.messages = action.payload
      })
      .addCase(fetchMessagesAsync.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload
      })

    // 标记消息状态
    builder
      .addCase(markMessageStatusAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(markMessageStatusAsync.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(markMessageStatusAsync.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload
      })

    // 删除消息
    builder
      .addCase(deleteMessageAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteMessageAsync.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(deleteMessageAsync.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload
      })

    // 获取通知列表
    builder
      .addCase(fetchNotificationsAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNotificationsAsync.fulfilled, (state, action: PayloadAction<Notification[]>) => {
        state.loading = false
        state.notifications = action.payload
      })
      .addCase(fetchNotificationsAsync.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload
      })

    // 获取课程讨论列表
    builder
      .addCase(fetchDiscussionsAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDiscussionsAsync.fulfilled, (state, action: PayloadAction<Discussion[]>) => {
        state.loading = false
        state.discussions = action.payload
      })
      .addCase(fetchDiscussionsAsync.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

// 导出reducer和actions
export const { clearError } = messageSlice.actions
export default messageSlice.reducer
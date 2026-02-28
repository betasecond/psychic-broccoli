import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { assignmentService } from '../../services'
import type {
  Assignment,
  AssignmentSubmission,
  AssignmentStatistics,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  SubmitAssignmentRequest,
  GradeAssignmentRequest,
} from '../../services'

// State 类型
interface AssignmentState {
  assignments: Assignment[]
  myAssignments: Assignment[]
  currentAssignment: Assignment | null
  submissions: AssignmentSubmission[]
  currentSubmission: AssignmentSubmission | null
  statistics: AssignmentStatistics | null
  loading: boolean
  error: string | null
}

// 初始状态
const initialState: AssignmentState = {
  assignments: [],
  myAssignments: [],
  currentAssignment: null,
  submissions: [],
  currentSubmission: null,
  statistics: null,
  loading: false,
  error: null,
}

// Async Thunks
export const fetchAssignments = createAsyncThunk(
  'assignment/fetchAssignments',
  async (params?: { courseId?: number; page?: number; pageSize?: number }) => {
    const response = await assignmentService.getAssignments(params)
    return ((response as any)?.assignments ?? []) as Assignment[]
  }
)

export const fetchMyAssignments = createAsyncThunk(
  'assignment/fetchMyAssignments',
  async () => {
    const response = await assignmentService.getMyAssignments()
    return ((response as any)?.assignments ?? []) as Assignment[]
  }
)

export const fetchAssignment = createAsyncThunk(
  'assignment/fetchAssignment',
  async (id: number) => {
    const response = await assignmentService.getAssignment(id)
    return response as unknown as Assignment
  }
)

export const createAssignment = createAsyncThunk(
  'assignment/createAssignment',
  async (data: CreateAssignmentRequest) => {
    const response = await assignmentService.createAssignment(data)
    return response.data
  }
)

export const updateAssignment = createAsyncThunk(
  'assignment/updateAssignment',
  async ({ id, data }: { id: number; data: UpdateAssignmentRequest }) => {
    await assignmentService.updateAssignment(id, data)
    return id
  }
)

export const deleteAssignment = createAsyncThunk(
  'assignment/deleteAssignment',
  async (id: number) => {
    await assignmentService.deleteAssignment(id)
    return id
  }
)

export const submitAssignment = createAsyncThunk(
  'assignment/submitAssignment',
  async ({ id, data }: { id: number; data: SubmitAssignmentRequest }) => {
    await assignmentService.submitAssignment(id, data)
    return id
  }
)

export const fetchSubmissions = createAsyncThunk(
  'assignment/fetchSubmissions',
  async (params?: { assignmentId?: number; studentId?: number }) => {
    const response = await assignmentService.getSubmissions(params)
    return (response as unknown as AssignmentSubmission[]) ?? []
  }
)

export const fetchSubmissionDetail = createAsyncThunk(
  'assignment/fetchSubmissionDetail',
  async (id: number) => {
    const response = await assignmentService.getSubmissionDetail(id)
    return response as unknown as AssignmentSubmission
  }
)

export const gradeSubmission = createAsyncThunk(
  'assignment/gradeSubmission',
  async ({ id, data }: { id: number; data: GradeAssignmentRequest }) => {
    await assignmentService.gradeSubmission(id, data)
    return { id, ...data }
  }
)

export const fetchStatistics = createAsyncThunk(
  'assignment/fetchStatistics',
  async (id: number) => {
    const response = await assignmentService.getAssignmentStatistics(id)
    return response as unknown as AssignmentStatistics
  }
)

// Slice
const assignmentSlice = createSlice({
  name: 'assignment',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null
    },
    clearCurrentAssignment: state => {
      state.currentAssignment = null
    },
    clearCurrentSubmission: state => {
      state.currentSubmission = null
    },
  },
  extraReducers: builder => {
    builder
      // fetchAssignments
      .addCase(fetchAssignments.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAssignments.fulfilled, (state, action: PayloadAction<Assignment[]>) => {
        state.loading = false
        state.assignments = action.payload
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取作业列表失败'
      })

      // fetchMyAssignments
      .addCase(fetchMyAssignments.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyAssignments.fulfilled, (state, action: PayloadAction<Assignment[]>) => {
        state.loading = false
        state.myAssignments = action.payload
      })
      .addCase(fetchMyAssignments.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取我的作业失败'
      })

      // fetchAssignment
      .addCase(fetchAssignment.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAssignment.fulfilled, (state, action: PayloadAction<Assignment>) => {
        state.loading = false
        state.currentAssignment = action.payload
      })
      .addCase(fetchAssignment.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取作业详情失败'
      })

      // createAssignment
      .addCase(createAssignment.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(createAssignment.fulfilled, state => {
        state.loading = false
      })
      .addCase(createAssignment.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '创建作业失败'
      })

      // updateAssignment
      .addCase(updateAssignment.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(updateAssignment.fulfilled, state => {
        state.loading = false
      })
      .addCase(updateAssignment.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '更新作业失败'
      })

      // deleteAssignment
      .addCase(deleteAssignment.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteAssignment.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false
        state.assignments = state.assignments.filter(a => a.id !== action.payload)
      })
      .addCase(deleteAssignment.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '删除作业失败'
      })

      // submitAssignment
      .addCase(submitAssignment.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(submitAssignment.fulfilled, state => {
        state.loading = false
      })
      .addCase(submitAssignment.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '提交作业失败'
      })

      // fetchSubmissions
      .addCase(fetchSubmissions.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSubmissions.fulfilled, (state, action: PayloadAction<AssignmentSubmission[]>) => {
        state.loading = false
        state.submissions = action.payload
      })
      .addCase(fetchSubmissions.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取提交列表失败'
      })

      // fetchSubmissionDetail
      .addCase(fetchSubmissionDetail.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSubmissionDetail.fulfilled, (state, action: PayloadAction<AssignmentSubmission>) => {
        state.loading = false
        state.currentSubmission = action.payload
      })
      .addCase(fetchSubmissionDetail.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取提交详情失败'
      })

      // gradeSubmission
      .addCase(gradeSubmission.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(gradeSubmission.fulfilled, state => {
        state.loading = false
      })
      .addCase(gradeSubmission.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '批改作业失败'
      })

      // fetchStatistics
      .addCase(fetchStatistics.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStatistics.fulfilled, (state, action: PayloadAction<AssignmentStatistics>) => {
        state.loading = false
        state.statistics = action.payload
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取统计信息失败'
      })
  },
})

export const { clearError, clearCurrentAssignment, clearCurrentSubmission } = assignmentSlice.actions

export default assignmentSlice.reducer


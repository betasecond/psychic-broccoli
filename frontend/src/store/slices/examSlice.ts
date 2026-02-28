import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { examService } from '../../services'
import type {
  Exam,
  ExamQuestion,
  ExamSubmission,
  ExamStatistics,
  CreateExamRequest,
  UpdateExamRequest,
  AddQuestionRequest,
  SubmitExamRequest,
} from '../../services'

// State 类型
interface ExamState {
  exams: Exam[]
  myExams: Exam[]
  currentExam: Exam | null
  questions: ExamQuestion[]
  results: ExamSubmission[]
  mySubmission: ExamSubmission | null
  currentSubmission: ExamSubmission | null
  statistics: ExamStatistics | null
  loading: boolean
  error: string | null
}

// 初始状态
const initialState: ExamState = {
  exams: [],
  myExams: [],
  currentExam: null,
  questions: [],
  results: [],
  mySubmission: null,
  currentSubmission: null,
  statistics: null,
  loading: false,
  error: null,
}

// Async Thunks
export const fetchExams = createAsyncThunk(
  'exam/fetchExams',
  async (params?: { courseId?: number; page?: number; pageSize?: number }) => {
    const response = await examService.getExams(params)
    return ((response as any)?.exams ?? []) as Exam[]
  }
)

export const fetchMyExams = createAsyncThunk(
  'exam/fetchMyExams',
  async () => {
    const response = await examService.getMyExams()
    return ((response as any)?.exams ?? []) as Exam[]
  }
)

export const fetchExam = createAsyncThunk(
  'exam/fetchExam',
  async (id: number) => {
    const response = await examService.getExam(id)
    return response as any as { exam: Exam; questions: ExamQuestion[] }
  }
)

export const createExam = createAsyncThunk(
  'exam/createExam',
  async (data: CreateExamRequest) => {
    const response = await examService.createExam(data)
    return response.data
  }
)

export const updateExam = createAsyncThunk(
  'exam/updateExam',
  async ({ id, data }: { id: number; data: UpdateExamRequest }) => {
    await examService.updateExam(id, data)
    return id
  }
)

export const deleteExam = createAsyncThunk(
  'exam/deleteExam',
  async (id: number) => {
    await examService.deleteExam(id)
    return id
  }
)

export const addQuestion = createAsyncThunk(
  'exam/addQuestion',
  async ({ examId, data }: { examId: number; data: AddQuestionRequest }) => {
    const response = await examService.addQuestion(examId, data)
    return response.data
  }
)

export const updateQuestion = createAsyncThunk(
  'exam/updateQuestion',
  async ({ examId, questionId, data }: { examId: number; questionId: number; data: AddQuestionRequest }) => {
    await examService.updateQuestion(examId, questionId, data)
    return questionId
  }
)

export const deleteQuestion = createAsyncThunk(
  'exam/deleteQuestion',
  async ({ examId, questionId }: { examId: number; questionId: number }) => {
    await examService.deleteQuestion(examId, questionId)
    return questionId
  }
)

export const submitExam = createAsyncThunk(
  'exam/submitExam',
  async ({ id, data }: { id: number; data: SubmitExamRequest }) => {
    const response = await examService.submitExam(id, data)
    return response as any
  }
)

export const fetchResults = createAsyncThunk(
  'exam/fetchResults',
  async (id: number) => {
    const response = await examService.getExamResults(id)
    return (Array.isArray(response) ? response : (response as any)?.data ?? []) as ExamSubmission[]
  }
)

export const fetchMySubmission = createAsyncThunk(
  'exam/fetchMySubmission',
  async (examId: number) => {
    const response = await examService.getMySubmission(examId)
    return response as any as ExamSubmission
  }
)

export const fetchSubmissionDetail = createAsyncThunk(
  'exam/fetchSubmissionDetail',
  async (id: number) => {
    const response = await examService.getSubmissionDetail(id)
    return response as any as ExamSubmission
  }
)

export const fetchStatistics = createAsyncThunk(
  'exam/fetchStatistics',
  async (id: number) => {
    const response = await examService.getExamStatistics(id)
    return response as any as ExamStatistics
  }
)

// Slice
const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null
    },
    clearCurrentExam: state => {
      state.currentExam = null
      state.questions = []
    },
    clearMySubmission: state => {
      state.mySubmission = null
    },
    clearCurrentSubmission: state => {
      state.currentSubmission = null
    },
  },
  extraReducers: builder => {
    builder
      // fetchExams
      .addCase(fetchExams.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchExams.fulfilled, (state, action: PayloadAction<Exam[]>) => {
        state.loading = false
        state.exams = action.payload
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取考试列表失败'
      })

      // fetchMyExams
      .addCase(fetchMyExams.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyExams.fulfilled, (state, action: PayloadAction<Exam[]>) => {
        state.loading = false
        state.myExams = action.payload
      })
      .addCase(fetchMyExams.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取我的考试失败'
      })

      // fetchExam
      .addCase(fetchExam.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchExam.fulfilled, (state, action: PayloadAction<{ exam: Exam; questions: ExamQuestion[] }>) => {
        state.loading = false
        state.currentExam = action.payload.exam
        state.questions = action.payload.questions
      })
      .addCase(fetchExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取考试详情失败'
      })

      // createExam
      .addCase(createExam.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(createExam.fulfilled, state => {
        state.loading = false
      })
      .addCase(createExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '创建考试失败'
      })

      // updateExam
      .addCase(updateExam.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(updateExam.fulfilled, state => {
        state.loading = false
      })
      .addCase(updateExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '更新考试失败'
      })

      // deleteExam
      .addCase(deleteExam.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteExam.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false
        state.exams = state.exams.filter(e => e.id !== action.payload)
      })
      .addCase(deleteExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '删除考试失败'
      })

      // addQuestion
      .addCase(addQuestion.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(addQuestion.fulfilled, state => {
        state.loading = false
      })
      .addCase(addQuestion.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '添加题目失败'
      })

      // updateQuestion
      .addCase(updateQuestion.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(updateQuestion.fulfilled, state => {
        state.loading = false
      })
      .addCase(updateQuestion.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '更新题目失败'
      })

      // deleteQuestion
      .addCase(deleteQuestion.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteQuestion.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false
        state.questions = state.questions.filter(q => q.id !== action.payload)
      })
      .addCase(deleteQuestion.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '删除题目失败'
      })

      // submitExam
      .addCase(submitExam.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(submitExam.fulfilled, state => {
        state.loading = false
      })
      .addCase(submitExam.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '提交答卷失败'
      })

      // fetchResults
      .addCase(fetchResults.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchResults.fulfilled, (state, action: PayloadAction<ExamSubmission[]>) => {
        state.loading = false
        state.results = action.payload
      })
      .addCase(fetchResults.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取成绩列表失败'
      })

      // fetchMySubmission
      .addCase(fetchMySubmission.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMySubmission.fulfilled, (state, action: PayloadAction<ExamSubmission>) => {
        state.loading = false
        state.mySubmission = action.payload
      })
      .addCase(fetchMySubmission.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取答卷失败'
      })

      // fetchSubmissionDetail
      .addCase(fetchSubmissionDetail.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSubmissionDetail.fulfilled, (state, action: PayloadAction<ExamSubmission>) => {
        state.loading = false
        state.currentSubmission = action.payload
      })
      .addCase(fetchSubmissionDetail.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取答卷详情失败'
      })

      // fetchStatistics
      .addCase(fetchStatistics.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStatistics.fulfilled, (state, action: PayloadAction<ExamStatistics>) => {
        state.loading = false
        state.statistics = action.payload
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取统计信息失败'
      })
  },
})

export const { clearError, clearCurrentExam, clearMySubmission, clearCurrentSubmission } = examSlice.actions

export default examSlice.reducer


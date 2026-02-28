import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { courseService } from '../../services'
import type {
  Course,
  CourseChapter,
  CourseStatistics,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateChapterRequest,
  UpdateChapterRequest,
} from '../../services'

// State 类型
interface CourseState {
  courses: Course[]
  myCourses: Course[]
  currentCourse: Course | null
  chapters: CourseChapter[]
  statistics: CourseStatistics | null
  loading: boolean
  error: string | null
}

// 初始状态
const initialState: CourseState = {
  courses: [],
  myCourses: [],
  currentCourse: null,
  chapters: [],
  statistics: null,
  loading: false,
  error: null,
}

// Async Thunks
export const fetchCourses = createAsyncThunk(
  'course/fetchCourses',
  async (params?: { categoryId?: number; page?: number; pageSize?: number }) => {
    const response = await courseService.getCourses(params)
    return response.courses
  }
)

export const fetchMyCourses = createAsyncThunk(
  'course/fetchMyCourses',
  async () => {
    const response = await courseService.getMyCourses()
    return response.courses
  }
)

export const fetchCourse = createAsyncThunk(
  'course/fetchCourse',
  async (id: number) => {
    const response = await courseService.getCourse(id)
    return response
  }
)

export const createCourse = createAsyncThunk(
  'course/createCourse',
  async (data: CreateCourseRequest) => {
    const response = await courseService.createCourse(data)
    return response
  }
)

export const updateCourse = createAsyncThunk(
  'course/updateCourse',
  async ({ id, data }: { id: number; data: UpdateCourseRequest }) => {
    await courseService.updateCourse(id, data)
    return id
  }
)

export const deleteCourse = createAsyncThunk(
  'course/deleteCourse',
  async (id: number) => {
    await courseService.deleteCourse(id)
    return id
  }
)

export const enrollCourse = createAsyncThunk(
  'course/enrollCourse',
  async (id: number) => {
    await courseService.enrollCourse(id)
    return id
  }
)

export const fetchChapters = createAsyncThunk(
  'course/fetchChapters',
  async (courseId: number) => {
    const response = await courseService.getChapters(courseId)
    // 处理不同的响应格式
    return Array.isArray(response) ? response : response.chapters
  }
)

export const createChapter = createAsyncThunk(
  'course/createChapter',
  async ({ courseId, data }: { courseId: number; data: CreateChapterRequest }) => {
    const response = await courseService.createChapter(courseId, data)
    return response
  }
)

export const updateChapter = createAsyncThunk(
  'course/updateChapter',
  async ({ courseId, chapterId, data }: { courseId: number; chapterId: number; data: UpdateChapterRequest }) => {
    await courseService.updateChapter(courseId, chapterId, data)
    return chapterId
  }
)

export const deleteChapter = createAsyncThunk(
  'course/deleteChapter',
  async ({ courseId, chapterId }: { courseId: number; chapterId: number }) => {
    await courseService.deleteChapter(courseId, chapterId)
    return chapterId
  }
)

export const fetchStatistics = createAsyncThunk(
  'course/fetchStatistics',
  async (id: number) => {
    const response = await courseService.getCourseStatistics(id)
    return response
  }
)

// Slice
const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null
    },
    clearCurrentCourse: state => {
      state.currentCourse = null
      state.chapters = []
    },
  },
  extraReducers: builder => {
    builder
      // fetchCourses
      .addCase(fetchCourses.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCourses.fulfilled, (state, action: PayloadAction<Course[]>) => {
        state.loading = false
        state.courses = action.payload
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取课程列表失败'
      })

      // fetchMyCourses
      .addCase(fetchMyCourses.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyCourses.fulfilled, (state, action: PayloadAction<Course[]>) => {
        state.loading = false
        state.myCourses = action.payload
      })
      .addCase(fetchMyCourses.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取我的课程失败'
      })

      // fetchCourse
      .addCase(fetchCourse.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCourse.fulfilled, (state, action: PayloadAction<Course>) => {
        state.loading = false
        state.currentCourse = action.payload
      })
      .addCase(fetchCourse.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取课程详情失败'
      })

      // createCourse
      .addCase(createCourse.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(createCourse.fulfilled, state => {
        state.loading = false
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '创建课程失败'
      })

      // updateCourse
      .addCase(updateCourse.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCourse.fulfilled, state => {
        state.loading = false
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '更新课程失败'
      })

      // deleteCourse
      .addCase(deleteCourse.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteCourse.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false
        state.courses = state.courses.filter(c => c.id !== action.payload)
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '删除课程失败'
      })

      // enrollCourse
      .addCase(enrollCourse.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(enrollCourse.fulfilled, state => {
        state.loading = false
      })
      .addCase(enrollCourse.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '选课失败'
      })

      // fetchChapters
      .addCase(fetchChapters.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchChapters.fulfilled, (state, action: PayloadAction<CourseChapter[]>) => {
        state.loading = false
        state.chapters = action.payload
      })
      .addCase(fetchChapters.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取章节列表失败'
      })

      // createChapter
      .addCase(createChapter.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(createChapter.fulfilled, state => {
        state.loading = false
      })
      .addCase(createChapter.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '创建章节失败'
      })

      // updateChapter
      .addCase(updateChapter.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(updateChapter.fulfilled, state => {
        state.loading = false
      })
      .addCase(updateChapter.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '更新章节失败'
      })

      // deleteChapter
      .addCase(deleteChapter.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteChapter.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false
        state.chapters = state.chapters.filter(c => c.id !== action.payload)
      })
      .addCase(deleteChapter.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '删除章节失败'
      })

      // fetchStatistics
      .addCase(fetchStatistics.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStatistics.fulfilled, (state, action: PayloadAction<CourseStatistics>) => {
        state.loading = false
        state.statistics = action.payload
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取统计信息失败'
      })
  },
})

export const { clearError, clearCurrentCourse } = courseSlice.actions

export default courseSlice.reducer


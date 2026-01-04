import { configureStore } from '@reduxjs/toolkit'
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux'
import authReducer from './slices/authSlice'
import assignmentReducer from './slices/assignmentSlice'
import examReducer from './slices/examSlice'
import courseReducer from './slices/courseSlice'
import messageReducer from './slices/messageSlice'
import { authMiddleware } from './middleware/authMiddleware'

// Configure store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    assignment: assignmentReducer,
    exam: examReducer,
    course: courseReducer,
    messages: messageReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(authMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
})

// Types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Auth Selectors
export const selectAuth = (state: RootState) => state.auth
export const selectUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated
export const selectAuthLoading = (state: RootState) => state.auth.loading
export const selectAuthError = (state: RootState) => state.auth.error

// Assignment Selectors
export const selectAssignments = (state: RootState) => state.assignment.assignments
export const selectMyAssignments = (state: RootState) => state.assignment.myAssignments
export const selectCurrentAssignment = (state: RootState) => state.assignment.currentAssignment
export const selectAssignmentSubmissions = (state: RootState) => state.assignment.submissions
export const selectCurrentSubmission = (state: RootState) => state.assignment.currentSubmission
export const selectAssignmentStatistics = (state: RootState) => state.assignment.statistics
export const selectAssignmentLoading = (state: RootState) => state.assignment.loading
export const selectAssignmentError = (state: RootState) => state.assignment.error

// Exam Selectors
export const selectExams = (state: RootState) => state.exam.exams
export const selectMyExams = (state: RootState) => state.exam.myExams
export const selectCurrentExam = (state: RootState) => state.exam.currentExam
export const selectExamQuestions = (state: RootState) => state.exam.questions
export const selectExamResults = (state: RootState) => state.exam.results
export const selectMyExamSubmission = (state: RootState) => state.exam.mySubmission
export const selectCurrentExamSubmission = (state: RootState) => state.exam.currentSubmission
export const selectExamStatistics = (state: RootState) => state.exam.statistics
export const selectExamLoading = (state: RootState) => state.exam.loading
export const selectExamError = (state: RootState) => state.exam.error

// Course Selectors
export const selectCourses = (state: RootState) => state.course.courses
export const selectMyCourses = (state: RootState) => state.course.myCourses
export const selectCurrentCourse = (state: RootState) => state.course.currentCourse
export const selectCourseChapters = (state: RootState) => state.course.chapters
export const selectCourseStatistics = (state: RootState) => state.course.statistics
export const selectCourseLoading = (state: RootState) => state.course.loading
export const selectCourseError = (state: RootState) => state.course.error

// Message Selectors
export const selectMessages = (state: RootState) => state.messages.messages
export const selectNotifications = (state: RootState) => state.messages.notifications
export const selectDiscussions = (state: RootState) => state.messages.discussions
export const selectMessagesLoading = (state: RootState) => state.messages.loading
export const selectMessagesError = (state: RootState) => state.messages.error

// Export all services
export { default as api } from './api'
export { authService } from './authService'
export { assignmentService } from './assignmentService'
export { examService } from './examService'
export { courseService } from './courseService'
export { userService } from './userService'

// Export types
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  OssUploadCredentialsResponse,
} from './authService'

export type {
  Assignment,
  AssignmentSubmission,
  AssignmentStatistics,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  SubmitAssignmentRequest,
  GradeAssignmentRequest,
} from './assignmentService'

export type {
  Exam,
  ExamQuestion,
  ExamSubmission,
  ExamAnswer,
  ExamStatistics,
  CreateExamRequest,
  UpdateExamRequest,
  AddQuestionRequest,
  SubmitExamRequest,
} from './examService'

export type {
  Course,
  CourseChapter,
  CourseStatistics,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateChapterRequest,
  UpdateChapterRequest,
} from './courseService'

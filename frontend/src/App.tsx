import { useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAppSelector } from './store'
import {
  LoginPage,
  RegisterPage,
  ProfilePage,
  // Student pages
  AssignmentsPage,
  AssignmentDetailPage,
  CoursesPage,
  CourseBrowsePage,
  CourseDetailPage,
  ExamsPage,
  ExamDetailPage,
  TakeExamPage,
  LiveClassesPage,
  SchedulePage,
  MessagesPage,
  WatchLivePage,
  DiscussionsPage,
  DiscussionDetailPage,
  // Teacher pages
  TeacherCoursesPage,
  StudentsPage,
  TeacherAssignmentsPage,
  TeacherExamsPage,
  TeacherLiveClassesPage,
  AnalyticsPage,
  LiveManagementPage,
  LiveStreamPage,
  // Teacher sub-pages
  CreateCoursePage,
  CourseEditPage,
  CourseMaterialsPage,
  TeacherCourseViewPage,
  AssignmentsListPage,
  CreateAssignmentPage,
  GradingPage,
  ExamsListPage,
  CreateExamPage,
  ExamResultsPage,
  EditExamPage,
  SubmissionDetailPage,
  // Admin pages
  UsersPage,
  AdminCoursesPage,
  SystemPage,
  AdminAnalyticsPage,
} from './pages'
import { AppLayout, RoleBasedWelcome, ProtectedRoute } from './components'
import ErrorBoundary from './components/ErrorBoundary'
import { PerformanceMonitor } from './utils/performance'
import { ErrorHandler } from './utils/errorHandler'
import './App.css'

// Dashboard components using RoleBasedWelcome
const StudentDashboard = () => <RoleBasedWelcome />
const TeacherDashboard = () => <RoleBasedWelcome />
const AdminDashboard = () => <RoleBasedWelcome />

// 根路径重定向：根据登录状态和角色跳转
const RootRedirect = () => {
  const { token, user } = useAppSelector(state => state.auth)
  if (!token) return <Navigate to="/login" replace />
  switch (user?.role) {
    case 'STUDENT':   return <Navigate to="/student/dashboard" replace />
    case 'INSTRUCTOR': return <Navigate to="/teacher/dashboard" replace />
    case 'ADMIN':     return <Navigate to="/admin/dashboard" replace />
    default:          return <Navigate to="/login" replace />
  }
}

function App() {
  useEffect(() => {
    // 初始化性能监控
    PerformanceMonitor.createPerformanceObserver()
    
    // 页面加载完成后记录性能指标
    const handleLoad = () => {
      setTimeout(() => {
        PerformanceMonitor.logPerformanceMetrics()
      }, 1000)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [])

  const handleGlobalError = (error: Error, errorInfo: any) => {
    ErrorHandler.logError(error, 'Global Error Boundary')
    // 这里可以添加错误上报逻辑
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ConfigProvider locale={zhCN}>
        <Router>
          <div className="app">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Student routes - require STUDENT role */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <StudentDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/courses"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <CoursesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/courses/browse"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <CourseBrowsePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/courses/:id"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <CourseDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/assignments"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <AssignmentsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/assignments/:id"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <AssignmentDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exams"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <ExamsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exams/:id"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <ExamDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exams/:id/take"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <TakeExamPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/live-classes"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <LiveClassesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/schedule"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <SchedulePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/messages"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <MessagesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/live/:id"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <WatchLivePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/discussions"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <DiscussionsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/discussions/:id"
                element={
                  <ProtectedRoute requiredRole="STUDENT">
                    <AppLayout>
                      <DiscussionDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Teacher routes - require INSTRUCTOR role */}
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <TeacherDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/courses"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <TeacherCoursesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/courses/list"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <TeacherCoursesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/courses/create"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <CreateCoursePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/courses/:id/edit"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <CourseEditPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/courses/:id/view"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <TeacherCourseViewPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/courses/materials"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <CourseMaterialsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/students"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <StudentsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/assignments"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <TeacherAssignmentsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/assignments/list"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <AssignmentsListPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/assignments/create"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <CreateAssignmentPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/assignments/grading"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <GradingPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/exams"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <TeacherExamsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/exams/list"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <ExamsListPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/exams/create"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <CreateExamPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/exams/results"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <ExamResultsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/exams/:id/edit"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <EditExamPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/exams/submissions/:id"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <SubmissionDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/live-classes"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <TeacherLiveClassesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/analytics"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <AnalyticsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/live"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <LiveManagementPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/live/:id"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <LiveStreamPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/discussions"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <DiscussionsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/discussions/:id"
                element={
                  <ProtectedRoute requiredRole="INSTRUCTOR">
                    <AppLayout>
                      <DiscussionDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin routes - require ADMIN role */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <AdminDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <UsersPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/students"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <UsersPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/instructors"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <UsersPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/admins"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <UsersPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <AdminCoursesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/system"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <SystemPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/system/config"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <SystemPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/system/logs"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <SystemPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/system/backup"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <SystemPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <AdminAnalyticsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Profile page - available to all authenticated users */}
              <Route
                path="/profile/:userId?"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProfilePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* 根路径和未匹配路径：根据角色自动重定向 */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </div>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App
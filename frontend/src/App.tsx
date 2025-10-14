import { useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { 
  LoginPage, 
  RegisterPage, 
  ProfilePage,
  // Student pages
  AssignmentsPage,
  CoursesPage,
  ExamsPage,
  LiveClassesPage,
  SchedulePage,
  MessagesPage,
  // Teacher pages
  TeacherCoursesPage,
  StudentsPage,
  TeacherAssignmentsPage,
  TeacherExamsPage,
  TeacherLiveClassesPage,
  AnalyticsPage,
  // Teacher sub-pages
  CreateCoursePage,
  CourseMaterialsPage,
  AssignmentsListPage,
  CreateAssignmentPage,
  GradingPage,
  ExamsListPage,
  CreateExamPage,
  ExamResultsPage,
  // Admin pages
  UsersPage,
  AdminCoursesPage,
  SystemPage,
  AdminAnalyticsPage,
} from './pages'
import { AppLayout, RoleBasedWelcome } from './components'
import ErrorBoundary from './components/ErrorBoundary'
import { PerformanceMonitor } from './utils/performance'
import { ErrorHandler } from './utils/errorHandler'
import './App.css'

// Dashboard components using RoleBasedWelcome
const StudentDashboard = () => <RoleBasedWelcome />
const TeacherDashboard = () => <RoleBasedWelcome />
const AdminDashboard = () => <RoleBasedWelcome />

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

              {/* Public routes - no authentication required */}
              <Route
                path="/student/dashboard"
                element={
                  <AppLayout>
                    <StudentDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/student/courses"
                element={
                  <AppLayout>
                    <CoursesPage />
                  </AppLayout>
                }
              />
              <Route
                path="/student/assignments"
                element={
                  <AppLayout>
                    <AssignmentsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/student/exams"
                element={
                  <AppLayout>
                    <ExamsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/student/live-classes"
                element={
                  <AppLayout>
                    <LiveClassesPage />
                  </AppLayout>
                }
              />
              <Route
                path="/student/schedule"
                element={
                  <AppLayout>
                    <SchedulePage />
                  </AppLayout>
                }
              />
              <Route
                path="/student/messages"
                element={
                  <AppLayout>
                    <MessagesPage />
                  </AppLayout>
                }
              />
              {/* Teacher routes */}
              <Route
                path="/teacher/dashboard"
                element={
                  <AppLayout>
                    <TeacherDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/courses"
                element={
                  <AppLayout>
                    <TeacherCoursesPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/courses/list"
                element={
                  <AppLayout>
                    <TeacherCoursesPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/courses/create"
                element={
                  <AppLayout>
                    <CreateCoursePage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/courses/materials"
                element={
                  <AppLayout>
                    <CourseMaterialsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/students"
                element={
                  <AppLayout>
                    <StudentsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/assignments"
                element={
                  <AppLayout>
                    <TeacherAssignmentsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/assignments/list"
                element={
                  <AppLayout>
                    <AssignmentsListPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/assignments/create"
                element={
                  <AppLayout>
                    <CreateAssignmentPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/assignments/grading"
                element={
                  <AppLayout>
                    <GradingPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/exams"
                element={
                  <AppLayout>
                    <TeacherExamsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/exams/list"
                element={
                  <AppLayout>
                    <ExamsListPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/exams/create"
                element={
                  <AppLayout>
                    <CreateExamPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/exams/results"
                element={
                  <AppLayout>
                    <ExamResultsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/live-classes"
                element={
                  <AppLayout>
                    <TeacherLiveClassesPage />
                  </AppLayout>
                }
              />
              <Route
                path="/teacher/analytics"
                element={
                  <AppLayout>
                    <AnalyticsPage />
                  </AppLayout>
                }
              />
              {/* Admin routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <AppLayout>
                    <AdminDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AppLayout>
                    <UsersPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/users/students"
                element={
                  <AppLayout>
                    <UsersPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/users/instructors"
                element={
                  <AppLayout>
                    <UsersPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/users/admins"
                element={
                  <AppLayout>
                    <UsersPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <AppLayout>
                    <AdminCoursesPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/system"
                element={
                  <AppLayout>
                    <SystemPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/system/config"
                element={
                  <AppLayout>
                    <SystemPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/system/logs"
                element={
                  <AppLayout>
                    <SystemPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/system/backup"
                element={
                  <AppLayout>
                    <SystemPage />
                  </AppLayout>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AppLayout>
                    <AdminAnalyticsPage />
                  </AppLayout>
                }
              />
              <Route
                path="/profile"
                element={
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                }
              />

              {/* Default redirect to student dashboard */}
              <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  )
}

export default App
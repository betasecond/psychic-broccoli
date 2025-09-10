import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { LoginPage, RegisterPage } from './pages'
import './App.css'

// Placeholder components - will be implemented in later tasks
const StudentDashboard = () => <div>学生仪表板 - 待实现</div>
const TeacherDashboard = () => <div>教师仪表板 - 待实现</div>
const ProfilePage = () => <div>个人资料页面 - 待实现</div>

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <div className="app">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes - will add protection in later tasks */}
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </ConfigProvider>
  )
}

export default App

import React from 'react'
import { Card, Row, Col, Button, Typography, Space, Spin } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  TeamOutlined,
  CalendarOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../store'

const { Title, Paragraph } = Typography

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  path: string
  color: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, path, color }) => {
  const navigate = useNavigate()

  return (
    <Card
      hoverable
      style={{ 
        height: '100%',
        borderRadius: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}
      bodyStyle={{ padding: '32px 24px' }}
      onClick={() => navigate(path)}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div 
          style={{ 
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            fontSize: '40px',
            color: color,
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.backgroundColor = `${color}25`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.backgroundColor = `${color}15`
          }}
        >
          {icon}
        </div>
        <Title level={4} style={{ textAlign: 'center', margin: 0 }}>
          {title}
        </Title>
        <Paragraph style={{ textAlign: 'center', margin: 0, color: '#666' }}>
          {description}
        </Paragraph>
      </Space>
    </Card>
  )
}

const RoleBasedWelcome: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading } = useAppSelector(state => state.auth)

  // Show loading spinner while user info is loading
  if (loading || !user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  // Role-based welcome messages
  const getWelcomeMessage = () => {
    switch (user.role) {
      case 'STUDENT':
        return {
          title: '欢迎回来，同学！',
          subtitle: '开始您的学习之旅',
          description: '在这里您可以访问课程、作业、考试和直播课堂等学习资源。',
        }
      case 'INSTRUCTOR':
        return {
          title: '欢迎回来，老师！',
          subtitle: '管理您的教学工作',
          description: '在这里您可以管理课程、学生、作业和考试，查看教学分析。',
        }
      case 'ADMIN':
        return {
          title: '欢迎回来，管理员！',
          subtitle: '管理教育平台系统',
          description: '在这里您可以管理用户、课程和系统设置，查看平台数据分析。',
        }
      default:
        return {
          title: '欢迎来到在线教育平台！',
          subtitle: '开始您的学习之旅',
          description: '在这里您可以访问学生、教师和管理员功能，体验完整的教育平台功能。',
        }
    }
  }

  // Role-based features
  const getFeatures = () => {
    // Common features for all roles can be added here
    const studentFeatures = [
      {
        icon: <BookOutlined />,
        title: '我的课程',
        description: '查看已报名的课程，跟踪学习进度',
        path: '/student/courses',
        color: '#1890ff',
      },
      {
        icon: <FileTextOutlined />,
        title: '作业任务',
        description: '完成老师布置的作业和练习',
        path: '/student/assignments',
        color: '#52c41a',
      },
      {
        icon: <BarChartOutlined />,
        title: '考试测验',
        description: '参加在线考试，查看成绩',
        path: '/student/exams',
        color: '#fa8c16',
      },
      {
        icon: <VideoCameraOutlined />,
        title: '直播课堂',
        description: '参与实时在线课程学习',
        path: '/student/live-classes',
        color: '#eb2f96',
      },
      {
        icon: <CalendarOutlined />,
        title: '课程表',
        description: '查看个人学习时间安排',
        path: '/student/schedule',
        color: '#722ed1',
      },
      {
        icon: <BarChartOutlined />,
        title: '学习统计',
        description: '查看学习数据和进度分析',
        path: '/student/analytics',
        color: '#13c2c2',
      },
    ]

    const teacherFeatures = [
      {
        icon: <BookOutlined />,
        title: '课程管理',
        description: '创建和管理教学课程',
        path: '/teacher/courses',
        color: '#1890ff',
      },
      {
        icon: <TeamOutlined />,
        title: '学生管理',
        description: '查看和管理班级学生',
        path: '/teacher/students',
        color: '#52c41a',
      },
      {
        icon: <FileTextOutlined />,
        title: '作业管理',
        description: '发布和批改学生作业',
        path: '/teacher/assignments',
        color: '#fa8c16',
      },
      {
        icon: <BarChartOutlined />,
        title: '考试管理',
        description: '创建和管理在线考试',
        path: '/teacher/exams',
        color: '#eb2f96',
      },
      {
        icon: <VideoCameraOutlined />,
        title: '直播课堂',
        description: '创建和管理直播课程',
        path: '/teacher/live-classes',
        color: '#722ed1',
      },
      {
        icon: <BarChartOutlined />,
        title: '教学分析',
        description: '查看教学效果和数据分析',
        path: '/teacher/analytics',
        color: '#13c2c2',
      },
    ]

    const adminFeatures = [
      {
        icon: <UserOutlined />,
        title: '用户管理',
        description: '管理学生、教师和管理员账户',
        path: '/admin/users',
        color: '#1890ff',
      },
      {
        icon: <BookOutlined />,
        title: '课程管理',
        description: '管理平台所有课程',
        path: '/admin/courses',
        color: '#52c41a',
      },
      {
        icon: <SettingOutlined />,
        title: '系统设置',
        description: '配置系统参数和功能',
        path: '/admin/system',
        color: '#fa8c16',
      },
      {
        icon: <BarChartOutlined />,
        title: '数据分析',
        description: '查看平台运营数据和统计',
        path: '/admin/analytics',
        color: '#eb2f96',
      },
    ]

    switch (user.role) {
      case 'STUDENT':
        return studentFeatures
      case 'INSTRUCTOR':
        return teacherFeatures
      case 'ADMIN':
        return adminFeatures
      default:
        return [...studentFeatures, ...teacherFeatures, ...adminFeatures]
    }
  }

  const welcomeMessage = getWelcomeMessage()
  const features = getFeatures()

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <Title level={2}>{welcomeMessage.title}</Title>
        <Title level={4} type="secondary" style={{ fontWeight: 'normal' }}>
          {welcomeMessage.subtitle}
        </Title>
        <Paragraph style={{ fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
          {welcomeMessage.description}
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <FeatureCard {...feature} />
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default RoleBasedWelcome
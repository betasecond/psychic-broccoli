import React from 'react'
import { Menu, type MenuProps } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  CalendarOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '../store'

type MenuItem = Required<MenuProps>['items'][number]

const RoleBasedNavigation: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppSelector(state => state.auth)

  if (!user) {
    return null
  }

  const handleMenuClick = (path: string) => {
    navigate(path)
  }

  const getStudentMenuItems = (): MenuItem[] => [
    {
      key: '/student/dashboard',
      icon: <DashboardOutlined />,
      label: '学习仪表板',
      onClick: () => handleMenuClick('/student/dashboard'),
    },
    {
      key: '/student/courses',
      icon: <BookOutlined />,
      label: '我的课程',
      onClick: () => handleMenuClick('/student/courses'),
    },
    {
      key: '/student/assignments',
      icon: <FileTextOutlined />,
      label: '作业任务',
      onClick: () => handleMenuClick('/student/assignments'),
    },
    {
      key: '/student/exams',
      icon: <BarChartOutlined />,
      label: '考试测验',
      onClick: () => handleMenuClick('/student/exams'),
    },
    {
      key: '/student/live-classes',
      icon: <VideoCameraOutlined />,
      label: '直播课堂',
      onClick: () => handleMenuClick('/student/live-classes'),
    },
    {
      key: '/student/schedule',
      icon: <CalendarOutlined />,
      label: '课程表',
      onClick: () => handleMenuClick('/student/schedule'),
    },
    {
      key: '/student/messages',
      icon: <MessageOutlined />,
      label: '消息通知',
      onClick: () => handleMenuClick('/student/messages'),
    },
  ]

  const getInstructorMenuItems = (): MenuItem[] => [
    {
      key: '/teacher/dashboard',
      icon: <DashboardOutlined />,
      label: '教学仪表板',
      onClick: () => handleMenuClick('/teacher/dashboard'),
    },
    {
      key: '/teacher/courses',
      icon: <BookOutlined />,
      label: '课程管理',
      children: [
        {
          key: '/teacher/courses/list',
          label: '我的课程',
          onClick: () => handleMenuClick('/teacher/courses/list'),
        },
        {
          key: '/teacher/courses/create',
          label: '创建课程',
          onClick: () => handleMenuClick('/teacher/courses/create'),
        },
        {
          key: '/teacher/courses/materials',
          label: '课程资料',
          onClick: () => handleMenuClick('/teacher/courses/materials'),
        },
      ],
    },
    {
      key: '/teacher/students',
      icon: <TeamOutlined />,
      label: '学生管理',
      onClick: () => handleMenuClick('/teacher/students'),
    },
    {
      key: '/teacher/assignments',
      icon: <FileTextOutlined />,
      label: '作业管理',
      children: [
        {
          key: '/teacher/assignments/list',
          label: '作业列表',
          onClick: () => handleMenuClick('/teacher/assignments/list'),
        },
        {
          key: '/teacher/assignments/create',
          label: '创建作业',
          onClick: () => handleMenuClick('/teacher/assignments/create'),
        },
        {
          key: '/teacher/assignments/grading',
          label: '批改作业',
          onClick: () => handleMenuClick('/teacher/assignments/grading'),
        },
      ],
    },
    {
      key: '/teacher/exams',
      icon: <BarChartOutlined />,
      label: '考试管理',
      children: [
        {
          key: '/teacher/exams/list',
          label: '考试列表',
          onClick: () => handleMenuClick('/teacher/exams/list'),
        },
        {
          key: '/teacher/exams/create',
          label: '创建考试',
          onClick: () => handleMenuClick('/teacher/exams/create'),
        },
        {
          key: '/teacher/exams/results',
          label: '考试结果',
          onClick: () => handleMenuClick('/teacher/exams/results'),
        },
      ],
    },
    {
      key: '/teacher/live-classes',
      icon: <VideoCameraOutlined />,
      label: '直播教学',
      onClick: () => handleMenuClick('/teacher/live-classes'),
    },
    {
      key: '/teacher/analytics',
      icon: <BarChartOutlined />,
      label: '教学分析',
      onClick: () => handleMenuClick('/teacher/analytics'),
    },
  ]

  const getAdminMenuItems = (): MenuItem[] => [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '管理仪表板',
      onClick: () => handleMenuClick('/admin/dashboard'),
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
      children: [
        {
          key: '/admin/users/students',
          label: '学生管理',
          onClick: () => handleMenuClick('/admin/users/students'),
        },
        {
          key: '/admin/users/instructors',
          label: '教师管理',
          onClick: () => handleMenuClick('/admin/users/instructors'),
        },
        {
          key: '/admin/users/admins',
          label: '管理员管理',
          onClick: () => handleMenuClick('/admin/users/admins'),
        },
      ],
    },
    {
      key: '/admin/courses',
      icon: <BookOutlined />,
      label: '课程管理',
      onClick: () => handleMenuClick('/admin/courses'),
    },
    {
      key: '/admin/system',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/admin/system/config',
          label: '系统配置',
          onClick: () => handleMenuClick('/admin/system/config'),
        },
        {
          key: '/admin/system/logs',
          label: '系统日志',
          onClick: () => handleMenuClick('/admin/system/logs'),
        },
        {
          key: '/admin/system/backup',
          label: '数据备份',
          onClick: () => handleMenuClick('/admin/system/backup'),
        },
      ],
    },
    {
      key: '/admin/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
      onClick: () => handleMenuClick('/admin/analytics'),
    },
  ]

  const getMenuItems = (): MenuItem[] => {
    switch (user.role) {
      case 'STUDENT':
        return getStudentMenuItems()
      case 'INSTRUCTOR':
        return getInstructorMenuItems()
      case 'ADMIN':
        return getAdminMenuItems()
      default:
        return []
    }
  }

  const getCurrentSelectedKeys = (): string[] => {
    const path = location.pathname
    // Find the best matching menu item
    const menuItems = getMenuItems()
    
    // First try exact match
    for (const item of menuItems) {
      if (item && typeof item === 'object' && 'key' in item && item.key === path) {
        return [path]
      }
      // Check children for exact match
      if (item && typeof item === 'object' && 'children' in item && item.children) {
        for (const child of item.children) {
          if (child && typeof child === 'object' && 'key' in child && child.key === path) {
            return [path]
          }
        }
      }
    }
    
    // If no exact match, try to find parent match
    for (const item of menuItems) {
      if (item && typeof item === 'object' && 'key' in item) {
        const itemKey = item.key as string
        if (path.startsWith(itemKey)) {
          return [itemKey]
        }
      }
    }
    
    return []
  }

  const getCurrentOpenKeys = (): string[] => {
    const path = location.pathname
    const menuItems = getMenuItems()
    
    for (const item of menuItems) {
      if (item && typeof item === 'object' && 'children' in item && item.children) {
        for (const child of item.children) {
          if (child && typeof child === 'object' && 'key' in child && path.startsWith(child.key as string)) {
            return [item.key as string]
          }
        }
      }
    }
    
    return []
  }

  return (
    <Menu
      mode="inline"
      selectedKeys={getCurrentSelectedKeys()}
      defaultOpenKeys={getCurrentOpenKeys()}
      items={getMenuItems()}
      style={{
        height: '100%',
        borderRight: 0,
      }}
    />
  )
}

export default RoleBasedNavigation
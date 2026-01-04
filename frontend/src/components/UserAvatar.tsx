import React from 'react'
import { Dropdown, Avatar, Button, Space, Badge, type MenuProps } from 'antd'
import {
  UserOutlined,
  SettingOutlined,
  CrownOutlined,
  BookOutlined,
  TeamOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store'
import { logoutAsync } from '../store/slices/authSlice'

const UserAvatar: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)

  const handleProfile = () => {
    navigate('/profile')
  }

  const handleLogout = () => {
    dispatch(logoutAsync())
    navigate('/login')
  }

  // Default user when no authentication
  const defaultUser = {
    username: '访客',
    email: 'guest@example.com',
    avatarUrl: '',
    role: 'STUDENT'
  }

  // Use provided user if available, otherwise use default
  const displayUser = user || defaultUser

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <CrownOutlined />
      case 'INSTRUCTOR':
        return <BookOutlined />
      case 'STUDENT':
        return <TeamOutlined />
      default:
        return <UserOutlined />
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '管理员'
      case 'INSTRUCTOR':
        return '教师'
      case 'STUDENT':
        return '学生'
      default:
        return '用户'
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '#f50'
      case 'INSTRUCTOR':
        return '#108ee9'
      case 'STUDENT':
        return '#87d068'
      default:
        return '#d9d9d9'
    }
  }

  const items: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {displayUser.username}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {displayUser.email}
          </div>
          <div style={{ marginTop: '4px' }}>
            <Badge
              color={getRoleBadgeColor(displayUser.role)}
              text={getRoleText(displayUser.role)}
            />
          </div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'profile',
      label: '个人资料',
      icon: <SettingOutlined />,
      onClick: handleProfile,
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  return (
    <Dropdown
      menu={{ items }}
      placement="bottomRight"
      arrow
      trigger={['click']}
    >
      <Button
        type="text"
        className="user-avatar-button"
        style={{
          height: 'auto',
          padding: '8px 12px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Space align="center">
          <Badge
            dot
            color={getRoleBadgeColor(displayUser.role)}
            offset={[-2, 2]}
          >
            <Avatar
              size={32}
              src={displayUser.avatarUrl}
              icon={!displayUser.avatarUrl && getRoleIcon(displayUser.role)}
              style={{
                backgroundColor: !displayUser.avatarUrl ? getRoleBadgeColor(displayUser.role) : undefined,
              }}
            />
          </Badge>
          <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>
              {displayUser.username}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {getRoleText(displayUser.role)}
            </div>
          </div>
        </Space>
      </Button>
    </Dropdown>
  )
}

export default UserAvatar
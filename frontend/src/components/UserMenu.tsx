import React from 'react'
import { Dropdown, Avatar, Button, Space, type MenuProps } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store'
import { logoutAsync } from '../store/slices/authSlice'

const UserMenu: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(state => state.auth)

  const handleLogout = async () => {
    await dispatch(logoutAsync())
    navigate('/login')
  }

  const handleProfile = () => {
    navigate('/profile')
  }

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <SettingOutlined />,
      onClick: handleProfile,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  if (!user) {
    return null
  }

  return (
    <Dropdown menu={{ items }} placement="bottomRight" arrow>
      <Button type="text" className="user-menu-button">
        <Space>
          <Avatar
            size="small"
            src={user.avatarUrl}
            icon={!user.avatarUrl && <UserOutlined />}
          />
          <span>{user.username}</span>
        </Space>
      </Button>
    </Dropdown>
  )
}

export default UserMenu
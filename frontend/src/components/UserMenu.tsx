import React from 'react'
import { Dropdown, Avatar, Button, Space, type MenuProps } from 'antd'
import { UserOutlined, SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const UserMenu: React.FC = () => {
  const navigate = useNavigate()

  const handleProfile = () => {
    navigate('/profile')
  }

  // Default user data when no authentication
  const defaultUser = {
    username: '访客',
    avatarUrl: ''
  }

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <SettingOutlined />,
      onClick: handleProfile,
    },
  ]

  return (
    <Dropdown menu={{ items }} placement="bottomRight" arrow>
      <Button type="text" className="user-menu-button">
        <Space>
          <Avatar
            size="small"
            src={defaultUser.avatarUrl}
            icon={!defaultUser.avatarUrl && <UserOutlined />}
          />
          <span>{defaultUser.username}</span>
        </Space>
      </Button>
    </Dropdown>
  )
}

export default UserMenu
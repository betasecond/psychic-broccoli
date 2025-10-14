import React from 'react'
import { Button, message } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

interface LogoutButtonProps {
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  size?: 'large' | 'middle' | 'small'
  showConfirm?: boolean
  children?: React.ReactNode
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  type = 'default',
  size = 'middle',
  showConfirm = true,
  children,
}) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    if (showConfirm) {
      // Show a message instead of logout functionality
      message.info('当前为无认证模式，无需退出登录')
    } else {
      // Redirect to dashboard instead of login
      navigate('/student/dashboard')
    }
  }

  return (
    <Button
      type={type}
      size={size}
      icon={<LogoutOutlined />}
      onClick={handleLogout}
    >
      {children || '登出'}
    </Button>
  )
}

export default LogoutButton
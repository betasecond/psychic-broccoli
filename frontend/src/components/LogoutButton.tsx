import React from 'react'
import { Button, Modal } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store'
import { logoutAsync } from '../store/slices/authSlice'

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
  const dispatch = useAppDispatch()

  const handleLogout = () => {
    if (showConfirm) {
      Modal.confirm({
        title: '确认退出',
        content: '您确定要退出登录吗？',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          performLogout()
        },
      })
    } else {
      performLogout()
    }
  }

  const performLogout = async () => {
    await dispatch(logoutAsync())
    navigate('/login')
  }

  return (
    <Button
      type={type}
      size={size}
      icon={<LogoutOutlined />}
      onClick={handleLogout}
    >
      {children || '退出登录'}
    </Button>
  )
}

export default LogoutButton
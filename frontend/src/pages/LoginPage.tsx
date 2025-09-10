import React from 'react'
import { Form, Input, Button, Card, Typography, message, Spin } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginAsync, clearError } from '../store/slices/authSlice'
import type { RootState, AppDispatch } from '../store'
import AuthLayout from '../components/AuthLayout'
import './LoginPage.css'

const { Title, Text } = Typography

interface LoginFormData {
  username: string
  password: string
}

const LoginPage: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { loading, error } = useSelector((state: RootState) => state.auth)

  const onFinish = async (values: LoginFormData) => {
    try {
      const result = await dispatch(loginAsync(values))

      if (loginAsync.fulfilled.match(result)) {
        message.success('登录成功！')

        // 根据用户角色跳转到对应的仪表板
        const userRole = result.payload.user.role
        if (userRole === 'STUDENT') {
          navigate('/student/dashboard')
        } else if (userRole === 'INSTRUCTOR') {
          navigate('/teacher/dashboard')
        } else {
          navigate('/admin/dashboard')
        }
      }
    } catch (error) {
      // Error is handled by Redux slice
      console.error('Login error:', error)
    }
  }

  const onFinishFailed = (errorInfo: unknown) => {
    console.log('Failed:', errorInfo)
  }

  // Clear error when component unmounts or when user starts typing
  React.useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  const handleInputChange = () => {
    if (error) {
      dispatch(clearError())
    }
  }

  return (
    <AuthLayout>
      <Card className="login-card">
        <div className="login-header">
          <Title level={2} className="login-title">
            用户登录
          </Title>
          <Text type="secondary">欢迎回到在线教育平台</Text>
        </div>

        <Form
          form={form}
          name="login"
          className="login-form"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名！' },
              { min: 3, message: '用户名至少3个字符！' },
              { max: 20, message: '用户名不能超过20个字符！' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              onChange={handleInputChange}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码！' },
              { min: 6, message: '密码至少6个字符！' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              onChange={handleInputChange}
            />
          </Form.Item>

          {error && (
            <div className="error-message">
              <Text type="danger">{error}</Text>
            </div>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-button"
              loading={loading}
              block
            >
              {loading ? <Spin size="small" /> : '登录'}
            </Button>
          </Form.Item>

          <div className="login-footer">
            <Text>
              还没有账号？{' '}
              <Link to="/register" className="register-link">
                立即注册
              </Link>
            </Text>
          </div>
        </Form>
      </Card>
    </AuthLayout>
  )
}

export default LoginPage

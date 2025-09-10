import React from 'react'
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Select,
  Spin,
} from 'antd'
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { registerAsync, clearError } from '../store/slices/authSlice'
import type { RootState, AppDispatch } from '../store'
import AuthLayout from '../components/AuthLayout'
import './RegisterPage.css'

const { Title, Text } = Typography
const { Option } = Select

interface RegisterFormData {
  username: string
  password: string
  confirmPassword: string
  role: 'STUDENT' | 'INSTRUCTOR'
}

const RegisterPage: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { loading, error } = useSelector((state: RootState) => state.auth)

  const onFinish = async (values: RegisterFormData) => {
    try {
      const result = await dispatch(registerAsync(values))

      if (registerAsync.fulfilled.match(result)) {
        message.success('注册成功！请登录您的账户')
        // 注册成功后跳转到登录页面
        navigate('/login')
      }
    } catch (error) {
      // Error is handled by Redux slice
      console.error('Register error:', error)
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

  // Custom validator for password confirmation
  const validateConfirmPassword = (_: unknown, value: string) => {
    const password = form.getFieldValue('password')
    if (value && password && value !== password) {
      return Promise.reject(new Error('两次密码输入不一致！'))
    }
    return Promise.resolve()
  }

  // Custom validator for password strength
  const validatePassword = (_: unknown, value: string) => {
    if (!value) {
      return Promise.resolve()
    }
    if (value.length < 6) {
      return Promise.reject(new Error('密码长度不能少于6位！'))
    }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
      return Promise.reject(new Error('密码必须包含字母和数字！'))
    }
    return Promise.resolve()
  }

  return (
    <AuthLayout>
      <Card className="register-card">
        <div className="register-header">
          <Title level={2} className="register-title">
            用户注册
          </Title>
          <Text type="secondary">创建您的在线教育平台账户</Text>
        </div>

        <Form
          form={form}
          name="register"
          className="register-form"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名！' },
              { min: 3, message: '用户名至少3个字符！' },
              { max: 20, message: '用户名不能超过20个字符！' },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: '用户名只能包含字母、数字和下划线！',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              onChange={handleInputChange}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码！' },
              { validator: validatePassword },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              onChange={handleInputChange}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码！' },
              { validator: validateConfirmPassword },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入密码"
              onChange={handleInputChange}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="用户角色"
            rules={[{ required: true, message: '请选择用户角色！' }]}
            initialValue="STUDENT"
          >
            <Select
              placeholder="请选择您的角色"
              suffixIcon={<TeamOutlined />}
              onChange={handleInputChange}
            >
              <Option value="STUDENT">学生</Option>
              <Option value="INSTRUCTOR">教师</Option>
            </Select>
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
              className="register-button"
              loading={loading}
              block
            >
              {loading ? <Spin size="small" /> : '注册'}
            </Button>
          </Form.Item>

          <div className="register-footer">
            <Text>
              已有账号？{' '}
              <Link to="/login" className="login-link">
                立即登录
              </Link>
            </Text>
          </div>
        </Form>
      </Card>
    </AuthLayout>
  )
}

export default RegisterPage

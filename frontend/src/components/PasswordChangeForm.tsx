import React, { useState } from 'react'
import { Form, Input, Button, Progress, Space, Alert } from 'antd'
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import './PasswordChangeForm.css'

interface PasswordChangeFormProps {
  onSubmit: (values: { currentPassword: string; newPassword: string }) => Promise<void>
  loading?: boolean
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Password strength checker
const checkPasswordStrength = (password: string): { score: number; feedback: string[] } => {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) {
    score += 25
  } else {
    feedback.push('密码长度至少8位')
  }

  if (/[a-z]/.test(password)) {
    score += 25
  } else {
    feedback.push('包含小写字母')
  }

  if (/[A-Z]/.test(password)) {
    score += 25
  } else {
    feedback.push('包含大写字母')
  }

  if (/[0-9]/.test(password)) {
    score += 25
  } else {
    feedback.push('包含数字')
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 10 // Bonus for special characters
  }

  return { score: Math.min(score, 100), feedback }
}

const getPasswordStrengthColor = (score: number): string => {
  if (score < 25) return '#ff4d4f'
  if (score < 50) return '#faad14'
  if (score < 75) return '#1890ff'
  return '#52c41a'
}

const getPasswordStrengthText = (score: number): string => {
  if (score < 25) return '弱'
  if (score < 50) return '一般'
  if (score < 75) return '良好'
  return '强'
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm<PasswordFormData>()
  const [newPassword, setNewPassword] = useState('')
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] })

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    setNewPassword(password)
    setPasswordStrength(checkPasswordStrength(password))
  }

  const handleSubmit = async (values: PasswordFormData) => {
    try {
      await onSubmit({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      form.resetFields()
      setNewPassword('')
      setPasswordStrength({ score: 0, feedback: [] })
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value || form.getFieldValue('newPassword') === value) {
      return Promise.resolve()
    }
    return Promise.reject(new Error('两次输入的密码不一致'))
  }

  return (
    <div className="password-change-form">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="当前密码"
          name="currentPassword"
          rules={[
            { required: true, message: '请输入当前密码' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入当前密码"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度不能少于6位' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve()
                const { score } = checkPasswordStrength(value)
                if (score < 25) {
                  return Promise.reject(new Error('密码强度太弱，请设置更复杂的密码'))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入新密码"
            onChange={handleNewPasswordChange}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        {newPassword && (
          <div className="password-strength-indicator">
            <div className="strength-progress">
              <span className="strength-label">密码强度:</span>
              <Progress
                percent={passwordStrength.score}
                strokeColor={getPasswordStrengthColor(passwordStrength.score)}
                showInfo={false}
                size="small"
                className="strength-bar"
              />
              <span 
                className="strength-text"
                style={{ color: getPasswordStrengthColor(passwordStrength.score) }}
              >
                {getPasswordStrengthText(passwordStrength.score)}
              </span>
            </div>
            
            {passwordStrength.feedback.length > 0 && (
              <Alert
                message="密码建议"
                description={
                  <ul className="password-feedback">
                    {passwordStrength.feedback.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                }
                type="info"
                showIcon
                className="password-feedback-alert"
              />
            )}
          </div>
        )}

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            { validator: validateConfirmPassword },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请确认新密码"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                form.resetFields()
                setNewPassword('')
                setPasswordStrength({ score: 0, feedback: [] })
              }}
              disabled={loading}
            >
              重置
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              确认修改
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default PasswordChangeForm
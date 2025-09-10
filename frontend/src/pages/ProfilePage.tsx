import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Divider,
  Space,
  Modal,
  Row,
  Col,
} from 'antd'
import {
  EditOutlined,
  LockOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useAppSelector, useAppDispatch } from '../store'
import {
  updateProfileAsync,
  changePasswordAsync,
  getCurrentUserAsync,
} from '../store/slices/authSlice'
import { AvatarUpload, PasswordChangeForm } from '../components'
import './ProfilePage.css'

interface ProfileFormData {
  email: string
}



const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user, loading } = useAppSelector(state => state.auth)
  const [profileForm] = Form.useForm<ProfileFormData>()

  
  const [isEditing, setIsEditing] = useState(false)
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  useEffect(() => {
    // Load current user data when component mounts
    dispatch(getCurrentUserAsync())
  }, [dispatch])

  useEffect(() => {
    // Update form and avatar when user data changes
    if (user) {
      profileForm.setFieldsValue({
        email: user.email || '',
      })
      setAvatarUrl(user.avatarUrl || '')
    }
  }, [user, profileForm])

  const handleProfileSave = async (values: ProfileFormData) => {
    try {
      await dispatch(updateProfileAsync({
        email: values.email,
        avatarUrl: avatarUrl,
      })).unwrap()
      message.success('个人信息更新成功')
      setIsEditing(false)
    } catch (error) {
      message.error('个人信息更新失败')
    }
  }

  const handlePasswordChange = async (values: { currentPassword: string; newPassword: string }) => {
    try {
      await dispatch(changePasswordAsync(values)).unwrap()
      message.success('密码修改成功')
      setIsPasswordModalVisible(false)
    } catch (error) {
      message.error('密码修改失败')
      throw error // Re-throw to let PasswordChangeForm handle it
    }
  }

  const handleAvatarUploadSuccess = (url: string) => {
    setAvatarUrl(url)
    message.success('头像上传成功，请保存个人信息以完成更新')
  }

  if (!user) {
    return (
      <div className="profile-loading">
        <Card loading />
      </div>
    )
  }

  return (
    <div className="profile-page">
      <Row gutter={24}>
        <Col xs={24} md={8}>
          {/* Avatar Card */}
          <Card className="avatar-card">
            <div className="avatar-section">
              <div className="avatar-container">
                <AvatarUpload
                  avatarUrl={avatarUrl}
                  size={120}
                  onUploadSuccess={handleAvatarUploadSuccess}
                  disabled={!isEditing}
                />
              </div>
              <div className="user-info">
                <h3>{user.username}</h3>
                <p className="user-role">
                  {user.role === 'STUDENT' ? '学生' : 
                   user.role === 'INSTRUCTOR' ? '教师' : '管理员'}
                </p>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          {/* Profile Information Card */}
          <Card
            title="个人信息"
            extra={
              <Space>
                {!isEditing ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => setIsEditing(true)}
                  >
                    编辑
                  </Button>
                ) : (
                  <Space>
                    <Button onClick={() => setIsEditing(false)}>
                      取消
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => profileForm.submit()}
                      loading={loading}
                    >
                      保存
                    </Button>
                  </Space>
                )}
              </Space>
            }
          >
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileSave}
              disabled={!isEditing}
            >
              <Form.Item label="用户名">
                <Input value={user.username} disabled />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>

              <Form.Item label="角色">
                <Input
                  value={
                    user.role === 'STUDENT' ? '学生' : 
                    user.role === 'INSTRUCTOR' ? '教师' : '管理员'
                  }
                  disabled
                />
              </Form.Item>
            </Form>

            <Divider />

            <div className="password-section">
              <h4>密码管理</h4>
              <Button
                icon={<LockOutlined />}
                onClick={() => setIsPasswordModalVisible(true)}
              >
                修改密码
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Password Change Modal */}
      <Modal
        title="修改密码"
        open={isPasswordModalVisible}
        onCancel={() => setIsPasswordModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <PasswordChangeForm
          onSubmit={handlePasswordChange}
          loading={loading}
        />
      </Modal>
    </div>
  )
}

export default ProfilePage
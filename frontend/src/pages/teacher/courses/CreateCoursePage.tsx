import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Form,
  Input,
  Select,
  message,
  Spin,
  Upload,
} from 'antd'
import {
  BookOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import type { UploadChangeParam, UploadFile } from 'antd/es/upload'
import { courseService, type Category } from '@/services/courseService'
import { uploadFile } from '@/services/fileService'

const { Title, Text } = Typography
const { Option } = Select

const CreateCoursePage: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [coverUploading, setCoverUploading] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setCategoriesLoading(true)
    try {
      const categories = await courseService.getCategories()
      setCategories(categories || [])
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取课程分类失败')
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }

  const beforeCoverUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片格式的封面!')
      return false
    }
    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('封面图片大小不能超过 5MB!')
      return false
    }
    return false // Prevent auto upload; handle manually
  }

  const handleCoverChange = async (info: UploadChangeParam<UploadFile>) => {
    const file = info.file.originFileObj
    if (!file) return

    setCoverUploading(true)
    try {
      const result = await uploadFile(file, 'cover')
      setCoverUrl(result.url)
      message.success('封面上传成功')
    } catch (error) {
      message.error('封面上传失败，请重试')
    } finally {
      setCoverUploading(false)
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const createData = {
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        coverImageUrl: coverUrl || undefined,
      }

      await courseService.createCourse(createData)
      message.success('课程创建成功！')

      // 跳转到课程列表页面
      navigate('/teacher/courses')
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建课程失败')
    } finally {
      setLoading(false)
    }
  }

  const onFinishFailed = () => {
    message.error('请填写完整的课程信息')
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/teacher/courses')}
          style={{ marginBottom: 16 }}
        >
          返回课程列表
        </Button>
        <Title level={2}>创建课程</Title>
        <Text type="secondary">创建新的教学课程</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={18}>
          <Card title="课程信息">
            <Spin spinning={categoriesLoading} tip="加载分类列表...">
              <Form
                form={form}
                name="create-course"
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
                layout="vertical"
              >
                <Form.Item
                  name="title"
                  label="课程标题"
                  rules={[
                    { required: true, message: '请输入课程标题!' },
                    { max: 100, message: '课程标题不能超过100个字符' },
                  ]}
                >
                  <Input placeholder="请输入课程标题，如：React 深入浅出" />
                </Form.Item>

                <Form.Item
                  name="categoryId"
                  label="课程分类"
                  rules={[{ required: true, message: '请选择课程分类!' }]}
                >
                  <Select
                    placeholder="请选择课程分类"
                    loading={categoriesLoading}
                  >
                    {categories.map((category) => (
                      <Option key={category.id} value={category.id}>
                        {category.name}
                        {category.description && (
                          <span style={{ color: '#999', marginLeft: 8 }}>
                            - {category.description}
                          </span>
                        )}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="description"
                  label="课程描述"
                  rules={[
                    { required: true, message: '请输入课程描述!' },
                    { max: 1000, message: '课程描述不能超过1000个字符' },
                  ]}
                >
                  <Input.TextArea
                    rows={6}
                    placeholder="详细描述课程内容、目标、适合人群等信息"
                    showCount
                    maxLength={1000}
                  />
                </Form.Item>

                <Form.Item label="课程封面">
                  <Upload
                    name="cover"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeCoverUpload}
                    onChange={handleCoverChange}
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt="课程封面"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div>
                        {coverUploading ? <LoadingOutlined /> : <PlusOutlined />}
                        <div style={{ marginTop: 8 }}>
                          {coverUploading ? '上传中...' : '上传封面'}
                        </div>
                      </div>
                    )}
                  </Upload>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    支持 JPG/PNG/GIF，大小不超过 5MB
                  </Text>
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      disabled={categoriesLoading}
                    >
                      创建课程
                    </Button>
                    <Button onClick={() => navigate('/teacher/courses')}>
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Spin>
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card title="课程设置">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <BookOutlined
                    style={{ color: '#1890ff', marginRight: '8px' }}
                  />
                  <Text strong>课程信息</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  填写课程基本信息
                </Text>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <FileTextOutlined
                    style={{ color: '#52c41a', marginRight: '8px' }}
                  />
                  <Text strong>课程内容</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  创建后可添加章节和课时
                </Text>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <UserOutlined
                    style={{ color: '#fa8c16', marginRight: '8px' }}
                  />
                  <Text strong>学生管理</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  学生可以自行选课
                </Text>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <CalendarOutlined
                    style={{ color: '#722ed1', marginRight: '8px' }}
                  />
                  <Text strong>排课计划</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  可以安排直播时间
                </Text>
              </div>
            </Space>
          </Card>

          <Card title="提示" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                • 课程创建后，学生可以浏览并选课
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                • 创建课程后可以继续添加章节和作业
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                • 建议先创建课程基本信息，再完善内容
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default CreateCoursePage

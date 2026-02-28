import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  Card,
  List,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  message,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  CommentOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { discussionService, courseService } from '@/services'
import type { Discussion as DiscussionType, CreateDiscussionRequest } from '@/services/discussionService'
import { useAppSelector } from '@/store'
import './DiscussionsPage.css'

const { TextArea } = Input
const { Option } = Select

const DiscussionsPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const currentUser = useAppSelector((state: any) => state.auth.user)
  const [discussions, setDiscussions] = useState<DiscussionType[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [availableCourses, setAvailableCourses] = useState<any[]>([])

  // 筛选参数
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'OPEN' | 'CLOSED' | ''>('')
  const [courseId, setCourseId] = useState<number>()

  // 根据当前路径判断角色，确定正确的跳转基路径
  const isTeacher = location.pathname.startsWith('/teacher')
  const basePath = isTeacher ? '/teacher/discussions' : '/student/discussions'

  useEffect(() => {
    const courseIdParam = searchParams.get('courseId')
    if (courseIdParam) {
      setCourseId(parseInt(courseIdParam))
    }
    fetchDiscussions()
    fetchAvailableCourses()
  }, [keyword, status, courseId])

  const fetchAvailableCourses = async () => {
    try {
      if (isTeacher) {
        // 教师：获取自己创建的课程
        const res = await courseService.getCourses({ instructorId: currentUser?.userId }) as any
        setAvailableCourses(res?.courses || [])
      } else {
        // 学生：获取已选课程
        const response = await courseService.getMyCourses()
        setAvailableCourses((response as any).courses || [])
      }
    } catch (error: any) {
      // 静默处理，课程筛选不影响主功能
      console.error('获取课程列表失败:', error)
    }
  }

  const fetchDiscussions = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (keyword) params.keyword = keyword
      if (status) params.status = status
      if (courseId) params.courseId = courseId

      const data = await discussionService.getDiscussions(params)
      setDiscussions(data)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取讨论列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDiscussion = async (values: CreateDiscussionRequest) => {
    try {
      const result = await discussionService.createDiscussion(values)
      message.success('讨论创建成功')
      setCreateModalVisible(false)
      form.resetFields()
      navigate(`${basePath}/${result.id}`)
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建讨论失败')
    }
  }

  const getStatusIcon = (status: string) => {
    return status === 'OPEN' ? (
      <CheckCircleOutlined style={{ color: '#52c41a' }} />
    ) : (
      <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
    )
  }

  return (
    <div className="discussions-page">
      <Card className="header-card">
        <div className="page-header">
          <h2>课程讨论区</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            发起讨论
          </Button>
        </div>

        <div className="filters">
          <Space size="middle" wrap>
            <Input
              placeholder="搜索讨论..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="选择状态"
              style={{ width: 150 }}
              value={status || undefined}
              onChange={(value) => setStatus(value || '')}
              allowClear
            >
              <Option value="OPEN">进行中</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
          </Space>
        </div>
      </Card>

      <Card className="list-card">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={discussions}
            renderItem={(item) => (
              <List.Item
                className="discussion-item"
                onClick={() => navigate(`${basePath}/${item.id}`)}
              >
                <div className="discussion-header">
                  <div className="discussion-title">
                    {getStatusIcon(item.status)}
                    <h3>{item.title}</h3>
                  </div>
                  <Tag color={item.status === 'OPEN' ? 'green' : 'default'}>
                    {item.status === 'OPEN' ? '进行中' : '已关闭'}
                  </Tag>
                </div>

                {item.content && (
                  <div className="discussion-content">{item.content}</div>
                )}

                <div className="discussion-meta">
                  <Space size="large">
                    {item.course && <span>课程：{item.course.title}</span>}
                    {item.author && <span>发起人：{item.author.username}</span>}
                    <span>
                      <CommentOutlined /> {item.replyCount} 回复
                    </span>
                    <span>
                      {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </Space>
                </div>
              </List.Item>
            )}
            locale={{
              emptyText: '暂无讨论，快来发起第一个讨论吧！',
            }}
          />
        )}
      </Card>

      <Modal
        title="发起讨论"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateDiscussion}>
          <Form.Item
            name="courseId"
            label="选择课程"
            rules={[{ required: true, message: '请选择课程' }]}
            initialValue={courseId}
          >
            <Select placeholder="请选择课程">
              {availableCourses.map((course) => (
                <Option key={course.id} value={course.id}>
                  {course.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="讨论标题"
            rules={[
              { required: true, message: '请输入讨论标题' },
              { max: 100, message: '标题不能超过100字符' },
            ]}
          >
            <Input placeholder="请输入讨论标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="content"
            label="讨论内容"
            rules={[
              { required: true, message: '请输入讨论内容' },
              { max: 2000, message: '内容不能超过2000字符' },
            ]}
          >
            <TextArea
              placeholder="请详细描述你的问题或想法..."
              rows={8}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                发布讨论
              </Button>
              <Button
                onClick={() => {
                  setCreateModalVisible(false)
                  form.resetFields()
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DiscussionsPage

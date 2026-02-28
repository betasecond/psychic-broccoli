import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
} from 'antd'
import { PlusOutlined, PlayCircleOutlined, EyeOutlined } from '@ant-design/icons'
import { liveService, courseService } from '@/services'
import type { LiveSession } from '@/services/liveService'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import './LiveManagementPage.css'

const { TextArea } = Input
const { Option } = Select

const LiveManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const [lives, setLives] = useState<LiveSession[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchLives()
    fetchMyCourses()
  }, [])

  const fetchLives = async () => {
    setLoading(true)
    try {
      const data = await liveService.getLiveList()
      setLives(data)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取直播列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchMyCourses = async () => {
    try {
      const data = await courseService.getMyCourses() as any
      setCourses(data?.courses || [])
    } catch (error) {
      console.error('获取课程列表失败', error)
    }
  }

  const handleCreateLive = async (values: any) => {
    try {
      const scheduledTime = values.scheduledTime
        ? dayjs(values.scheduledTime).format('YYYY-MM-DD HH:mm:ss')
        : undefined

      const result = await liveService.createLive({
        ...values,
        scheduledTime,
      })

      message.success('直播创建成功')
      setCreateModalVisible(false)
      form.resetFields()
      fetchLives()

      // 跳转到直播控制页面
      navigate(`/teacher/live/${result.id}`)
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建直播失败')
    }
  }

  const getStatusTag = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: 'blue', text: '预定' },
      LIVE: { color: 'green', text: '直播中' },
      ENDED: { color: 'default', text: '已结束' },
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const columns: ColumnsType<LiveSession> = [
    {
      title: '直播标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
    },
    {
      title: '课程',
      dataIndex: ['course', 'title'],
      key: 'course',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '观看人数',
      dataIndex: 'viewersCount',
      key: 'viewersCount',
      width: 100,
      render: (count) => (
        <span>
          <EyeOutlined /> {count}
        </span>
      ),
    },
    {
      title: '预定时间',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      width: 180,
      render: (time) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'SCHEDULED' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/teacher/live/${record.id}`)}
            >
              开始
            </Button>
          )}
          {record.status === 'LIVE' && (
            <Button
              size="small"
              onClick={() => navigate(`/teacher/live/${record.id}`)}
            >
              控制台
            </Button>
          )}
          <Button
            size="small"
            onClick={() => navigate(`/teacher/live/${record.id}`)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="live-management-page">
      <Card className="header-card">
        <div className="page-header">
          <h2>直播管理</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建直播
          </Button>
        </div>
      </Card>

      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={lives}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title="创建直播"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateLive}>
          <Form.Item
            name="courseId"
            label="选择课程"
            rules={[{ required: true, message: '请选择课程' }]}
          >
            <Select placeholder="请选择课程" showSearch optionFilterProp="children">
              {courses.map((course) => (
                <Option key={course.id} value={course.id}>
                  {course.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="直播标题"
            rules={[
              { required: true, message: '请输入直播标题' },
              { max: 100, message: '标题不能超过100字符' },
            ]}
          >
            <Input placeholder="请输入直播标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="description"
            label="直播描述"
            rules={[{ max: 500, message: '描述不能超过500字符' }]}
          >
            <TextArea
              placeholder="请输入直播描述（可选）"
              rows={4}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item name="scheduledTime" label="预定时间">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder="选择预定时间（可选）"
              style={{ width: '100%' }}
              disabledDate={(current) =>
                current && current < dayjs().startOf('day')
              }
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建直播
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

export default LiveManagementPage

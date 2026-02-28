import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, List, Modal, Select, Space, Tag, Typography, message } from 'antd'
import { CommentOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { discussionService, type Discussion } from '../../services/discussionService'
import { courseService, type Course } from '../../services/courseService'

const { Title, Text } = Typography
const { TextArea } = Input

type CreateDiscussionForm = {
  courseId: number
  title: string
  content: string
}

interface Props {
  basePath: '/student/discussions' | '/teacher/discussions'
}

const formatTime = (iso?: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

const DiscussionsPage: React.FC<Props> = ({ basePath }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Discussion[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<CreateDiscussionForm>()

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await discussionService.getDiscussions()
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      message.error(e?.message || '获取讨论列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    // 课程用于创建讨论时选择。若未登录/无权限，会走错误提示。
    courseService
      .getMyCourses()
      .then(res => setCourses(res?.data?.courses || []))
      .catch(() => {
        // fallback：用公开课程列表
        courseService.getCourses().then(res => setCourses(res?.data?.courses || [])).catch(() => {})
      })
  }, [])

  const courseOptions = useMemo(
    () =>
      courses.map(c => ({
        label: c.title,
        value: c.id,
      })),
    [courses]
  )

  const onCreate = async () => {
    const values = await form.validateFields()
    setCreating(true)
    try {
      await discussionService.createDiscussion(values)
      message.success('讨论创建成功')
      setOpen(false)
      form.resetFields()
      await refresh()
    } catch (e: any) {
      message.error(e?.message || '创建讨论失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                <CommentOutlined /> 课堂讨论
              </Title>
              <Text type="secondary">创建、查看与回复课程讨论</Text>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              发起讨论
            </Button>
          </Space>
        </Card>

        <Card>
          <List
            loading={loading}
            dataSource={items}
            rowKey={i => String(i.id)}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button key="view" type="link" onClick={() => navigate(`${basePath}/${item.id}`)}>
                    参与讨论
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{item.title}</span>
                      <Tag color={item.status === 'closed' ? 'default' : 'green'}>
                        {item.status === 'closed' ? '已关闭' : '进行中'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space wrap>
                      <Text type="secondary">课程：{item.courseTitle || item.courseId}</Text>
                      <Text type="secondary">作者：{item.authorName || item.authorId}</Text>
                      <Text type="secondary">回复：{item.replies}</Text>
                      <Text type="secondary">最后回复：{formatTime(item.lastReplyAt || item.createdAt)}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Space>

      <Modal
        title="发起讨论"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onCreate}
        okText="创建"
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="courseId"
            label="所属课程"
            rules={[{ required: true, message: '请选择课程' }]}
          >
            <Select options={courseOptions} placeholder="请选择课程" />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入讨论标题" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={4} placeholder="请输入讨论内容" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DiscussionsPage





import React, { useEffect, useState } from 'react'
import { Avatar, Button, Card, Form, Input, List, Space, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, LikeFilled, LikeOutlined, SendOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { discussionService, type DiscussionDetail, type DiscussionReply } from '../../services/discussionService'
import { useAppSelector } from '../../store'

const { Title, Text } = Typography
const { TextArea } = Input

const formatTime = (iso?: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

interface Props {
  backTo: '/student/discussions' | '/teacher/discussions'
}

const DiscussionDetailPage: React.FC<Props> = ({ backTo }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAppSelector(state => state.auth)
  const discussionId = Number(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null)
  const [replies, setReplies] = useState<DiscussionReply[]>([])
  const [form] = Form.useForm<{ content: string }>()

  const isClosed = discussion?.status === 'CLOSED'
  const canReply = !!user && !isClosed

  const refresh = async () => {
    if (!Number.isFinite(discussionId)) return
    setLoading(true)
    try {
      const d = await discussionService.getDiscussionDetail(discussionId)
      setDiscussion(d)
      setReplies(Array.isArray(d.replies) ? d.replies : [])
    } catch (e: any) {
      message.error(e?.message || '获取讨论详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [discussionId])

  const handleLike = async (reply: DiscussionReply) => {
    if (!user) {
      message.warning('请先登录')
      return
    }
    try {
      const result = await discussionService.likeReply(discussionId, reply.id)
      setReplies(prev => prev.map(r =>
        r.id === reply.id
          ? { ...r, isLiked: result.liked, likeCount: result.likeCount }
          : r
      ))
    } catch {
      message.error('操作失败，请重试')
    }
  }

  const onSubmit = async () => {
    if (!canReply) {
      message.warning(isClosed ? '讨论已关闭，无法回复' : '请先登录')
      return
    }
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await discussionService.replyDiscussion(discussionId, values.content)
      message.success('回复已发送')
      form.resetFields()
      await refresh()
    } catch (e: any) {
      message.error(e?.message || '回复失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card
          loading={loading}
          title={
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backTo)}>
                返回
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                {discussion?.title || '讨论详情'}
              </Title>
            </Space>
          }
        >
          <Space wrap>
            <Text type="secondary">课程：{discussion?.course?.title ?? '-'}</Text>
            <Text type="secondary">作者：{discussion?.author?.username ?? '-'}</Text>
            <Text type="secondary">创建：{formatTime(discussion?.createdAt)}</Text>
            <Tag color={discussion?.status === 'CLOSED' ? 'default' : 'green'}>
              {discussion?.status === 'CLOSED' ? '已关闭' : '进行中'}
            </Tag>
          </Space>
          <div style={{ marginTop: 12 }}>
            <Text>{discussion?.content}</Text>
          </div>
        </Card>

        <Card title={`回复（${replies.length}）`} loading={loading}>
          <List
            dataSource={replies}
            rowKey={r => String(r.id)}
            renderItem={r => (
              <List.Item
                actions={[
                  <Button
                    key="like"
                    type="text"
                    size="small"
                    icon={(r.isLiked ?? false) ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
                    onClick={() => handleLike(r)}
                  >
                    {(r.likeCount ?? 0) > 0 ? r.likeCount : '点赞'}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={r.user?.avatarUrl}
                      icon={!r.user?.avatarUrl && <UserOutlined />}
                    />
                  }
                  title={
                    <Space wrap>
                      <Text strong>{r.user?.username ?? `用户#${r.user?.id}`}</Text>
                      <Text type="secondary">{formatTime(r.createdAt)}</Text>
                      {user?.userId === r.user?.id && <Tag color="blue">我</Tag>}
                    </Space>
                  }
                  description={<Text>{r.content}</Text>}
                />
              </List.Item>
            )}
            locale={{ emptyText: '暂无回复' }}
          />
        </Card>

        <Card title="发表回复">
          <Form form={form} layout="vertical">
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入回复内容' }]}
            >
              <TextArea rows={4} placeholder={canReply ? '请输入回复内容' : '登录后可回复'} disabled={!canReply} />
            </Form.Item>
            <Button type="primary" icon={<SendOutlined />} onClick={onSubmit} loading={submitting} disabled={!canReply}>
              发送
            </Button>
          </Form>
        </Card>
      </Space>
    </div>
  )
}

export default DiscussionDetailPage

import React, { useEffect, useState } from 'react'
import { Alert, Avatar, Button, Card, Form, Input, List, Space, Tag, Typography, message, Tooltip } from 'antd'
import { ArrowLeftOutlined, LikeFilled, LikeOutlined, StarFilled, StarOutlined, SendOutlined, UserOutlined, RobotOutlined, EyeOutlined, FireOutlined } from '@ant-design/icons'
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

  // 乐观 UI 实现：点击即变色，失败回滚
  const handleLike = async (reply: DiscussionReply) => {
    if (!user) {
      message.warning('请先登录')
      return
    }

    const originalReplies = [...replies]
    const isLiking = !reply.isLiked
    
    // 1. 乐观更新
    setReplies(prev => prev.map(r => 
      r.id === reply.id 
        ? { ...r, isLiked: isLiking, likeCount: r.likeCount + (isLiking ? 1 : -1) } 
        : r
    ))

    try {
      // 2. 后端请求
      await discussionService.likeReply(discussionId, reply.id)
    } catch (err: any) {
      // 3. 失败回滚
      setReplies(originalReplies)
      message.error(err?.response?.data?.error || '点赞失败，请重试')
    }
  }

  const handleFavorite = async (reply: DiscussionReply) => {
    if (!user) {
      message.warning('请先登录')
      return
    }

    const originalReplies = [...replies]
    const isFavoriting = !reply.isFavorited

    // 1. 乐观更新
    setReplies(prev => prev.map(r => 
      r.id === reply.id 
        ? { ...r, isFavorited: isFavoriting, favCount: r.favCount + (isFavoriting ? 1 : -1) } 
        : r
    ))

    try {
      // 2. 后端请求
      await discussionService.favoriteReply(discussionId, reply.id)
    } catch (err: any) {
      // 3. 失败回滚
      setReplies(originalReplies)
      message.error(err?.response?.data?.error || '收藏失败，请重试')
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
          extra={
            <Space size="middle">
              <Tooltip title="浏览量">
                <Text type="secondary"><EyeOutlined /> {discussion?.views ?? 0}</Text>
              </Tooltip>
              <Tooltip title="热度值">
                <Text type="danger"><FireOutlined /> {discussion?.heatScore?.toFixed(1) ?? '0.0'}</Text>
              </Tooltip>
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

          {(discussion as any)?.aiDraft && (
            <div style={{ marginTop: 16 }}>
              <Tooltip title={`AI Confidence: ${(discussion as any).confidenceScore * 100}%`}>
                <Alert
                  message={<span><RobotOutlined style={{ marginRight: 8 }} />AI 智能摘要</span>}
                  description={
                    <div>
                      <Text italic>{(discussion as any).aiDraft}</Text>
                      {(discussion as any).linkedKnowledge && (
                        <div style={{ marginTop: 8 }}>
                          <Button type="link" size="small" href={(discussion as any).linkedKnowledge} target="_blank">关联知识点</Button>
                        </div>
                      )}
                    </div>
                  }
                  type="info"
                  showIcon={false}
                />
              </Tooltip>
            </div>
          )}
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
                    icon={r.isLiked ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
                    onClick={() => handleLike(r)}
                  >
                    {r.likeCount > 0 ? r.likeCount : '点赞'}
                  </Button>,
                   <Button
                    key="favorite"
                    type="text"
                    size="small"
                    icon={r.isFavorited ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    onClick={() => handleFavorite(r)}
                  >
                    {r.favCount > 0 ? r.favCount : '收藏'}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar src={r.user?.avatarUrl} icon={!r.user?.avatarUrl && <UserOutlined />} />}
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
            <Form.Item name="content" rules={[{ required: true, message: '请输入回复内容' }]}>
              <TextArea rows={4} placeholder={canReply ? '请输入回复内容' : '登录后可回复'} disabled={!canReply} />
            </Form.Item>
            <Button type="primary" icon={<SendOutlined />} onClick={onSubmit} loading={submitting} disabled={!canReply}>发送</Button>
          </Form>
        </Card>
      </Space>
    </div>
  )
}

export default DiscussionDetailPage

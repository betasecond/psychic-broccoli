import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, List, Space, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { discussionService, type Discussion, type DiscussionReply } from '../../services/discussionService'
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
  const [discussion, setDiscussion] = useState<Discussion | null>(null)
  const [replies, setReplies] = useState<DiscussionReply[]>([])
  const [form] = Form.useForm<{ content: string }>()

  const isClosed = discussion?.status === 'closed'
  const canReply = !!user && !isClosed

  const refresh = async () => {
    if (!Number.isFinite(discussionId)) return
    setLoading(true)
    try {
      const d = await discussionService.getDiscussion(discussionId)
      setDiscussion(d)
      // 后端详情接口已返回 repliesList；为了稳妥，也允许 fallback 到单独拉 replies
      if (Array.isArray(d.repliesList)) {
        setReplies(d.repliesList)
      } else {
        const rs = await discussionService.getReplies(discussionId)
        setReplies(Array.isArray(rs) ? rs : [])
      }
    } catch (e: any) {
      message.error(e?.message || '获取讨论详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [discussionId])

  const headerMeta = useMemo(() => {
    if (!discussion) return null
    return (
      <Space wrap>
        <Text type="secondary">课程：{discussion.courseTitle || discussion.courseId}</Text>
        <Text type="secondary">作者：{discussion.authorName || discussion.authorId}</Text>
        <Text type="secondary">创建：{formatTime(discussion.createdAt)}</Text>
        <Text type="secondary">最后回复：{formatTime(discussion.lastReplyAt || discussion.createdAt)}</Text>
        <Tag color={discussion.status === 'closed' ? 'default' : 'green'}>
          {discussion.status === 'closed' ? '已关闭' : '进行中'}
        </Tag>
      </Space>
    )
  }, [discussion])

  const onSubmit = async () => {
    if (!canReply) {
      message.warning(isClosed ? '讨论已关闭，无法回复' : '请先登录')
      return
    }
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await discussionService.createReply(discussionId, { content: values.content })
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
          {headerMeta}
          <div style={{ marginTop: 12 }}>
            <Text>{discussion?.content}</Text>
          </div>
        </Card>

        <Card title={`回复（${replies.length}）`} loading={loading}>
          <List
            dataSource={replies}
            rowKey={r => String(r.id)}
            renderItem={r => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <Text strong>{r.authorName || `用户#${r.authorId}`}</Text>
                      <Text type="secondary">{formatTime(r.createdAt)}</Text>
                      {user?.userId === r.authorId && <Tag color="blue">我</Tag>}
                    </Space>
                  }
                  description={<Text>{r.content}</Text>}
                />
              </List.Item>
            )}
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





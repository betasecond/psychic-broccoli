import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Card,
  Button,
  Input,
  List,
  Avatar,
  Space,
  Tag,
  message,
  Spin,
  Modal,
} from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  CommentOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { discussionService } from '@/services'
import type { DiscussionDetail, DiscussionReply } from '@/services/discussionService'
import { useAppSelector } from '@/store'
import './DiscussionDetailPage.css'

const { TextArea } = Input

const DiscussionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAppSelector((state) => state.auth.user)
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const backPath = location.pathname.startsWith('/teacher') ? '/teacher/discussions' : '/student/discussions'

  useEffect(() => {
    if (!id) return
    fetchDiscussionDetail(parseInt(id))
  }, [id])

  const fetchDiscussionDetail = async (discussionId: number) => {
    setLoading(true)
    try {
      const data = await discussionService.getDiscussionDetail(discussionId)
      setDiscussion(data)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取讨论详情失败')
      navigate(backPath)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!id || !replyContent.trim()) {
      message.warning('请输入回复内容')
      return
    }

    setSubmitting(true)
    try {
      const newReply = await discussionService.replyDiscussion(
        parseInt(id),
        replyContent
      )
      message.success('回复成功')
      setReplyContent('')

      // 更新讨论详情
      if (discussion) {
        setDiscussion({
          ...discussion,
          replies: [...(discussion.replies || []), newReply],
          replyCount: (discussion.replyCount || 0) + 1,
        })
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '回复失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseDiscussion = async () => {
    if (!id) return

    Modal.confirm({
      title: '确认关闭讨论',
      content: '关闭后将无法继续回复，确定要关闭此讨论吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await discussionService.closeDiscussion(parseInt(id))
          message.success('讨论已关闭')
          fetchDiscussionDetail(parseInt(id))
        } catch (error: any) {
          message.error(error.response?.data?.error || '关闭失败')
        }
      },
    })
  }

  const handleDeleteDiscussion = async () => {
    if (!id) return

    Modal.confirm({
      title: '确认删除讨论',
      content: '删除后无法恢复，确定要删除此讨论吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await discussionService.deleteDiscussion(parseInt(id))
          message.success('讨论已删除')
          navigate(backPath)
        } catch (error: any) {
          message.error(error.response?.data?.error || '删除失败')
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!discussion) {
    return (
      <div className="error-container">
        <h2>讨论不存在</h2>
        <Button onClick={() => navigate(backPath)}>返回列表</Button>
      </div>
    )
  }

  const isAuthor = currentUser?.userId === discussion.author?.id
  const isClosed = discussion.status === 'CLOSED'
  const canManage = isAuthor || currentUser?.role === 'INSTRUCTOR' || currentUser?.role === 'ADMIN'

  return (
    <div className="discussion-detail-page">
      <div className="page-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(backPath)}
          style={{ marginRight: 16 }}
        >
          返回
        </Button>
      </div>

      <Card className="discussion-card">
        <div className="discussion-header">
          <div className="title-section">
            <h2>{discussion.title}</h2>
            <Tag color={isClosed ? 'default' : 'green'}>
              {isClosed ? '已关闭' : '进行中'}
            </Tag>
          </div>

          {canManage && (
            <Space>
              {!isClosed && (
                <Button
                  icon={<CloseCircleOutlined />}
                  onClick={handleCloseDiscussion}
                >
                  关闭讨论
                </Button>
              )}
              {canManage && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteDiscussion}
                >
                  删除
                </Button>
              )}
            </Space>
          )}
        </div>

        <div className="discussion-meta">
          <Space size="large">
            {discussion.course && <span>课程：{discussion.course.title}</span>}
            {discussion.author && <span>发起人：{discussion.author.username}</span>}
            <span>
              <CommentOutlined /> {discussion.replyCount || 0} 回复
            </span>
            <span>{new Date(discussion.createdAt).toLocaleString('zh-CN')}</span>
          </Space>
        </div>

        {discussion.content && (
          <div className="discussion-content">
            <p>{discussion.content}</p>
          </div>
        )}
      </Card>

      <Card className="replies-card" title={`${discussion.replyCount || 0} 条回复`}>
        <List
          dataSource={discussion.replies || []}
          renderItem={(reply: DiscussionReply) => (
            <List.Item className="reply-item">
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={reply.user.avatarUrl}
                    icon={!reply.user.avatarUrl && <UserOutlined />}
                  />
                }
                title={
                  <div className="reply-header">
                    <span className="reply-username">{reply.user.username}</span>
                    <span className="reply-time">
                      {new Date(reply.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                }
                description={<div className="reply-content">{reply.content}</div>}
              />
            </List.Item>
          )}
          locale={{
            emptyText: '暂无回复，快来发表第一条回复吧！',
          }}
        />
      </Card>

      {!isClosed && (
        <Card className="reply-input-card" title="发表回复">
          <TextArea
            placeholder="请输入你的回复..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={4}
            maxLength={1000}
            showCount
          />
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Button
              type="primary"
              onClick={handleReply}
              loading={submitting}
              disabled={!replyContent.trim()}
            >
              发表回复
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DiscussionDetailPage

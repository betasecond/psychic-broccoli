import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Steps,
  Typography,
  message,
  Row,
  Col,
  Spin,
  Tag,
  Space,
  Divider,
  Alert,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  StopOutlined,
  CopyOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { liveService } from '@/services'
import type { LiveSession } from '@/services/liveService'
import LiveChat from '@/components/LiveChat'
import './LiveStreamPage.css'

const { Title, Paragraph, Text } = Typography

const LiveStreamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [liveInfo, setLiveInfo] = useState<LiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewersCount, setViewersCount] = useState(0)

  useEffect(() => {
    if (!id) return

    const liveId = parseInt(id)
    fetchLiveInfo(liveId)

    // 定时更新观看人数
    const interval = setInterval(async () => {
      try {
        const result = await liveService.getViewers(liveId)
        setViewersCount(result.viewersCount)
      } catch (error) {
        console.error('获取观看人数失败', error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [id])

  const fetchLiveInfo = async (liveId: number) => {
    setLoading(true)
    try {
      const data = await liveService.getLiveDetail(liveId)
      setLiveInfo(data)
      setViewersCount(data.viewersCount)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取直播信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handleStartLive = async () => {
    if (!id) return
    try {
      await liveService.startLive(parseInt(id))
      message.success('直播已开始')
      fetchLiveInfo(parseInt(id))
    } catch (error: any) {
      message.error(error.response?.data?.error || '开始直播失败')
    }
  }

  const handleEndLive = async () => {
    if (!id) return
    try {
      await liveService.endLive(parseInt(id))
      message.success('直播已结束')
      fetchLiveInfo(parseInt(id))
    } catch (error: any) {
      message.error(error.response?.data?.error || '结束直播失败')
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success(`${label}已复制到剪贴板`)
      },
      () => {
        message.error('复制失败，请手动复制')
      }
    )
  }

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!liveInfo) {
    return (
      <div className="error-container">
        <h2>直播不存在</h2>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    )
  }

  const isLive = liveInfo.status === 'LIVE'
  const isEnded = liveInfo.status === 'ENDED'
  const isScheduled = liveInfo.status === 'SCHEDULED'

  // 从完整的推流地址中提取服务器和密钥
  const extractStreamInfo = (pushURL: string) => {
    if (!pushURL) return { server: '', key: '' }

    // 格式: rtmp://domain/app/streamName?params
    const match = pushURL.match(/^(rtmp:\/\/[^\/]+\/[^\/]+)\/(.+)$/)
    if (match) {
      return {
        server: match[1], // rtmp://domain/app
        key: match[2],    // streamName?params
      }
    }
    return { server: pushURL, key: '' }
  }

  const streamInfo = liveInfo.pushURL ? extractStreamInfo(liveInfo.pushURL) : { server: '', key: '' }

  const currentStep = isScheduled ? 0 : isLive ? 1 : 2

  return (
    <div className="live-stream-page">
      <div className="page-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/teacher/live')}
          style={{ marginRight: 16 }}
        >
          返回
        </Button>
        <div className="header-info">
          <h2>{liveInfo.title}</h2>
          <Space>
            <Tag color={isLive ? 'green' : isEnded ? 'default' : 'blue'}>
              {isLive ? '直播中' : isEnded ? '已结束' : '预定'}
            </Tag>
            <div className="viewers-info">
              <EyeOutlined />
              <span>{viewersCount} 人观看</span>
            </div>
          </Space>
        </div>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card className="control-card">
            <Steps
              current={currentStep}
              items={[
                { title: '配置推流' },
                { title: '正在直播' },
                { title: '直播结束' },
              ]}
            />

            <Divider />

            {!isEnded && (
              <>
                <Title level={4}>第一步：使用 OBS 推流</Title>

                <Alert
                  message="提示"
                  description="请确保已安装 OBS Studio。如果尚未安装，请访问 https://obsproject.com/ 下载。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Paragraph>
                  <ol>
                    <li>打开 OBS Studio</li>
                    <li>点击"设置" → "推流"</li>
                    <li>服务选择"自定义"</li>
                    <li>配置以下信息：</li>
                  </ol>
                </Paragraph>

                <Card style={{ background: '#fafafa', marginBottom: 16 }}>
                  <Paragraph>
                    <Text strong>推流地址（服务器）：</Text>
                    <br />
                    <Space>
                      <Text code copyable={false}>
                        {streamInfo.server || '加载中...'}
                      </Text>
                      {streamInfo.server && (
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() =>
                            copyToClipboard(streamInfo.server, '推流地址')
                          }
                        >
                          复制
                        </Button>
                      )}
                    </Space>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>推流密钥（串流密钥）：</Text>
                    <br />
                    <Space>
                      <Text code copyable={false}>
                        {streamInfo.key || '加载中...'}
                      </Text>
                      {streamInfo.key && (
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() =>
                            copyToClipboard(streamInfo.key, '推流密钥')
                          }
                        >
                          复制
                        </Button>
                      )}
                    </Space>
                  </Paragraph>
                </Card>

                <Title level={4}>第二步：开始推流</Title>
                <Paragraph>
                  <ol>
                    <li>在 OBS 中添加场景和来源（摄像头、屏幕共享等）</li>
                    <li>点击 OBS 的"开始推流"按钮</li>
                    <li>等待连接成功后，点击下方"开始直播"按钮</li>
                  </ol>
                </Paragraph>

                <Space size="middle">
                  {isScheduled && (
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={handleStartLive}
                    >
                      开始直播
                    </Button>
                  )}

                  {isLive && (
                    <Button
                      danger
                      size="large"
                      icon={<StopOutlined />}
                      onClick={handleEndLive}
                    >
                      结束直播
                    </Button>
                  )}
                </Space>

                {isLive && (
                  <Alert
                    message="直播进行中"
                    description={`当前有 ${viewersCount} 人正在观看您的直播。请在 OBS 中确保推流正常。`}
                    type="success"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </>
            )}

            {isEnded && (
              <div className="ended-info">
                <Alert
                  message="直播已结束"
                  description="本次直播已成功结束，感谢您的参与！"
                  type="info"
                  showIcon
                />
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="chat-card" title="实时聊天">
            <LiveChat liveId={parseInt(id!)} isInstructor={true} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default LiveStreamPage

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Badge, Button, message, Row, Col, Spin } from 'antd'
import { EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { liveService } from '@/services'
import type { LiveSession } from '@/services/liveService'
import LiveChat from '@/components/LiveChat'
import ReactPlayer from 'react-player'
import './WatchLivePage.css'

const WatchLivePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [liveInfo, setLiveInfo] = useState<LiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewersCount, setViewersCount] = useState(0)

  useEffect(() => {
    if (!id) return

    const liveId = parseInt(id)

    // 获取直播信息
    const fetchLiveInfo = async () => {
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

    fetchLiveInfo()

    // 加入直播
    liveService.joinLive(liveId).catch(() => {})

    // 定时更新观看人数
    const interval = setInterval(async () => {
      try {
        const result = await liveService.getViewers(liveId)
        setViewersCount(result.viewersCount)
      } catch (error) {
        console.error('获取观看人数失败', error)
      }
    }, 5000)

    // 离开直播
    return () => {
      clearInterval(interval)
      liveService.leaveLive(liveId).catch(() => {})
    }
  }, [id])

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

  return (
    <div className="watch-live-page">
      <div className="page-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginRight: 16 }}
        >
          返回
        </Button>
        <h2>{liveInfo.title}</h2>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card className="video-card">
            <div className="video-header">
              <Badge
                status={isLive ? 'processing' : 'default'}
                text={
                  <span className="live-status">
                    {isLive ? '直播中' : liveInfo.status === 'ENDED' ? '已结束' : '未开始'}
                  </span>
                }
              />
              <div className="viewers-info">
                <EyeOutlined />
                <span>{viewersCount} 人正在观看</span>
              </div>
            </div>

            <div className="video-container">
              {isLive ? (
                <ReactPlayer
                  url={liveInfo.playURL}
                  playing
                  controls
                  width="100%"
                  height="100%"
                  config={{
                    file: {
                      attributes: {
                        controlsList: 'nodownload',
                      },
                      hlsOptions: {
                        forceHLS: true,
                        debug: false,
                      },
                    },
                  }}
                  onError={(error) => {
                    console.error('播放错误', error)
                    message.error('视频播放失败，请检查网络连接')
                  }}
                />
              ) : (
                <div className="video-placeholder">
                  <p>
                    {liveInfo.status === 'ENDED'
                      ? '直播已结束'
                      : '直播尚未开始，请稍后...'}
                  </p>
                </div>
              )}
            </div>

            <div className="video-info">
              <h3>{liveInfo.title}</h3>
              {liveInfo.description && <p>{liveInfo.description}</p>}
              <div className="meta-info">
                <span>课程：{liveInfo.course.title}</span>
                <span>讲师：{liveInfo.instructor.username}</span>
                {liveInfo.startedAt && (
                  <span>
                    开始时间：
                    {new Date(liveInfo.startedAt).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="chat-card">
            <LiveChat liveId={parseInt(id!)} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default WatchLivePage

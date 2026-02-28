import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Button, Typography, Space, Table, Tabs,
  Calendar, Badge, Tag, Spin, Empty,
} from 'antd'
import {
  CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined,
  SyncOutlined, PlayCircleOutlined, FileTextOutlined, VideoCameraOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { CalendarMode } from 'antd/es/calendar/generateCalendar'
import dayjs from 'dayjs'
import { assignmentService, examService, liveService } from '@/services'
import type { Assignment } from '@/services/assignmentService'
import type { Exam } from '@/services/examService'
import type { LiveSession } from '@/services/liveService'

const { Title, Text } = Typography

const SchedulePage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [aRes, eRes, lRes] = await Promise.allSettled([
          assignmentService.getMyAssignments(),
          examService.getMyExams(),
          liveService.getLiveList(),
        ])
        if (aRes.status === 'fulfilled') {
          const all = aRes.value?.data?.assignments || []
          setAssignments(all.filter((a: Assignment) => !a.submitted))
        }
        if (eRes.status === 'fulfilled') {
          setExams(eRes.value?.data?.exams || [])
        }
        if (lRes.status === 'fulfilled') {
          setLiveSessions((lRes.value as LiveSession[]) || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // 考试日期 → 标记日历
  const examDateMap = new Map<string, Exam[]>()
  exams.forEach(exam => {
    const d = dayjs(exam.startTime).format('YYYY-MM-DD')
    if (!examDateMap.has(d)) examDateMap.set(d, [])
    examDateMap.get(d)!.push(exam)
  })

  const dateCellRender = (value: any) => {
    const dateStr = value.format('YYYY-MM-DD')
    const dayExams = examDateMap.get(dateStr) || []
    return dayExams.length > 0 ? (
      <div>
        {dayExams.map(e => (
          <div key={e.id} style={{ fontSize: 11, color: '#52c41a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <CheckCircleOutlined /> {e.title}
          </div>
        ))}
      </div>
    ) : null
  }

  const onPanelChange = (_: any, __: CalendarMode) => {}

  // 近期安排：最近7天内的考试 + 3天内截止的作业 + 进行中的直播
  const now = dayjs()
  const upcomingExam = exams.find(e => !e.submitted && dayjs(e.startTime).isAfter(now))
  const urgentAssignment = assignments.find(a => a.deadline && dayjs(a.deadline).diff(now, 'day') <= 3)
  const liveNow = liveSessions.find(l => l.status === 'LIVE')

  // ── 直播课程列 ──
  const liveColumns = [
    {
      title: '直播标题',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '所属课程',
      key: 'course',
      render: (_: any, r: LiveSession) => r.course?.title || '-',
    },
    {
      title: '预定时间',
      key: 'time',
      render: (_: any, r: LiveSession) =>
        r.scheduledTime ? (
          <Space><CalendarOutlined />{dayjs(r.scheduledTime).format('MM-DD HH:mm')}</Space>
        ) : '-',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, r: LiveSession) => {
        const map = {
          SCHEDULED: <Badge status="default" text="待开播" />,
          LIVE: <Badge status="processing" text="直播中" />,
          ENDED: <Badge status="default" text="已结束" />,
        }
        return map[r.status] || '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, r: LiveSession) =>
        r.status === 'LIVE' ? (
          <Button type="primary" size="small" icon={<PlayCircleOutlined />}
            onClick={() => navigate(`/student/live/${r.id}`)}>
            进入直播
          </Button>
        ) : r.status === 'SCHEDULED' ? (
          <Button size="small" icon={<VideoCameraOutlined />}
            onClick={() => navigate(`/student/live/${r.id}`)}>
            查看预告
          </Button>
        ) : null,
    },
  ]

  // ── 待完成作业列 ──
  const assignmentColumns = [
    {
      title: '作业名称',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '所属课程',
      dataIndex: 'courseTitle',
      key: 'courseTitle',
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (d: string) => {
        if (!d) return <Text type="secondary">无截止日期</Text>
        const diff = dayjs(d).diff(now, 'day')
        const color = diff <= 1 ? 'red' : diff <= 3 ? 'orange' : undefined
        return (
          <Space>
            <CalendarOutlined />
            <Text type={color === 'red' ? 'danger' : color === 'orange' ? 'warning' : undefined}>
              {dayjs(d).format('MM-DD HH:mm')}
              {diff >= 0 && ` (还剩 ${diff} 天)`}
              {diff < 0 && ' (已过期)'}
            </Text>
          </Space>
        )
      },
    },
    {
      title: '状态',
      key: 'status',
      render: () => <Badge status="warning" text="待提交" />,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, r: Assignment) => (
        <Button type="primary" size="small" icon={<FileTextOutlined />}
          onClick={() => navigate(`/student/assignments/${r.id}`)}>
          去完成
        </Button>
      ),
    },
  ]

  // ── 我的考试列 ──
  const examColumns = [
    {
      title: '考试名称',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '所属课程',
      dataIndex: 'courseTitle',
      key: 'courseTitle',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (t: string) => <Space><CalendarOutlined />{dayjs(t).format('MM-DD HH:mm')}</Space>,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (t: string) => dayjs(t).format('MM-DD HH:mm'),
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, r: Exam) => {
        if (r.submitted) return <Tag color="green">已提交</Tag>
        if (dayjs(r.endTime).isBefore(now)) return <Tag color="default">已结束</Tag>
        if (dayjs(r.startTime).isAfter(now)) return <Tag color="blue">待开始</Tag>
        return <Tag color="orange">进行中</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, r: Exam) => {
        if (r.submitted) return <Button size="small" onClick={() => navigate(`/student/exams/${r.id}`)}>查看结果</Button>
        const isActive = dayjs(r.startTime).isBefore(now) && dayjs(r.endTime).isAfter(now)
        if (isActive) return (
          <Button type="primary" size="small" onClick={() => navigate(`/student/exams/${r.id}/take`)}>
            参加考试
          </Button>
        )
        return null
      },
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>课程表</Title>
        <Text type="secondary">您的学习计划与考试安排</Text>
      </div>

      <Row gutter={[16, 16]}>
        {/* 日历 */}
        <Col xs={24} md={16}>
          <Card>
            <Calendar dateCellRender={dateCellRender} onPanelChange={onPanelChange} fullscreen={false} />
          </Card>
        </Col>

        {/* 近期安排 */}
        <Col xs={24} md={8}>
          <Card title="近期安排">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {liveNow && (
                <div style={{ padding: 12, background: '#e6f7ff', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <PlayCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    <Text strong>直播进行中</Text>
                  </div>
                  <Text>{liveNow.title} · {liveNow.course?.title}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Button type="primary" block onClick={() => navigate(`/student/live/${liveNow.id}`)}>
                      进入直播
                    </Button>
                  </div>
                </div>
              )}

              {upcomingExam && (
                <div style={{ padding: 12, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <Text strong>即将考试</Text>
                  </div>
                  <Text>{upcomingExam.title}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <CalendarOutlined /> {dayjs(upcomingExam.startTime).format('MM-DD HH:mm')}
                    </Text>
                  </div>
                </div>
              )}

              {urgentAssignment && (
                <div style={{ padding: 12, background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <SyncOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                    <Text strong>作业即将截止</Text>
                  </div>
                  <Text>{urgentAssignment.title}</Text>
                  {urgentAssignment.deadline && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        截止 {dayjs(urgentAssignment.deadline).format('MM-DD HH:mm')}
                      </Text>
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" block onClick={() => navigate(`/student/assignments/${urgentAssignment.id}`)}>
                      去完成
                    </Button>
                  </div>
                </div>
              )}

              {!liveNow && !upcomingExam && !urgentAssignment && (
                <Empty description="暂无近期安排" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="assignments" style={{ marginTop: 16 }} items={[
        {
          key: 'live',
          label: <Space><PlayCircleOutlined />直播课程</Space>,
          children: (
            <Card>
              <Table
                dataSource={liveSessions.filter(l => l.status !== 'ENDED')}
                columns={liveColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="暂无直播课程" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </Card>
          ),
        },
        {
          key: 'assignments',
          label: <Space><FileTextOutlined />待完成作业 {assignments.length > 0 && <Badge count={assignments.length} />}</Space>,
          children: (
            <Card>
              <Table
                dataSource={assignments}
                columns={assignmentColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="暂无待完成作业" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </Card>
          ),
        },
        {
          key: 'exams',
          label: <Space><CheckCircleOutlined />我的考试</Space>,
          children: (
            <Card>
              <Table
                dataSource={exams}
                columns={examColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="暂无考试安排" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </Card>
          ),
        },
      ]} />
    </div>
  )
}

export default SchedulePage

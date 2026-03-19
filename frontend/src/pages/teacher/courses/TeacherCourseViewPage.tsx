import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, Space, Spin, Tag, Button,
  Collapse, List, Statistic, Divider, message, Badge,
  Upload, Table, Popconfirm,
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, BookOutlined,
  PlayCircleOutlined, FileTextOutlined, TeamOutlined,
  FolderOpenOutlined, BarChartOutlined, FileOutlined,
  DownOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, DeleteOutlined, DatabaseOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { courseService, type CourseSection } from '@/services/courseService'
import ragService, { type RagDocument } from '@/services/ragService'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

const TeacherCourseViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const courseId = Number(id)

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [sections, setSections] = useState<Record<number, CourseSection[]>>({})
  const [stats, setStats] = useState<any>(null)
  const [ragDocs, setRagDocs] = useState<RagDocument[]>([])
  const [ragUploading, setRagUploading] = useState(false)

  useEffect(() => {
    if (!courseId) return
    const load = async () => {
      setLoading(true)
      try {
        const [courseRes, chaptersRes, statsRes] = await Promise.all([
          courseService.getCourse(courseId),
          courseService.getChapters(courseId),
          courseService.getCourseStatistics(courseId).catch(() => null),
        ])
        setCourse(courseRes)
        const chData = chaptersRes as any
        const chapterList = Array.isArray(chData) ? chData : (chData?.chapters || [])
        setChapters(chapterList)
        setStats((statsRes as any)?.data || statsRes)

        // 批量加载每章节的课时
        const map: Record<number, CourseSection[]> = {}
        await Promise.all(
          chapterList.map(async (ch: any) => {
            try { map[ch.id] = await courseService.getSections(courseId, ch.id) }
            catch { map[ch.id] = [] }
          })
        )
        setSections(map)
      } catch {
        message.error('加载课程信息失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [courseId])

  const loadRagDocs = async () => {
    try {
      const docs = await ragService.listDocuments(courseId)
      setRagDocs(Array.isArray(docs) ? docs : [])
    } catch {
      // 忽略权限错误（课程未发布时可能无法访问）
    }
  }

  useEffect(() => {
    if (courseId) loadRagDocs()
  }, [courseId])

  const handleRagUpload = async (file: File) => {
    setRagUploading(true)
    try {
      await ragService.uploadDocument(courseId, file)
      message.success(`已上传 ${file.name}，正在向量化...`)
      await loadRagDocs()
    } catch (e: any) {
      message.error(e?.message || '上传失败')
    } finally {
      setRagUploading(false)
    }
    return false // 阻止 antd Upload 默认行为
  }

  const handleRagDelete = async (docId: number) => {
    try {
      await ragService.deleteDocument(courseId, docId)
      message.success('已删除')
      setRagDocs(prev => prev.filter(d => d.id !== docId))
    } catch (e: any) {
      message.error(e?.message || '删除失败')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!course) {
    return (
      <div style={{ padding: 24 }}>
        <Card><Text>课程不存在或无权限查看</Text></Card>
      </div>
    )
  }

  const statusMap: Record<string, { color: string; label: string }> = {
    PUBLISHED: { color: 'green', label: '已发布' },
    DRAFT:     { color: 'orange', label: '草稿' },
    ARCHIVED:  { color: 'default', label: '已归档' },
  }
  const statusInfo = statusMap[course.status] || statusMap.DRAFT

  const totalSections = chapters.reduce((s, ch) => s + (sections[ch.id]?.length || 0), 0)

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部返回 + 操作栏 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher/courses')}>
          返回课程列表
        </Button>
        <Space wrap>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}
          >
            编辑课程
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* ── 左栏：课程信息 + 章节结构 ── */}
        <Col xs={24} lg={17}>
          {/* 课程基本信息 */}
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Space align="start" style={{ flexWrap: 'wrap' }}>
                  {course.coverImageUrl && (
                    <img
                      src={course.coverImageUrl}
                      alt="课程封面"
                      style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <Title level={3} style={{ marginBottom: 4, marginTop: 0 }}>{course.title}</Title>
                    <Space wrap>
                      <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                      {course.categoryName && <Tag color="blue">{course.categoryName}</Tag>}
                    </Space>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">授课教师：</Text>
                      <Text strong>{course.instructorName || '我'}</Text>
                    </div>
                  </div>
                </Space>
              </div>

              {course.description && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div>
                    <Text strong>课程简介</Text>
                    <Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#666' }}>
                      {course.description}
                    </Paragraph>
                  </div>
                </>
              )}
            </Space>
          </Card>

          {/* 章节与课时结构 */}
          <Card title={
            <Space>
              <FolderOpenOutlined />
              <span>课程内容</span>
              <Badge count={chapters.length} color="#1890ff" />
              <Text type="secondary" style={{ fontSize: 13 }}>（共 {totalSections} 课时）</Text>
            </Space>
          }>
            {chapters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <FolderOpenOutlined style={{ fontSize: 36, marginBottom: 12 }} />
                <p>暂无章节，请前往"编辑课程"添加</p>
                <Button type="primary" ghost onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}>
                  去添加章节
                </Button>
              </div>
            ) : (
              <Collapse
                accordion={false}
                defaultActiveKey={chapters.slice(0, 1).map((ch: any) => ch.id)}
                expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
              >
                {chapters.map((chapter: any) => {
                  const chSections = sections[chapter.id] || []
                  return (
                    <Panel
                      key={chapter.id}
                      header={
                        <Space>
                          <Tag color="blue">{chapter.orderIndex}</Tag>
                          <Text strong>{chapter.title}</Text>
                          <Badge
                            count={chSections.length}
                            showZero
                            color="#8c8c8c"
                            style={{ fontSize: 11 }}
                          />
                        </Space>
                      }
                    >
                      {chSections.length === 0 ? (
                        <Text type="secondary" style={{ paddingLeft: 8 }}>本章节暂无课时</Text>
                      ) : (
                        <List
                          size="small"
                          dataSource={chSections}
                          renderItem={(sec) => (
                            <List.Item key={sec.id} style={{ padding: '8px 12px' }}>
                              <List.Item.Meta
                                avatar={
                                  sec.type === 'VIDEO'
                                    ? <Tag icon={<PlayCircleOutlined />} color="blue" style={{ marginRight: 0 }}>视频</Tag>
                                    : <Tag icon={<FileTextOutlined />} color="green" style={{ marginRight: 0 }}>图文</Tag>
                                }
                                title={
                                  <Text style={{ fontSize: 14 }}>
                                    {sec.orderIndex}. {sec.title}
                                  </Text>
                                }
                                description={
                                  sec.videoUrl
                                    ? <Text type="secondary" style={{ fontSize: 12 }}>
                                        {sec.videoUrl.length > 60 ? sec.videoUrl.slice(0, 60) + '...' : sec.videoUrl}
                                      </Text>
                                    : sec.content
                                    ? <Text type="secondary" style={{ fontSize: 12 }}>
                                        {sec.content.length > 80 ? sec.content.slice(0, 80) + '...' : sec.content}
                                      </Text>
                                    : null
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Panel>
                  )
                })}
              </Collapse>
            )}
          </Card>

          {/* 知识库管理 */}
          <Card
            style={{ marginTop: 16 }}
            title={
              <Space>
                <DatabaseOutlined />
                <span>知识库管理</span>
                <Badge count={ragDocs.length} color="#1890ff" showZero />
              </Space>
            }
            extra={
              <Upload
                accept=".txt,.md"
                showUploadList={false}
                beforeUpload={handleRagUpload}
              >
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={ragUploading}
                  size="small"
                >
                  上传文档
                </Button>
              </Upload>
            }
          >
            <div style={{ marginBottom: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                支持 .txt / .md 格式，上传后自动切块并向量化，供学生在"知识库问答"中使用。
              </Typography.Text>
            </div>
            {ragDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
                <DatabaseOutlined style={{ fontSize: 28, marginBottom: 8 }} />
                <p style={{ margin: 0 }}>暂无文档，请上传课程资料</p>
              </div>
            ) : (
              <Table
                size="small"
                dataSource={ragDocs}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: '文件名', dataIndex: 'filename', ellipsis: true },
                  { title: 'Chunks', dataIndex: 'chunk_count', width: 70, align: 'center' as const },
                  { title: '上传时间', dataIndex: 'created_at', width: 110, render: (v: string) => v?.slice(0, 10) },
                  {
                    title: '操作', width: 60, align: 'center' as const,
                    render: (_: any, record: RagDocument) => (
                      <Popconfirm
                        title="确认删除该文档及其所有知识块？"
                        onConfirm={() => handleRagDelete(record.id)}
                        okText="删除" cancelText="取消"
                      >
                        <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>

        {/* ── 右栏：统计 + 快捷操作 ── */}
        <Col xs={24} lg={7}>
          {/* 课程统计 */}
          <Card title="课程数据" style={{ marginBottom: 16 }}>
            <Row gutter={[8, 16]}>
              <Col span={12}>
                <Statistic
                  title="选课学生"
                  value={stats?.studentCount ?? 0}
                  prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="章节数"
                  value={chapters.length}
                  prefix={<BookOutlined style={{ color: '#52c41a' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="课时数"
                  value={totalSections}
                  prefix={<PlayCircleOutlined style={{ color: '#722ed1' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="作业数"
                  value={stats?.assignmentCount ?? 0}
                  prefix={<FileOutlined style={{ color: '#fa8c16' }} />}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="考试数"
                  value={stats?.examCount ?? 0}
                  prefix={<BarChartOutlined style={{ color: '#eb2f96' }} />}
                />
              </Col>
            </Row>
          </Card>

          {/* 课程状态 */}
          <Card title="课程状态" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">发布状态</Text>
                <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">学生可见</Text>
                {course.status === 'PUBLISHED'
                  ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                }
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">创建时间</Text>
                <Text style={{ fontSize: 12 }}>{course.createdAt?.slice(0, 10) || '-'}</Text>
              </div>
            </Space>
          </Card>

          {/* 快捷管理入口 */}
          <Card title="快捷管理">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<EditOutlined />}
                onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}
              >
                编辑课程内容
              </Button>
              <Button
                block
                icon={<FileOutlined />}
                onClick={() => navigate('/teacher/assignments/list')}
              >
                查看课程作业
              </Button>
              <Button
                block
                icon={<BarChartOutlined />}
                onClick={() => navigate('/teacher/exams/list')}
              >
                查看课程考试
              </Button>
              <Button
                block
                icon={<TeamOutlined />}
                onClick={() => navigate('/teacher/students')}
              >
                查看学生列表
              </Button>
              <Button
                block
                icon={<FolderOpenOutlined />}
                onClick={() => navigate('/teacher/courses/materials')}
              >
                课程资料管理
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default TeacherCourseViewPage

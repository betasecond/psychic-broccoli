import React, { useEffect, useRef, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Spin,
  Tag,
  Button,
  Progress,
  message,
  List,
  Collapse,
  Tabs,
  Input,
  Divider,
  Empty,
  Tooltip,
} from 'antd'
import {
  BookOutlined,
  FolderOpenOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  DownOutlined,
  SendOutlined,
  RobotOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import RagApiKeyControl from '../../components/RagApiKeyControl'
import {
  courseService,
  type CourseSection,
  type CourseMaterial,
} from '../../services/courseService'
import { progressService } from '../../services/progressService'
import ragService, {
  type RagQueryHistory,
  type RagSource,
} from '../../services/ragService'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse
const { TextArea } = Input

interface QAItem {
  question: string
  answer: string
  sources: RagSource[]
  loading?: boolean
}

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const courseId = Number(id)

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [sections, setSections] = useState<Record<number, CourseSection[]>>({})
  const [progress, setProgress] = useState(0)
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(
    new Set()
  )
  const [submitting, setSubmitting] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState<CourseSection | null>(null)
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)

  const [qaList, setQaList] = useState<QAItem[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [history, setHistory] = useState<RagQueryHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chapters')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!courseId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [courseRes, chaptersRes] = await Promise.all([
          courseService.getCourse(courseId),
          courseService.getChapters(courseId),
        ])

        setCourse(courseRes)
        const chapterList = Array.isArray(chaptersRes)
          ? chaptersRes
          : (chaptersRes as any)?.chapters || []
        setChapters(chapterList)

        const sectionMap: Record<number, CourseSection[]> = {}
        await Promise.all(
          chapterList.map(async (chapter: any) => {
            try {
              sectionMap[chapter.id] = await courseService.getSections(
                courseId,
                chapter.id
              )
            } catch {
              sectionMap[chapter.id] = []
            }
          })
        )
        setSections(sectionMap)

        const myCoursesRes = await courseService.getMyCourses()
        const myCourse = myCoursesRes.courses.find(
          (item: any) => item.id === courseId
        )
        if (myCourse) {
          setProgress(myCourse.progress || 0)
          setCompletedChapters(new Set(myCourse.completedChapterIds || []))
        }

        await fetchMaterials()
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [courseId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [qaList])

  const fetchMaterials = async () => {
    setMaterialsLoading(true)
    try {
      const data = await courseService.getMaterials(courseId)
      setMaterials(data.materials || [])
    } catch (error) {
      console.error('加载课程资料失败', error)
    } finally {
      setMaterialsLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const data = await ragService.getHistory(courseId)
      setHistory(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error(error?.message || '加载问答历史失败')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleAsk = async () => {
    const q = question.trim()
    if (!q) return

    setQuestion('')
    setQaList(prev => [
      ...prev,
      { question: q, answer: '', sources: [], loading: true },
    ])
    setAsking(true)

    try {
      const result = await ragService.query(courseId, q)
      setQaList(prev => [
        ...prev.slice(0, -1),
        {
          question: q,
          answer: result.answer,
          sources: result.sources || [],
          loading: false,
        },
      ])
    } catch (error: any) {
      setQaList(prev => [
        ...prev.slice(0, -1),
        {
          question: q,
          answer: `请求失败：${error?.message || '未知错误'}`,
          sources: [],
          loading: false,
        },
      ])
    } finally {
      setAsking(false)
    }
  }

  const handleCompleteChapter = async (chapterId: number) => {
    setSubmitting(chapterId)
    try {
      const result = await progressService.completeChapter(chapterId)
      message.success(`章节已完成，课程进度更新为 ${result.progress}%`)
      setProgress(result.progress)
      setCompletedChapters(prev => new Set([...prev, chapterId]))
    } catch (error: any) {
      message.error(error?.message || '标记章节完成失败')
    } finally {
      setSubmitting(null)
    }
  }

  const sectionTypeTag = (type: string) =>
    type === 'VIDEO' ? (
      <Tag
        icon={<PlayCircleOutlined />}
        color="blue"
        style={{ marginRight: 0 }}
      >
        视频
      </Tag>
    ) : (
      <Tag icon={<FileTextOutlined />} color="green" style={{ marginRight: 0 }}>
        图文
      </Tag>
    )

  const ragTab = (
    <div style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
      <RagApiKeyControl />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          marginBottom: 12,
        }}
      >
        {qaList.length === 0 && (
          <Empty
            image={
              <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            }
            imageStyle={{ height: 56 }}
            description={
              <Text type="secondary">
                输入课程相关问题，系统会基于知识库返回回答和来源。
              </Text>
            }
            style={{ marginTop: 60 }}
          />
        )}

        {qaList.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  background: '#1890ff',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '16px 16px 4px 16px',
                  maxWidth: '75%',
                  fontSize: 14,
                }}
              >
                {item.question}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <RobotOutlined
                style={{
                  fontSize: 20,
                  color: '#1890ff',
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                {item.loading ? (
                  <Spin size="small" style={{ marginLeft: 4 }} />
                ) : (
                  <div
                    style={{
                      background: '#f5f5f5',
                      padding: '8px 14px',
                      borderRadius: '4px 16px 16px 16px',
                      fontSize: 14,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {item.answer}
                  </div>
                )}

                {!item.loading && item.sources.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      参考来源：
                    </Text>
                    {item.sources.map((src, i) => (
                      <Tooltip
                        key={i}
                        title={`${src.filename} #${src.chunkIndex + 1}\n\n${src.content}`}
                        overlayStyle={{ maxWidth: 400 }}
                      >
                        <Tag
                          style={{
                            cursor: 'pointer',
                            marginTop: 4,
                            fontSize: 11,
                          }}
                        >
                          [{i + 1}] {src.filename} · #{src.chunkIndex + 1}
                        </Tag>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="输入问题，按 Ctrl+Enter 发送"
            autoSize={{ minRows: 2, maxRows: 4 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault()
                handleAsk()
              }
            }}
            disabled={asking}
            style={{ resize: 'none' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAsk}
            loading={asking}
            disabled={!question.trim()}
            style={{ height: 'auto', alignSelf: 'flex-end' }}
          >
            发送
          </Button>
        </Space.Compact>

        <div style={{ marginTop: 8 }}>
          <Button
            size="small"
            type="link"
            icon={<HistoryOutlined />}
            onClick={loadHistory}
            loading={historyLoading}
            style={{ padding: 0 }}
          >
            查看历史记录
          </Button>
          {history.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={history}
                renderItem={item => (
                  <List.Item
                    key={item.id}
                    style={{ cursor: 'pointer', padding: '4px 8px' }}
                    onClick={() =>
                      setQaList(prev => [
                        ...prev,
                        {
                          question: item.question,
                          answer: item.answer,
                          sources: item.sources || [],
                        },
                      ])
                    }
                  >
                    <List.Item.Meta
                      title={
                        <Text style={{ fontSize: 13 }}>{item.question}</Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.created_at?.slice(0, 10)}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!course) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Text>课程不存在</Text>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/student/courses')}
        >
          返回课程列表
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Space>
                  <BookOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <Title level={2} style={{ margin: 0 }}>
                    {course.title}
                  </Title>
                </Space>
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">授课教师：</Text>
                  <Text strong>{course.instructorName}</Text>
                </div>
              </div>

              <div>
                <Title level={4}>课程简介</Title>
                <Paragraph>{course.description || '暂无课程描述'}</Paragraph>
              </div>

              <div>
                <Title level={4}>学习进度</Title>
                <Progress
                  percent={progress}
                  status={progress === 100 ? 'success' : 'active'}
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                />
                <Text
                  type="secondary"
                  style={{ marginTop: 8, display: 'block' }}
                >
                  已完成 {completedChapters.size} / {chapters.length} 章节
                </Text>
              </div>

              <Divider style={{ margin: 0 }} />

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'chapters',
                    label: (
                      <Space>
                        <FolderOpenOutlined />
                        课程章节
                      </Space>
                    ),
                    children: (
                      <div>
                        {chapters.length > 0 ? (
                          <Collapse
                            accordion={false}
                            expandIcon={({ isActive }) => (
                              <DownOutlined rotate={isActive ? 180 : 0} />
                            )}
                          >
                            {chapters.map((chapter: any) => {
                              const isCompleted = completedChapters.has(
                                chapter.id
                              )
                              const chapterSections = sections[chapter.id] || []
                              return (
                                <Panel
                                  key={chapter.id}
                                  header={
                                    <Space>
                                      {isCompleted ? (
                                        <CheckCircleOutlined
                                          style={{ color: '#52c41a' }}
                                        />
                                      ) : (
                                        <FolderOpenOutlined
                                          style={{ color: '#1890ff' }}
                                        />
                                      )}
                                      <Text strong>
                                        第 {chapter.orderIndex} 章
                                      </Text>
                                      <Text>{chapter.title}</Text>
                                      {isCompleted && (
                                        <Tag color="green">已完成</Tag>
                                      )}
                                      {chapterSections.length > 0 && (
                                        <Tag color="default">
                                          {chapterSections.length} 课时
                                        </Tag>
                                      )}
                                    </Space>
                                  }
                                  extra={
                                    <span onClick={e => e.stopPropagation()}>
                                      <Button
                                        type={
                                          isCompleted ? 'default' : 'primary'
                                        }
                                        size="small"
                                        icon={
                                          isCompleted ? (
                                            <CheckCircleOutlined />
                                          ) : (
                                            <ClockCircleOutlined />
                                          )
                                        }
                                        loading={submitting === chapter.id}
                                        onClick={() =>
                                          handleCompleteChapter(chapter.id)
                                        }
                                        disabled={isCompleted}
                                      >
                                        {isCompleted ? '已完成' : '标记完成'}
                                      </Button>
                                    </span>
                                  }
                                >
                                  {chapterSections.length === 0 ? (
                                    <Text
                                      type="secondary"
                                      style={{ paddingLeft: 8 }}
                                    >
                                      本章节暂无课时
                                    </Text>
                                  ) : (
                                    <List
                                      size="small"
                                      dataSource={chapterSections}
                                      renderItem={section => (
                                        <List.Item
                                          key={section.id}
                                          style={{
                                            cursor:
                                              section.type === 'VIDEO' ||
                                              section.type === 'TEXT'
                                                ? 'pointer'
                                                : 'default',
                                            background:
                                              activeSection?.id === section.id
                                                ? '#f0f5ff'
                                                : 'transparent',
                                            borderRadius: 4,
                                            padding: '8px 12px',
                                          }}
                                          onClick={() =>
                                            setActiveSection(
                                              activeSection?.id === section.id
                                                ? null
                                                : section
                                            )
                                          }
                                        >
                                          <List.Item.Meta
                                            avatar={sectionTypeTag(
                                              section.type
                                            )}
                                            title={
                                              <Text style={{ fontSize: 14 }}>
                                                {section.orderIndex}.{' '}
                                                {section.title}
                                              </Text>
                                            }
                                          />
                                        </List.Item>
                                      )}
                                    />
                                  )}
                                  {chapterSections.some(
                                    section => section.id === activeSection?.id
                                  ) &&
                                    activeSection && (
                                      <div
                                        style={{
                                          marginTop: 12,
                                          padding: 16,
                                          background: '#fafafa',
                                          borderRadius: 8,
                                        }}
                                      >
                                        <Title
                                          level={5}
                                          style={{ marginTop: 0 }}
                                        >
                                          {activeSection.title}
                                        </Title>
                                        {activeSection.type === 'VIDEO' &&
                                        activeSection.videoUrl ? (
                                          <div>
                                            <Text
                                              type="secondary"
                                              style={{
                                                display: 'block',
                                                marginBottom: 8,
                                              }}
                                            >
                                              视频链接：
                                            </Text>
                                            <a
                                              href={activeSection.videoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              {activeSection.videoUrl}
                                            </a>
                                          </div>
                                        ) : activeSection.type === 'TEXT' &&
                                          activeSection.content ? (
                                          <Paragraph
                                            style={{
                                              whiteSpace: 'pre-wrap',
                                              marginBottom: 0,
                                            }}
                                          >
                                            {activeSection.content}
                                          </Paragraph>
                                        ) : (
                                          <Text type="secondary">暂无内容</Text>
                                        )}
                                      </div>
                                    )}
                                </Panel>
                              )
                            })}
                          </Collapse>
                        ) : (
                          <Text type="secondary">暂无章节</Text>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'rag',
                    label: (
                      <Space>
                        <DatabaseOutlined />
                        知识库问答
                      </Space>
                    ),
                    children: ragTab,
                  },
                  {
                    key: 'materials',
                    label: (
                      <Space>
                        <CloudDownloadOutlined />
                        资料下载
                      </Space>
                    ),
                    children: (
                      <List
                        loading={materialsLoading}
                        dataSource={materials}
                        renderItem={item => (
                          <List.Item
                            actions={[
                              <Button
                                key={`download-${item.id}`}
                                type="link"
                                icon={<CloudDownloadOutlined />}
                                href={
                                  item.url.startsWith('http')
                                    ? item.url
                                    : `${window.location.origin}${item.url}`
                                }
                                target="_blank"
                              >
                                下载
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <FileTextOutlined
                                  style={{ fontSize: 24, color: '#1890ff' }}
                                />
                              }
                              title={item.name}
                              description={`上传于 ${new Date(item.createdAt).toLocaleDateString()} · 大小 ${(item.size / 1024).toFixed(1)} KB`}
                            />
                          </List.Item>
                        )}
                        locale={{
                          emptyText: <Empty description="暂无相关学习资料" />,
                        }}
                      />
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="课程信息">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">学习进度</Text>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    type="circle"
                    percent={progress}
                    width={80}
                    status={progress === 100 ? 'success' : 'active'}
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    {completedChapters.size} / {chapters.length} 章节已完成
                  </Text>
                </div>
              </div>

              <div>
                <Text type="secondary">分类</Text>
                <div>
                  {course.categoryName ? (
                    <Tag color="blue">{course.categoryName}</Tag>
                  ) : (
                    <Text type="secondary">未分类</Text>
                  )}
                </div>
              </div>

              <div>
                <Text type="secondary">状态</Text>
                <div>
                  <Tag
                    color={course.status === 'PUBLISHED' ? 'green' : 'orange'}
                  >
                    {course.status}
                  </Tag>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default CourseDetailPage

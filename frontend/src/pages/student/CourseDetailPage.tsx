import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Space, Spin, Tag, Button, Progress, message, List, Collapse } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  FolderOpenOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, type CourseSection } from '../../services/courseService';
import { progressService } from '../../services/progressService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [sections, setSections] = useState<Record<number, CourseSection[]>>({});
  const [progress, setProgress] = useState<number>(0);
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<CourseSection | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const courseId = Number(id);
        const [courseRes, chaptersRes] = await Promise.all([
          courseService.getCourse(courseId),
          courseService.getChapters(courseId),
        ]);
        setCourse(courseRes);
        const chData = chaptersRes as any;
        const chapterList = Array.isArray(chData) ? chData : (chData?.chapters || []);
        setChapters(chapterList);

        // 批量加载每章节的课时
        const map: Record<number, CourseSection[]> = {};
        await Promise.all(
          chapterList.map(async (ch: any) => {
            try {
              map[ch.id] = await courseService.getSections(courseId, ch.id);
            } catch {
              map[ch.id] = [];
            }
          })
        );
        setSections(map);

        // 获取我的课程列表来获取进度
        const myCoursesRes = await courseService.getMyCourses();
        const myCourse = myCoursesRes.courses.find((c: any) => c.id === courseId);
        if (myCourse) {
          setProgress(myCourse.progress || 0);
          setCompletedChapters(new Set(myCourse.completedChapterIds || []));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleCompleteChapter = async (chapterId: number) => {
    setSubmitting(chapterId);
    try {
      const result = await progressService.completeChapter(chapterId);
      message.success(`章节已完成！课程进度: ${result.progress}%`);
      setProgress(result.progress);
      setCompletedChapters(prev => new Set([...prev, chapterId]));
    } catch (error: any) {
      message.error(error?.message || '标记失败，请重试');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '24px' }}>
        <Card><Text>课程不存在</Text></Card>
      </div>
    );
  }

  const sectionTypeTag = (type: string) =>
    type === 'VIDEO'
      ? <Tag icon={<PlayCircleOutlined />} color="blue" style={{ marginRight: 0 }}>视频</Tag>
      : <Tag icon={<FileTextOutlined />} color="green" style={{ marginRight: 0 }}>图文</Tag>;

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/courses')}>
          返回课程列表
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        {/* ── 左栏：课程详情 + 章节/课时 ── */}
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 课程标题 */}
              <div>
                <Space>
                  <BookOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={2} style={{ margin: 0 }}>{course.title}</Title>
                </Space>
                <div style={{ marginTop: '12px' }}>
                  <Text type="secondary">授课教师：</Text>
                  <Text strong>{course.instructorName}</Text>
                </div>
              </div>

              {/* 课程简介 */}
              <div>
                <Title level={4}>课程简介</Title>
                <Paragraph>{course.description || '暂无课程描述'}</Paragraph>
              </div>

              {/* 学习进度 */}
              <div>
                <Title level={4}>学习进度</Title>
                <Progress
                  percent={progress}
                  status={progress === 100 ? 'success' : 'active'}
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                />
                <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                  已完成 {completedChapters.size} / {chapters.length} 章节
                </Text>
              </div>

              {/* 课程章节 + 课时 */}
              <div>
                <Title level={4}>课程章节</Title>
                {chapters.length > 0 ? (
                  <Collapse
                    accordion={false}
                    expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
                  >
                    {chapters.map((chapter: any) => {
                      const isCompleted = completedChapters.has(chapter.id);
                      const chSections = sections[chapter.id] || [];
                      return (
                        <Panel
                          key={chapter.id}
                          header={
                            <Space>
                              {isCompleted
                                ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                : <FolderOpenOutlined style={{ color: '#1890ff' }} />}
                              <Text strong>第 {chapter.orderIndex} 章</Text>
                              <Text>{chapter.title}</Text>
                              {isCompleted && <Tag color="green">已完成</Tag>}
                              {chSections.length > 0 && (
                                <Tag color="default">{chSections.length} 课时</Tag>
                              )}
                            </Space>
                          }
                          extra={
                            <span onClick={(e) => e.stopPropagation()}>
                              <Button
                                type={isCompleted ? 'default' : 'primary'}
                                size="small"
                                icon={isCompleted ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                                loading={submitting === chapter.id}
                                onClick={() => handleCompleteChapter(chapter.id)}
                                disabled={isCompleted}
                              >
                                {isCompleted ? '已完成' : '标记完成'}
                              </Button>
                            </span>
                          }
                        >
                          {/* 课时列表 */}
                          {chSections.length === 0 ? (
                            <Text type="secondary" style={{ paddingLeft: 8 }}>本章节暂无课时</Text>
                          ) : (
                            <List
                              size="small"
                              dataSource={chSections}
                              renderItem={(sec) => (
                                <List.Item
                                  key={sec.id}
                                  style={{
                                    cursor: sec.type === 'VIDEO' || sec.type === 'TEXT' ? 'pointer' : 'default',
                                    background: activeSection?.id === sec.id ? '#f0f5ff' : 'transparent',
                                    borderRadius: 4,
                                    padding: '8px 12px',
                                  }}
                                  onClick={() => setActiveSection(activeSection?.id === sec.id ? null : sec)}
                                >
                                  <List.Item.Meta
                                    avatar={sectionTypeTag(sec.type)}
                                    title={
                                      <Text style={{ fontSize: 14 }}>
                                        {sec.orderIndex}. {sec.title}
                                      </Text>
                                    }
                                  />
                                </List.Item>
                              )}
                            />
                          )}

                          {/* 课时内容展示（点击课时后显示） */}
                          {chSections.some(s => s.id === activeSection?.id) && activeSection && (
                            <div style={{ marginTop: 12, padding: '16px', background: '#fafafa', borderRadius: 8 }}>
                              <Title level={5} style={{ marginTop: 0 }}>{activeSection.title}</Title>
                              {activeSection.type === 'VIDEO' && activeSection.videoUrl ? (
                                <div>
                                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>视频链接：</Text>
                                  <a href={activeSection.videoUrl} target="_blank" rel="noopener noreferrer">
                                    {activeSection.videoUrl}
                                  </a>
                                </div>
                              ) : activeSection.type === 'TEXT' && activeSection.content ? (
                                <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                                  {activeSection.content}
                                </Paragraph>
                              ) : (
                                <Text type="secondary">暂无内容</Text>
                              )}
                            </div>
                          )}
                        </Panel>
                      );
                    })}
                  </Collapse>
                ) : (
                  <Text type="secondary">暂无章节</Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>

        {/* ── 右栏：课程信息卡片 ── */}
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
                  {course.categoryName
                    ? <Tag color="blue">{course.categoryName}</Tag>
                    : <Text type="secondary">未分类</Text>}
                </div>
              </div>

              <div>
                <Text type="secondary">状态</Text>
                <div>
                  <Tag color={course.status === 'PUBLISHED' ? 'green' : 'orange'}>{course.status}</Tag>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CourseDetailPage;

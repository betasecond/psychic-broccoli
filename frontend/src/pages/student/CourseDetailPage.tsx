import React, { useEffect, useState, useRef } from 'react';
import {
  Card, Row, Col, Typography, Space, Spin, Tag, Button, Progress,
  message, List, Collapse, Tabs, Input, Divider, Empty, Tooltip,
} from 'antd';
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
  SendOutlined,
  RobotOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, type CourseSection, type CourseMaterial } from '../../services/courseService';
import { progressService } from '../../services/progressService';
import ragService, { type RagQueryHistory, type RagSource } from '../../services/ragService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

interface QAItem {
  question: string;
  answer: string;
  sources: RagSource[];
  loading?: boolean;
}

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
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  // RAG 鐘舵€?
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<RagQueryHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chapters');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const courseId = Number(id);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [courseRes, chaptersRes] = await Promise.all([
          courseService.getCourse(courseId),
          courseService.getChapters(courseId),
        ]);
        setCourse(courseRes);
        const chData = chaptersRes as any;
        const chapterList = Array.isArray(chData) ? chData : (chData?.chapters || []);
        setChapters(chapterList);

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

        const myCoursesRes = await courseService.getMyCourses();
        const myCourse = myCoursesRes.courses.find((c: any) => c.id === courseId);
        if (myCourse) {
          setProgress(myCourse.progress || 0);
          setCompletedChapters(new Set(myCourse.completedChapterIds || []));
        }

        // 鑾峰彇璇剧▼璧勬枡
        fetchMaterials();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const fetchMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const data = await courseService.getMaterials(courseId);
      setMaterials(data.materials || []);
    } catch (e) {
      console.error('鍔犺浇璧勬枡澶辫触', e);
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [qaList]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await ragService.getHistory(courseId);
      setHistory(Array.isArray(data) ? data : []);
    } catch (e: any) {
      message.error(e?.message || '鍔犺浇鍘嗗彶澶辫触');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;

    setQuestion('');
    const placeholder: QAItem = { question: q, answer: '', sources: [], loading: true };
    setQaList(prev => [...prev, placeholder]);
    setAsking(true);

    try {
      const result = await ragService.query(courseId, q);
      setQaList(prev => [
        ...prev.slice(0, -1),
        { question: q, answer: result.answer, sources: result.sources || [], loading: false },
      ]);
    } catch (e: any) {
      setQaList(prev => [
        ...prev.slice(0, -1),
        { question: q, answer: `请求失败：${e?.message || '未知错误'}`, sources: [], loading: false },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleCompleteChapter = async (chapterId: number) => {
    setSubmitting(chapterId);
    try {
      const result = await progressService.completeChapter(chapterId);
      message.success(`绔犺妭宸插畬鎴愶紒璇剧▼杩涘害: ${result.progress}%`);
      setProgress(result.progress);
      setCompletedChapters(prev => new Set([...prev, chapterId]));
    } catch (error: any) {
      message.error(error?.message || '鏍囪澶辫触锛岃閲嶈瘯');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="鍔犺浇涓?.." />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '24px' }}>
        <Card><Text>璇剧▼涓嶅瓨鍦?/Text></Card>
      </div>
    );
  }

  const sectionTypeTag = (type: string) =>
    type === 'VIDEO'
      ? <Tag icon={<PlayCircleOutlined />} color="blue" style={{ marginRight: 0 }}>瑙嗛</Tag>
      : <Tag icon={<FileTextOutlined />} color="green" style={{ marginRight: 0 }}>鍥炬枃</Tag>;

  // 鈹€鈹€ 鐭ヨ瘑搴撻棶绛?Tab 鈹€鈹€
  const ragTab = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '560px' }}>
      {/* 瀵硅瘽鍖?*/}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', marginBottom: 12 }}>
        {qaList.length === 0 && (
          <Empty
            image={<DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            imageStyle={{ height: 56 }}
            description={
              <Text type="secondary">
                鍦ㄤ笅鏂硅緭鍏ラ棶棰橈紝AI 灏嗘牴鎹绋嬬煡璇嗗簱涓轰綘瑙ｇ瓟
              </Text>
            }
            style={{ marginTop: 60 }}
          />
        )}
        {qaList.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            {/* 闂 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <div style={{
                background: '#1890ff', color: '#fff', padding: '8px 14px',
                borderRadius: '16px 16px 4px 16px', maxWidth: '75%', fontSize: 14,
              }}>
                {item.question}
              </div>
            </div>
            {/* 鍥炵瓟 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <RobotOutlined style={{ fontSize: 20, color: '#1890ff', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                {item.loading ? (
                  <Spin size="small" style={{ marginLeft: 4 }} />
                ) : (
                  <div style={{
                    background: '#f5f5f5', padding: '8px 14px',
                    borderRadius: '4px 16px 16px 16px', fontSize: 14, whiteSpace: 'pre-wrap',
                  }}>
                    {item.answer}
                  </div>
                )}
                {!item.loading && item.sources.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>鍙傝€冪墖娈碉細</Text>
                    {item.sources.map((src, i) => (
                      <Tooltip
                        key={i}
                        title={`${src.filename} #${src.chunkIndex + 1}

${src.content}`}
                        overlayStyle={{ maxWidth: 400 }}
                      >
                        <Tag style={{ cursor: 'pointer', marginTop: 4, fontSize: 11 }}>
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

      {/* 杈撳叆鍖?*/}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="杈撳叆闂锛屾寜 Ctrl+Enter 鍙戦€?
            autoSize={{ minRows: 2, maxRows: 4 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handleAsk();
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
            鍙戦€?
          </Button>
        </Space.Compact>

        {/* 鍘嗗彶璁板綍 */}
        <div style={{ marginTop: 8 }}>
          <Button
            size="small"
            type="link"
            icon={<HistoryOutlined />}
            onClick={loadHistory}
            loading={historyLoading}
            style={{ padding: 0 }}
          >
            鏌ョ湅鍘嗗彶璁板綍
          </Button>
          {history.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={history}
                renderItem={h => (
                  <List.Item
                    key={h.id}
                    style={{ cursor: 'pointer', padding: '4px 8px' }}
                    onClick={() => setQaList(prev => [...prev, {
                      question: h.question,
                      answer: h.answer,
                      sources: h.sources || [],
                    }])}
                  >
                    <List.Item.Meta
                      title={<Text style={{ fontSize: 13 }}>{h.question}</Text>}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {h.created_at?.slice(0, 10)}
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
  );

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/courses')}>
          杩斿洖璇剧▼鍒楄〃
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        {/* 鈹€鈹€ 宸︽爮锛氳绋嬭鎯?+ Tabs 鈹€鈹€ */}
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 璇剧▼鏍囬 */}
              <div>
                <Space>
                  <BookOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={2} style={{ margin: 0 }}>{course.title}</Title>
                </Space>
                <div style={{ marginTop: '12px' }}>
                  <Text type="secondary">鎺堣鏁欏笀锛?/Text>
                  <Text strong>{course.instructorName}</Text>
                </div>
              </div>

              {/* 璇剧▼绠€浠?*/}
              <div>
                <Title level={4}>璇剧▼绠€浠?/Title>
                <Paragraph>{course.description || '鏆傛棤璇剧▼鎻忚堪'}</Paragraph>
              </div>

              {/* 瀛︿範杩涘害 */}
              <div>
                <Title level={4}>瀛︿範杩涘害</Title>
                <Progress
                  percent={progress}
                  status={progress === 100 ? 'success' : 'active'}
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                />
                <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                  宸插畬鎴?{completedChapters.size} / {chapters.length} 绔犺妭
                </Text>
              </div>

              <Divider style={{ margin: '0' }} />

              {/* Tabs: 璇剧▼绔犺妭 / 鐭ヨ瘑搴撻棶绛?*/}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'chapters',
                    label: (
                      <Space>
                        <FolderOpenOutlined />
                        璇剧▼绔犺妭
                      </Space>
                    ),
                    children: (
                      <div>
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
                                      <Text strong>绗?{chapter.orderIndex} 绔?/Text>
                                      <Text>{chapter.title}</Text>
                                      {isCompleted && <Tag color="green">宸插畬鎴?/Tag>}
                                      {chSections.length > 0 && (
                                        <Tag color="default">{chSections.length} 璇炬椂</Tag>
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
                                        {isCompleted ? '宸插畬鎴? : '鏍囪瀹屾垚'}
                                      </Button>
                                    </span>
                                  }
                                >
                                  {chSections.length === 0 ? (
                                    <Text type="secondary" style={{ paddingLeft: 8 }}>鏈珷鑺傛殏鏃犺鏃?/Text>
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
                                  {chSections.some(s => s.id === activeSection?.id) && activeSection && (
                                    <div style={{ marginTop: 12, padding: '16px', background: '#fafafa', borderRadius: 8 }}>
                                      <Title level={5} style={{ marginTop: 0 }}>{activeSection.title}</Title>
                                      {activeSection.type === 'VIDEO' && activeSection.videoUrl ? (
                                        <div>
                                          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>瑙嗛閾炬帴锛?/Text>
                                          <a href={activeSection.videoUrl} target="_blank" rel="noopener noreferrer">
                                            {activeSection.videoUrl}
                                          </a>
                                        </div>
                                      ) : activeSection.type === 'TEXT' && activeSection.content ? (
                                        <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                                          {activeSection.content}
                                        </Paragraph>
                                      ) : (
                                        <Text type="secondary">鏆傛棤鍐呭</Text>
                                      )}
                                    </div>
                                  )}
                                </Panel>
                              );
                            })}
                          </Collapse>
                        ) : (
                          <Text type="secondary">鏆傛棤绔犺妭</Text>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'rag',
                    label: (
                      <Space>
                        <DatabaseOutlined />
                        鐭ヨ瘑搴撻棶绛?
                      </Space>
                    ),
                    children: ragTab,
                  },
                  {
                    key: 'materials',
                    label: (
                      <Space>
                        <CloudDownloadOutlined />
                        璧勬枡涓嬭浇
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
                                type="link" 
                                icon={<CloudDownloadOutlined />}
                                href={item.url.startsWith('http') ? item.url : `${window.location.origin}${item.url}`}
                                target="_blank"
                              >
                                涓嬭浇
                              </Button>
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                              title={item.name}
                              description={`涓婁紶浜? ${new Date(item.createdAt).toLocaleDateString()} 路 澶у皬: ${(item.size / 1024).toFixed(1)} KB`}
                            />
                          </List.Item>
                        )}
                        locale={{ emptyText: <Empty description="鏆傛棤鐩稿叧瀛︿範璧勬枡" /> }}
                      />
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        </Col>

        {/* 鈹€鈹€ 鍙虫爮锛氳绋嬩俊鎭崱鐗?鈹€鈹€ */}
        <Col xs={24} lg={8}>
          <Card title="璇剧▼淇℃伅">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">瀛︿範杩涘害</Text>
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
                    {completedChapters.size} / {chapters.length} 绔犺妭宸插畬鎴?
                  </Text>
                </div>
              </div>

              <div>
                <Text type="secondary">鍒嗙被</Text>
                <div>
                  {course.categoryName
                    ? <Tag color="blue">{course.categoryName}</Tag>
                    : <Text type="secondary">鏈垎绫?/Text>}
                </div>
              </div>

              <div>
                <Text type="secondary">鐘舵€?/Text>
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




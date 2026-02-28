import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Table, Tag, Statistic, Select, Space,
  Form, InputNumber, Input, message, Drawer, Typography, Divider, Badge, Tooltip, Spin,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
  UserOutlined, PaperClipOutlined, StarOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { assignmentService, type AssignmentSubmission } from '../../../services/assignmentService';
import { courseService, type Course } from '../../../services/courseService';
import { useAppSelector } from '../../../store';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface AssignmentOption {
  id: number;
  title: string;
  courseId: number;
  courseTitle: string;
  deadline?: string;
}

const GradingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAppSelector((state: any) => state.auth.user);

  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    searchParams.get('assignmentId') ? Number(searchParams.get('assignmentId')) : null,
  );

  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  const [drawer, setDrawer] = useState<{ open: boolean; submission: AssignmentSubmission | null }>({
    open: false, submission: null,
  });
  const [grading, setGrading] = useState(false);
  const [form] = Form.useForm();

  // ── Load instructor's assignments ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.userId) return;
    (async () => {
      setLoadingAssignments(true);
      try {
        const coursesRes = await courseService.getCourses({ instructorId: currentUser.userId }) as any;
        const courses: Course[] = coursesRes?.courses || [];

        const perCourse = await Promise.all(
          courses.map(async (course) => {
            const res = await assignmentService.getAssignments({ courseId: course.id }) as any;
            const list: any[] = res?.assignments || [];
            return list.map((a) => ({
              id: a.id,
              title: a.title,
              courseId: course.id,
              courseTitle: course.title,
              deadline: a.deadline,
            }));
          }),
        );
        const merged: AssignmentOption[] = perCourse.flat();
        setAssignments(merged);

        // If URL has assignmentId, auto-load
        const urlId = searchParams.get('assignmentId');
        if (urlId) {
          const numId = Number(urlId);
          setSelectedId(numId);
          loadSubmissions(numId);
          loadStatistics(numId);
        }
      } catch {
        message.error('加载作业列表失败');
      } finally {
        setLoadingAssignments(false);
      }
    })();
  }, [currentUser?.userId]);

  const loadSubmissions = async (assignmentId: number) => {
    setSubmissionsLoading(true);
    setSubmissions([]);
    try {
      const res = await assignmentService.getSubmissions({ assignmentId }) as any;
      setSubmissions(Array.isArray(res) ? res : []);
    } catch {
      message.error('加载提交列表失败');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const loadStatistics = async (assignmentId: number) => {
    try {
      const res = await assignmentService.getAssignmentStatistics(assignmentId) as any;
      setStatistics(res);
    } catch { /* ignore */ }
  };

  const handleAssignmentChange = (id: number) => {
    setSelectedId(id);
    setSearchParams({ assignmentId: String(id) });
    setStatistics(null);
    loadSubmissions(id);
    loadStatistics(id);
  };

  const openDrawer = (sub: AssignmentSubmission) => {
    setDrawer({ open: true, submission: sub });
    form.setFieldsValue({
      grade: sub.grade ?? undefined,
      feedback: sub.feedback ?? '',
    });
  };

  const closeDrawer = () => {
    setDrawer({ open: false, submission: null });
    form.resetFields();
  };

  const handleGrade = async (values: { grade: number; feedback?: string }) => {
    if (!drawer.submission) return;
    setGrading(true);
    try {
      await assignmentService.gradeSubmission(drawer.submission.id, {
        grade: values.grade,
        feedback: values.feedback || undefined,
      });
      message.success('批改成功！');
      closeDrawer();
      if (selectedId) {
        loadSubmissions(selectedId);
        loadStatistics(selectedId);
      }
    } catch (e: any) {
      message.error(e?.message || '批改失败，请重试');
    } finally {
      setGrading(false);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: '学生',
      key: 'student',
      render: (sub: AssignmentSubmission) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <Text strong>{(sub as any).studentName || `学生 #${sub.studentId}`}</Text>
        </Space>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (t: string) => t ? new Date(t).toLocaleString('zh-CN') : '-',
      sorter: (a: AssignmentSubmission, b: AssignmentSubmission) =>
        new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime(),
    },
    {
      title: '作业内容',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => content ? (
        <Tooltip title={content} placement="topLeft">
          <Text style={{ maxWidth: 200, display: 'block' }} ellipsis>{content}</Text>
        </Tooltip>
      ) : <Text type="secondary">（仅附件）</Text>,
    },
    {
      title: '附件',
      dataIndex: 'attachments',
      key: 'attachments',
      render: (attachments: string) => {
        let urls: string[] = [];
        try { urls = JSON.parse(attachments || '[]'); } catch { /* ignore */ }
        return urls.length > 0 ? (
          <Badge count={urls.length} size="small" color="blue">
            <PaperClipOutlined style={{ fontSize: 16, color: '#1890ff' }} />
          </Badge>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: '状态',
      key: 'status',
      filters: [
        { text: '待批改', value: 'pending' },
        { text: '已批改', value: 'graded' },
      ],
      onFilter: (value: any, sub: AssignmentSubmission) =>
        value === 'graded' ? sub.grade != null : sub.grade == null,
      render: (sub: AssignmentSubmission) => sub.grade != null
        ? <Tag color="green" icon={<CheckCircleOutlined />}>已批改</Tag>
        : <Tag color="orange" icon={<ClockCircleOutlined />}>待批改</Tag>,
    },
    {
      title: '成绩',
      dataIndex: 'grade',
      key: 'grade',
      sorter: (a: AssignmentSubmission, b: AssignmentSubmission) =>
        (a.grade ?? -1) - (b.grade ?? -1),
      render: (grade: number | null) => grade != null ? (
        <Text strong style={{ fontSize: 18, color: grade >= 60 ? '#52c41a' : '#ff4d4f' }}>
          {grade}
        </Text>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'action',
      render: (sub: AssignmentSubmission) => (
        <Button
          type="primary"
          size="small"
          icon={<StarOutlined />}
          onClick={() => openDrawer(sub)}
        >
          {sub.grade != null ? '修改批改' : '批改'}
        </Button>
      ),
    },
  ];

  const selectedAssignment = assignments.find((a) => a.id === selectedId);
  const pendingCount = submissions.filter((s) => s.grade == null).length;
  const gradedCount = submissions.filter((s) => s.grade != null).length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>批改作业</Title>
        <Text type="secondary">选择作业后查看学生提交情况并进行批改</Text>
      </div>

      {/* Assignment Selector */}
      <Card style={{ marginBottom: '16px' }}>
        <Space size="middle" wrap>
          <Text strong>选择作业：</Text>
          <Select
            placeholder="请选择要批改的作业"
            style={{ minWidth: 380 }}
            value={selectedId}
            onChange={handleAssignmentChange}
            loading={loadingAssignments}
            showSearch
            optionFilterProp="label"
            options={assignments.map((a) => ({
              value: a.id,
              label: `${a.title}（${a.courseTitle}）`,
            }))}
          />
          {selectedAssignment?.deadline && (
            <Text type="secondary">
              截止：{new Date(selectedAssignment.deadline).toLocaleString('zh-CN')}
            </Text>
          )}
        </Space>
      </Card>

      {/* Statistics */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="待批改"
                value={statistics.ungraded ?? pendingCount}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="已批改"
                value={statistics.graded ?? gradedCount}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="平均分"
                value={statistics.avgGrade != null ? Number(statistics.avgGrade).toFixed(1) : '暂无'}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Submissions Table */}
      <Card
        title={
          selectedAssignment
            ? `「${selectedAssignment.title}」的提交列表（${submissions.length} 份）`
            : '提交列表'
        }
      >
        {!selectedId ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>
            <FileTextOutlined style={{ fontSize: 56 }} />
            <p style={{ marginTop: 16, fontSize: 16 }}>请先从上方选择一个作业</p>
          </div>
        ) : (
          <Table
            dataSource={submissions}
            columns={columns}
            rowKey="id"
            loading={submissionsLoading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 份提交`,
              showSizeChanger: true,
            }}
          />
        )}
      </Card>

      {/* Grading Drawer */}
      <Drawer
        title={
          <Space>
            <StarOutlined />
            批改 — {(drawer.submission as any)?.studentName || `学生 #${drawer.submission?.studentId}`}
          </Space>
        }
        open={drawer.open}
        onClose={closeDrawer}
        width={600}
        extra={
          <Button type="primary" loading={grading} onClick={() => form.submit()}>
            提交批改
          </Button>
        }
        destroyOnHidden
      >
        {drawer.submission && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Text type="secondary">
              提交时间：{drawer.submission.submittedAt
                ? new Date(drawer.submission.submittedAt).toLocaleString('zh-CN')
                : '-'}
            </Text>

            {/* Submission Content */}
            {drawer.submission.content && (
              <div>
                <Text strong>作业内容</Text>
                <div style={{
                  marginTop: 8,
                  padding: '12px 16px',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  maxHeight: 280,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                }}>
                  {drawer.submission.content}
                </div>
              </div>
            )}

            {/* Attachments */}
            {(() => {
              let urls: string[] = [];
              try { urls = JSON.parse(drawer.submission.attachments || '[]'); } catch { /* ignore */ }
              return urls.length > 0 ? (
                <div>
                  <Text strong>附件</Text>
                  <ul style={{ paddingLeft: 16, marginTop: 8, lineHeight: 2 }}>
                    {urls.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noreferrer">
                          <PaperClipOutlined style={{ marginRight: 4 }} />附件 {i + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}

            <Divider />

            {/* Grading Form */}
            <Form form={form} layout="vertical" onFinish={handleGrade}>
              <Form.Item
                label="成绩（0 ~ 100 分）"
                name="grade"
                rules={[
                  { required: true, message: '请输入成绩' },
                  { type: 'number', min: 0, max: 100, message: '成绩须在 0 到 100 之间' },
                ]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="请输入 0 到 100 的整数分数"
                  size="large"
                />
              </Form.Item>
              <Form.Item label="评语（可选）" name="feedback">
                <TextArea
                  rows={4}
                  placeholder="请填写评语，帮助学生改进..."
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default GradingPage;

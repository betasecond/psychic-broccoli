import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Table, Tag, Statistic, Space, message,
  Typography, Select, Empty,
} from 'antd';
import {
  BarChartOutlined, UserOutlined, CheckCircleOutlined,
  TrophyOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examService, type ExamSubmission, type ExamStatistics } from '../../../services/examService';
import { courseService, type Course } from '../../../services/courseService';
import { useAppSelector } from '../../../store';

const { Title, Text } = Typography;

interface ExamOption {
  id: number;
  title: string;
  courseTitle: string;
}

const ExamResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAppSelector((state: any) => state.auth.user);

  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [statistics, setStatistics] = useState<ExamStatistics | null>(null);
  const [examsLoading, setExamsLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.userId) return;
    loadExams();
  }, [currentUser?.userId]);

  useEffect(() => {
    const examIdParam = searchParams.get('examId');
    if (examIdParam) {
      setSelectedExamId(Number(examIdParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedExamId) loadResults(selectedExamId);
    else {
      setSubmissions([]);
      setStatistics(null);
    }
  }, [selectedExamId]);

  const loadExams = async () => {
    setExamsLoading(true);
    try {
      const coursesRes = await courseService.getCourses({ instructorId: currentUser.userId }) as any;
      const courses: Course[] = coursesRes?.courses || [];
      const perCourse = await Promise.all(
        courses.map(async (course) => {
          const res = await examService.getExams({ courseId: course.id }) as any;
          const list: any[] = res?.exams || [];
          return list.map((e: any) => ({ id: e.id, title: e.title, courseTitle: course.title }));
        }),
      );
      setExams(perCourse.flat());
    } catch {
      message.error('加载考试列表失败');
    } finally {
      setExamsLoading(false);
    }
  };

  const loadResults = async (examId: number) => {
    setResultsLoading(true);
    try {
      const [resultsRes, statsRes] = await Promise.all([
        examService.getExamResults(examId) as any,
        examService.getExamStatistics(examId) as any,
      ]);
      setSubmissions(Array.isArray(resultsRes) ? resultsRes : (resultsRes?.submissions ?? []));
      setStatistics(statsRes?.statistics ?? statsRes ?? null);
    } catch {
      message.error('加载考试结果失败');
    } finally {
      setResultsLoading(false);
    }
  };

  const columns = [
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (name: string) => <Text strong>{name || '—'}</Text>,
    },
    {
      title: '学生邮箱',
      dataIndex: 'studentEmail',
      key: 'studentEmail',
      render: (email: string) => <Text type="secondary">{email || '—'}</Text>,
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (t: string) => t ? new Date(t).toLocaleString('zh-CN') : '—',
    },
    {
      title: '得分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      render: (score: number) =>
        score != null ? (
          <Text style={{ fontSize: '16px', fontWeight: 'bold', color: score >= 60 ? '#52c41a' : '#ff4d4f' }}>
            {score}
          </Text>
        ) : '—',
      sorter: (a: ExamSubmission, b: ExamSubmission) => (a.totalScore ?? 0) - (b.totalScore ?? 0),
    },
    {
      title: '状态',
      key: 'status',
      render: (record: ExamSubmission) =>
        record.totalScore != null ? (
          <Tag color={record.totalScore >= 60 ? 'green' : 'red'}>
            {record.totalScore >= 60 ? '通过' : '未通过'}
          </Tag>
        ) : <Tag color="orange">待批改</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (record: ExamSubmission) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/teacher/exams/submissions/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            style={{ marginRight: '12px' }}
            onClick={() => navigate('/teacher/exams/list')}
          >
            返回列表
          </Button>
          <Title level={2} style={{ margin: 0, display: 'inline' }}>考试结果</Title>
          {selectedExam && (
            <Text type="secondary" style={{ marginLeft: '12px' }}>
              {selectedExam.courseTitle} · {selectedExam.title}
            </Text>
          )}
        </div>
      </div>

      <Card style={{ marginBottom: '16px' }}>
        <Space align="center">
          <Text strong>选择考试：</Text>
          <Select
            style={{ width: 320 }}
            placeholder="请选择要查看结果的考试"
            loading={examsLoading}
            value={selectedExamId}
            onChange={(v) => setSelectedExamId(v)}
            showSearch
            optionFilterProp="children"
          >
            {exams.map((e) => (
              <Select.Option key={e.id} value={e.id}>
                [{e.courseTitle}] {e.title}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {selectedExamId && statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="课程总学生"
                value={statistics.totalStudents}
                prefix={<UserOutlined />}
                loading={resultsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="参加人数"
                value={statistics.participated}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={resultsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="平均分"
                value={statistics.avgScore != null ? Number(statistics.avgScore.toFixed(1)) : '—'}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#52c41a' }}
                loading={resultsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="通过率"
                value={statistics.passRate != null ? Number(statistics.passRate.toFixed(1)) : '—'}
                suffix={statistics.passRate != null ? '%' : ''}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#fa8c16' }}
                loading={resultsLoading}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        {selectedExamId ? (
          <Table
            dataSource={submissions}
            columns={columns}
            rowKey="id"
            loading={resultsLoading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 份答卷`,
              showSizeChanger: true,
            }}
            locale={{ emptyText: resultsLoading ? ' ' : '暂无提交记录' }}
          />
        ) : (
          <Empty description="请先选择一场考试" />
        )}
      </Card>
    </div>
  );
};

export default ExamResultsPage;

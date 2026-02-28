import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Table, Tag, Statistic, Space, message,
  Typography, Popconfirm,
} from 'antd';
import {
  BarChartOutlined, PlusOutlined, CheckCircleOutlined,
  ClockCircleOutlined, DeleteOutlined, TrophyOutlined, EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { examService } from '../../../services/examService';
import { courseService, type Course } from '../../../services/courseService';
import { useAppSelector } from '../../../store';

const { Title, Text } = Typography;

interface ExamRow {
  id: number;
  title: string;
  courseTitle: string;
  startTime: string;
  endTime: string;
  status: '未开始' | '进行中' | '已结束';
}

const ExamsListPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state: any) => state.auth.user);

  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser?.userId) return;
    loadData();
  }, [currentUser?.userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const coursesRes = await courseService.getCourses({ instructorId: currentUser.userId }) as any;
      const courses: Course[] = coursesRes?.courses || [];
      const perCourse = await Promise.all(
        courses.map(async (course) => {
          const res = await examService.getExams({ courseId: course.id }) as any;
          const list: any[] = res?.exams || [];
          const now = new Date();
          return list.map((e) => {
            const start = new Date(e.startTime);
            const end = new Date(e.endTime);
            let status: ExamRow['status'] = '未开始';
            if (now > end) status = '已结束';
            else if (now >= start) status = '进行中';
            return {
              id: e.id,
              title: e.title,
              courseTitle: course.title,
              startTime: e.startTime,
              endTime: e.endTime,
              status,
            };
          });
        }),
      );
      setExams(perCourse.flat());
    } catch {
      message.error('加载考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await examService.deleteExam(id);
      message.success('删除成功');
      setExams((prev) => prev.filter((e) => e.id !== id));
    } catch {
      message.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '所属课程',
      dataIndex: 'courseTitle',
      key: 'courseTitle',
      render: (title: string) => <Tag color="blue">{title}</Tag>,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      key: 'status',
      render: (record: ExamRow) => {
        if (record.status === '进行中')
          return <Tag color="blue" icon={<CheckCircleOutlined />}>进行中</Tag>;
        if (record.status === '已结束')
          return <Tag color="default" icon={<ClockCircleOutlined />}>已结束</Tag>;
        return <Tag color="orange">未开始</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (record: ExamRow) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/teacher/exams/${record.id}/edit`)}
          >
            编辑题目
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<TrophyOutlined />}
            onClick={() => navigate(`/teacher/exams/results?examId=${record.id}`)}
          >
            查看结果
          </Button>
          <Popconfirm
            title="确定删除该考试？"
            description="删除后相关提交记录也会丢失"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deletingId === record.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalCount = exams.length;
  const activeCount = exams.filter((e) => e.status === '进行中').length;
  const notStartedCount = exams.filter((e) => e.status === '未开始').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>考试列表</Title>
          <Text type="secondary">管理您创建的所有考试</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/teacher/exams/create')}
        >
          创建考试
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总考试数"
              value={totalCount}
              prefix={<BarChartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="进行中"
              value={activeCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="未开始"
              value={notStartedCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          dataSource={exams}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 场考试`,
            showSizeChanger: true,
          }}
          locale={{ emptyText: loading ? ' ' : '暂无考试，点击右上角创建' }}
        />
      </Card>
    </div>
  );
};

export default ExamsListPage;

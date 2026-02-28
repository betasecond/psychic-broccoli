import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Table, Tag, Statistic, Space, message,
  Typography, Popconfirm, Tooltip,
} from 'antd';
import {
  FileTextOutlined, PlusOutlined, CheckCircleOutlined,
  ClockCircleOutlined, DeleteOutlined, EditOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { assignmentService, type Assignment } from '../../../services/assignmentService';
import { courseService, type Course } from '../../../services/courseService';
import { useAppSelector } from '../../../store';

const { Title, Text } = Typography;

interface AssignmentRow extends Assignment {
  courseTitle: string;
  isExpired: boolean;
}

const AssignmentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state: any) => state.auth.user);

  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser?.userId) return;
    loadData();
  }, [currentUser?.userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 获取教师的课程
      const coursesRes = await courseService.getCourses({ instructorId: currentUser.userId }) as any;
      const courses: Course[] = coursesRes?.courses || [];
      const courseMap: Record<number, string> = {};
      courses.forEach((c) => { courseMap[c.id] = c.title; });

      // 并行获取每门课的作业
      const perCourse = await Promise.all(
        courses.map(async (course) => {
          const res = await assignmentService.getAssignments({ courseId: course.id }) as any;
          const list: Assignment[] = res?.assignments || [];
          return list.map((a) => ({
            ...a,
            courseTitle: course.title,
            isExpired: !!a.deadline && new Date(a.deadline) < new Date(),
          }));
        }),
      );
      setAssignments(perCourse.flat());
    } catch {
      message.error('加载作业列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await assignmentService.deleteAssignment(id);
      message.success('删除成功');
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      message.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: '作业名称',
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
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (deadline: string, record: AssignmentRow) => {
        if (!deadline) return <Text type="secondary">不限</Text>;
        return (
          <Text type={record.isExpired ? 'danger' : undefined}>
            {new Date(deadline).toLocaleString('zh-CN')}
            {record.isExpired && ' (已过期)'}
          </Text>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      render: (record: AssignmentRow) => record.isExpired
        ? <Tag color="default" icon={<ClockCircleOutlined />}>已截止</Tag>
        : <Tag color="green" icon={<CheckCircleOutlined />}>进行中</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (record: AssignmentRow) => (
        <Space size="small">
          <Tooltip title="查看并批改学生提交">
            <Button
              type="primary"
              size="small"
              icon={<TeamOutlined />}
              onClick={() => navigate(`/teacher/assignments/grading?assignmentId=${record.id}`)}
            >
              查看提交
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除该作业？"
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

  // ── Statistics ─────────────────────────────────────────────────────────────
  const totalCount = assignments.length;
  const activeCount = assignments.filter((a) => !a.isExpired).length;
  const expiredCount = assignments.filter((a) => a.isExpired).length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>作业列表</Title>
          <Text type="secondary">管理您创建的所有作业</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/teacher/assignments/create')}
        >
          创建作业
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总作业数"
              value={totalCount}
              prefix={<FileTextOutlined />}
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
              valueStyle={{ color: '#52c41a' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已截止"
              value={expiredCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#999' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Table
          dataSource={assignments}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 个作业`,
            showSizeChanger: true,
          }}
          locale={{ emptyText: loading ? ' ' : '暂无作业，点击右上角创建' }}
        />
      </Card>
    </div>
  );
};

export default AssignmentsListPage;

import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Space, Table, Avatar, Statistic, Select, Progress, Spin,
} from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import { courseService } from '../../services/courseService';
import { useAppSelector } from '../../store';

const { Title, Text } = Typography;
const { Option } = Select;

const StudentsPage: React.FC = () => {
  const currentUser = useAppSelector((state: any) => state.auth.user);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseLoading, setCourseLoading] = useState(true);

  // 加载教师课程列表
  useEffect(() => {
    if (!currentUser?.userId) return;
    const load = async () => {
      setCourseLoading(true);
      try {
        const res = await courseService.getCourses({ instructorId: currentUser.userId }) as any;
        const list: any[] = res?.courses || [];
        setCourses(list);
        if (list.length > 0) setSelectedCourseId(list[0].id);
      } catch {
        // 静默失败
      } finally {
        setCourseLoading(false);
      }
    };
    load();
  }, [currentUser?.userId]);

  // 加载选中课程的学生列表
  useEffect(() => {
    if (!selectedCourseId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await courseService.getCourseStudents(selectedCourseId);
        setStudents(res?.students || []);
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCourseId]);

  const totalStudents = students.length;
  const avgProgress = totalStudents > 0
    ? Math.round(students.reduce((s, st) => s + (st.progress || 0), 0) / totalStudents)
    : 0;

  const columns = [
    {
      title: '学生',
      key: 'user',
      render: (record: any) => (
        <Space>
          <Avatar size="small" src={record.avatarUrl || undefined} icon={<UserOutlined />} />
          <div>
            <div><Text strong>{record.fullName || record.username}</Text></div>
            <div style={{ fontSize: '12px', color: '#888' }}>@{record.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '选课时间',
      dataIndex: 'enrolledAt',
      key: 'enrolledAt',
      render: (val: string) => val ? new Date(val).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '学习进度',
      dataIndex: 'progress',
      key: 'progress',
      sorter: (a: any, b: any) => (a.progress || 0) - (b.progress || 0),
      render: (progress: number) => (
        <div style={{ minWidth: 120 }}>
          <Progress
            percent={Math.round(progress || 0)}
            size="small"
            strokeColor={progress >= 100 ? '#52c41a' : progress >= 50 ? '#1890ff' : '#fa8c16'}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>学生管理</Title>
        <Text type="secondary">查看您课程中的学生信息和学习进度</Text>
      </div>

      {/* 课程选择 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space align="center">
          <Text strong>选择课程：</Text>
          {courseLoading ? (
            <Spin size="small" />
          ) : (
            <Select
              style={{ width: 280 }}
              value={selectedCourseId}
              onChange={(val) => setSelectedCourseId(val)}
              placeholder="请选择课程"
            >
              {courses.map((c) => (
                <Option key={c.id} value={c.id}>{c.title}</Option>
              ))}
            </Select>
          )}
        </Space>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="本课程学生数"
              value={totalStudents}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="平均学习进度"
              value={avgProgress}
              suffix="%"
              prefix={<TeamOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="开课总数"
              value={courses.length}
              prefix={<TeamOutlined />}
              loading={courseLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 学生表格 */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card
            title={`学生列表（${totalStudents} 人）`}
            extra={
              selectedCourseId && courses.find((c) => c.id === selectedCourseId)
                ? <Text type="secondary">{courses.find((c) => c.id === selectedCourseId)?.title}</Text>
                : null
            }
          >
            <Table
              dataSource={students}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 名学生` }}
              locale={{ emptyText: loading ? ' ' : '该课程暂无学生选课' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentsPage;

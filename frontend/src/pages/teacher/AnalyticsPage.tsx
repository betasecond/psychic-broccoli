import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Space, Table, Statistic, Progress,
} from 'antd';
import {
  BarChartOutlined, UserOutlined, BookOutlined,
  FileTextOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { courseService } from '../../services/courseService';
import { useAppSelector } from '../../store';

const { Title, Text } = Typography;

interface CourseRow {
  id: number;
  title: string;
  studentCount: number;
  chapterCount: number;
  assignmentCount: number;
  examCount: number;
}

const AnalyticsPage: React.FC = () => {
  const currentUser = useAppSelector((state: any) => state.auth.user);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.userId) return;
    loadData();
  }, [currentUser?.userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await courseService.getCourses({ instructorId: currentUser.userId }) as any;
      const list: any[] = res?.courses || [];

      const rows: CourseRow[] = await Promise.all(
        list.map(async (course: any) => {
          const stats = await courseService.getCourseStatistics(course.id) as any;
          return {
            id: course.id,
            title: course.title,
            studentCount: stats?.studentCount ?? 0,
            chapterCount: stats?.chapterCount ?? 0,
            assignmentCount: stats?.assignmentCount ?? 0,
            examCount: stats?.examCount ?? 0,
          };
        }),
      );
      setCourses(rows);
    } catch {
      // 静默失败，表格为空
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = courses.reduce((s, c) => s + c.studentCount, 0);
  const totalAssignments = courses.reduce((s, c) => s + c.assignmentCount, 0);
  const totalExams = courses.reduce((s, c) => s + c.examCount, 0);

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '选课学生',
      dataIndex: 'studentCount',
      key: 'studentCount',
      sorter: (a: CourseRow, b: CourseRow) => a.studentCount - b.studentCount,
      render: (n: number) => (
        <Space>
          <UserOutlined />
          <span>{n} 人</span>
        </Space>
      ),
    },
    {
      title: '章节数',
      dataIndex: 'chapterCount',
      key: 'chapterCount',
      sorter: (a: CourseRow, b: CourseRow) => a.chapterCount - b.chapterCount,
      render: (n: number) => `${n} 章`,
    },
    {
      title: '作业数',
      dataIndex: 'assignmentCount',
      key: 'assignmentCount',
      sorter: (a: CourseRow, b: CourseRow) => a.assignmentCount - b.assignmentCount,
      render: (n: number) => (
        <Space>
          <FileTextOutlined />
          <span>{n}</span>
        </Space>
      ),
    },
    {
      title: '考试数',
      dataIndex: 'examCount',
      key: 'examCount',
      sorter: (a: CourseRow, b: CourseRow) => a.examCount - b.examCount,
      render: (n: number) => (
        <Space>
          <TrophyOutlined />
          <span>{n}</span>
        </Space>
      ),
    },
    {
      title: '内容丰富度',
      key: 'richness',
      render: (record: CourseRow) => {
        const total = record.chapterCount + record.assignmentCount + record.examCount;
        const percent = Math.min(100, total * 10);
        return (
          <div style={{ minWidth: 100 }}>
            <Progress percent={percent} size="small" />
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>教学分析</Title>
        <Text type="secondary">您的课程数据概览</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="开设课程"
              value={courses.length}
              prefix={<BookOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="选课学生（总计）"
              value={totalStudents}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="布置作业"
              value={totalAssignments}
              prefix={<FileTextOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="创建考试"
              value={totalExams}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="课程概览" extra={<Text type="secondary">共 {courses.length} 门课程</Text>}>
            <Table
              dataSource={courses}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={false}
              locale={{ emptyText: loading ? ' ' : '暂无课程数据' }}
            />
          </Card>
        </Col>
      </Row>

      {courses.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} md={12}>
            <Card title="各课程学生分布">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {courses.map((c) => {
                  const maxStudents = Math.max(...courses.map((x) => x.studentCount), 1);
                  const pct = Math.round((c.studentCount / maxStudents) * 100);
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text ellipsis style={{ maxWidth: '60%' }}>{c.title}</Text>
                        <Text strong>{c.studentCount} 人</Text>
                      </div>
                      <Progress percent={pct} strokeColor="#1890ff" showInfo={false} />
                    </div>
                  );
                })}
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="各课程内容数量">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {courses.map((c) => {
                  const maxContent = Math.max(
                    ...courses.map((x) => x.chapterCount + x.assignmentCount + x.examCount), 1
                  );
                  const total = c.chapterCount + c.assignmentCount + c.examCount;
                  const pct = Math.round((total / maxContent) * 100);
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text ellipsis style={{ maxWidth: '60%' }}>{c.title}</Text>
                        <Space size="small">
                          <Text type="secondary">{c.chapterCount}章</Text>
                          <Text type="secondary">{c.assignmentCount}作业</Text>
                          <Text type="secondary">{c.examCount}考试</Text>
                        </Space>
                      </div>
                      <Progress percent={pct} strokeColor="#52c41a" showInfo={false} />
                    </div>
                  );
                })}
              </Space>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default AnalyticsPage;

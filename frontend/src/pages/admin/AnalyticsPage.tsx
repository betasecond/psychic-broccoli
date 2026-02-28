import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Space, Table, Statistic, Spin, Progress } from 'antd';
import { BarChartOutlined, UserOutlined, BookOutlined, FileTextOutlined, TrophyOutlined, TeamOutlined } from '@ant-design/icons';
import { courseService } from '../../services/courseService';
import { userService } from '../../services/userService';

const { Title, Text } = Typography;

const AdminAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers]         = useState(0);
  const [studentCount, setStudentCount]     = useState(0);
  const [instructorCount, setInstructorCount] = useState(0);
  const [courses, setCourses]               = useState<any[]>([]);
  const [courseStats, setCourseStats]       = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, coursesRes] = await Promise.all([
          userService.getUsers({ page: 1, pageSize: 1000 }),
          courseService.getCourses({}) as any,
        ]);

        const allUsers = usersRes?.users || [];
        setTotalUsers(allUsers.length);
        setStudentCount(allUsers.filter((u: any) => u.role === 'STUDENT').length);
        setInstructorCount(allUsers.filter((u: any) => u.role === 'INSTRUCTOR').length);

        const courseList: any[] = coursesRes?.courses || [];
        setCourses(courseList);

        // 获取每门课程的统计信息
        const stats = await Promise.all(
          courseList.slice(0, 10).map(async (c: any) => {
            try {
              const s = await courseService.getCourseStatistics(c.id) as any;
              return { ...c, studentCount: s?.studentCount ?? 0, assignmentCount: s?.assignmentCount ?? 0, examCount: s?.examCount ?? 0 };
            } catch {
              return { ...c, studentCount: 0, assignmentCount: 0, examCount: 0 };
            }
          })
        );
        setCourseStats(stats);
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalAssignments = courseStats.reduce((s, c) => s + (c.assignmentCount || 0), 0);
  const totalExams       = courseStats.reduce((s, c) => s + (c.examCount || 0), 0);

  // 按学生数排序，取前5
  const topCourses = [...courseStats].sort((a, b) => b.studentCount - a.studentCount).slice(0, 5);
  const maxStudents = topCourses[0]?.studentCount || 1;

  // 按教师分组
  const instructorMap: Record<string, { name: string; courses: number; students: number }> = {};
  courseStats.forEach((c) => {
    const key = String(c.instructorId);
    if (!instructorMap[key]) instructorMap[key] = { name: c.instructorName || '未知', courses: 0, students: 0 };
    instructorMap[key].courses++;
    instructorMap[key].students += c.studentCount || 0;
  });
  const topInstructors = Object.values(instructorMap)
    .sort((a, b) => b.students - a.students)
    .slice(0, 5)
    .map((v, i) => ({ ...v, id: i }));

  const courseColumns = [
    { title: '排名', key: 'rank', render: (_: any, __: any, i: number) => <Text strong>{i + 1}</Text>, width: 60 },
    { title: '课程名称', dataIndex: 'title', key: 'title', render: (t: string) => <Text strong>{t}</Text> },
    {
      title: '选课人数', dataIndex: 'studentCount', key: 'studentCount',
      render: (n: number) => <Space><UserOutlined /><span>{n}</span></Space>,
    },
    {
      title: '占比', key: 'pct',
      render: (r: any) => (
        <Progress percent={Math.round((r.studentCount / maxStudents) * 100)} size="small" showInfo={false} />
      ),
    },
  ];

  const instructorColumns = [
    { title: '排名', key: 'rank', render: (_: any, __: any, i: number) => <Text strong>{i + 1}</Text>, width: 60 },
    { title: '教师', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
    { title: '课程数', dataIndex: 'courses', key: 'courses', render: (n: number) => <Space><BookOutlined /><span>{n}</span></Space> },
    { title: '学生总数', dataIndex: 'students', key: 'students', render: (n: number) => <Space><TeamOutlined /><span>{n}</span></Space> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>数据分析</Title>
        <Text type="secondary">平台运营数据概览</Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}><Spin size="large" /></div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {[
              { title: '注册用户总数', value: totalUsers,       icon: <UserOutlined />,       color: undefined },
              { title: '学生数',       value: studentCount,     icon: <TeamOutlined />,       color: undefined },
              { title: '教师数',       value: instructorCount,  icon: <BookOutlined />,       color: '#1890ff'  },
              { title: '课程总数',     value: courses.length,   icon: <BarChartOutlined />,   color: undefined },
              { title: '作业总数',     value: totalAssignments, icon: <FileTextOutlined />,   color: undefined },
              { title: '考试总数',     value: totalExams,       icon: <TrophyOutlined />,     color: '#3f8600'  },
            ].map((stat) => (
              <Col xs={24} sm={12} md={4} key={stat.title}>
                <Card>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    prefix={stat.icon}
                    valueStyle={stat.color ? { color: stat.color } : undefined}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24} md={12}>
              <Card title="热门课程（按选课人数）">
                {topCourses.length > 0 ? (
                  <Table
                    dataSource={topCourses}
                    columns={courseColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                ) : <Text type="secondary">暂无课程数据</Text>}
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="教师排行（按学生总数）">
                {topInstructors.length > 0 ? (
                  <Table
                    dataSource={topInstructors}
                    columns={instructorColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                ) : <Text type="secondary">暂无教师数据</Text>}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24} md={12}>
              <Card title="用户角色分布">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {[
                    { label: '学生', count: studentCount,    color: '#1890ff' },
                    { label: '教师', count: instructorCount, color: '#52c41a' },
                    { label: '管理员', count: totalUsers - studentCount - instructorCount, color: '#fa8c16' },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>{label}</Text>
                        <Text strong>{count} 人（{totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0}%）</Text>
                      </div>
                      <Progress
                        percent={totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0}
                        strokeColor={color}
                        showInfo={false}
                      />
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="课程状态分布">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {[
                    { label: '已发布', status: 'PUBLISHED', color: '#1890ff' },
                    { label: '草稿',   status: 'DRAFT',     color: '#fa8c16' },
                    { label: '已归档', status: 'ARCHIVED',  color: '#8c8c8c' },
                  ].map(({ label, status, color }) => {
                    const count = courses.filter((c) => c.status === status).length;
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text>{label}</Text>
                          <Text strong>{count} 门</Text>
                        </div>
                        <Progress
                          percent={courses.length > 0 ? Math.round((count / courses.length) * 100) : 0}
                          strokeColor={color}
                          showInfo={false}
                        />
                      </div>
                    );
                  })}
                </Space>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;

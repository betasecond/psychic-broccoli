import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Space, Table, Tag, Statistic, Avatar, Spin, Progress } from 'antd';
import { BookOutlined, UserOutlined, TeamOutlined, CheckCircleOutlined, ClockCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import { courseService } from '../../services/courseService';

const { Title, Text } = Typography;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: '已发布', color: 'blue' },
  DRAFT:     { label: '草稿',   color: 'orange' },
  ARCHIVED:  { label: '已归档', color: 'default' },
};

const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await courseService.getCourses({}) as any;
        setCourses(res?.courses || []);
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const published  = courses.filter((c) => c.status === 'PUBLISHED').length;
  const draft      = courses.filter((c) => c.status === 'DRAFT').length;
  const archived   = courses.filter((c) => c.status === 'ARCHIVED').length;

  // 按分类统计
  const categoryMap: Record<string, number> = {};
  courses.forEach((c) => {
    const cat = c.categoryName || '未分类';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxCatCount = categories[0]?.[1] || 1;

  // 最多学生课程（按 totalStudents 排序，若无则按标题）
  const topCourses = [...courses]
    .sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))
    .slice(0, 3);

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '授课教师',
      dataIndex: 'instructorName',
      key: 'instructorName',
      render: (name: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <span>{name || '-'}</span>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (cat: string) => <Tag color="blue">{cat || '未分类'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = STATUS_MAP[status] || { label: status, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString('zh-CN') : '-',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>课程管理</Title>
        <Text type="secondary">平台所有课程信息管理</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="总课程数" value={courses.length} prefix={<BookOutlined />} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="已发布" value={published} prefix={<CheckCircleOutlined />} loading={loading} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="草稿" value={draft} prefix={<ClockCircleOutlined />} loading={loading} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="已归档" value={archived} prefix={<BarChartOutlined />} loading={loading} valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title={`课程列表（共 ${courses.length} 门）`}>
            <Table
              dataSource={courses}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 门课程` }}
              locale={{ emptyText: loading ? ' ' : '暂无课程数据' }}
            />
          </Card>
        </Col>
      </Row>

      {courses.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} md={12}>
            <Card title="课程分类分布">
              {loading ? <Spin /> : (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {categories.length > 0 ? categories.map(([cat, count]) => (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>{cat}</Text>
                        <Text strong>{count} 门</Text>
                      </div>
                      <Progress percent={Math.round((count / maxCatCount) * 100)} showInfo={false} strokeColor="#1890ff" />
                    </div>
                  )) : <Text type="secondary">暂无分类数据</Text>}
                </Space>
              )}
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="课程状态分布">
              {loading ? <Spin /> : (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {[
                    { label: '已发布', count: published, color: '#1890ff' },
                    { label: '草稿',   count: draft,     color: '#fa8c16' },
                    { label: '已归档', count: archived,  color: '#8c8c8c' },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>{label}</Text>
                        <Text strong>{count} 门</Text>
                      </div>
                      <Progress
                        percent={courses.length > 0 ? Math.round((count / courses.length) * 100) : 0}
                        showInfo={false}
                        strokeColor={color}
                      />
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          </Col>

          {topCourses.length > 0 && (
            <Col xs={24}>
              <Card title="最近课程">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {topCourses.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < topCourses.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <Space>
                        <TeamOutlined style={{ color: '#1890ff' }} />
                        <Text strong>{c.title}</Text>
                      </Space>
                      <Space>
                        <Tag color={(STATUS_MAP[c.status] || {}).color || 'default'}>
                          {(STATUS_MAP[c.status] || {}).label || c.status}
                        </Tag>
                        <Text type="secondary">{c.instructorName}</Text>
                      </Space>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          )}
        </Row>
      )}
    </div>
  );
};

export default AdminCoursesPage;

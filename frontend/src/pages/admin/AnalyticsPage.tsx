import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Statistic, Progress, Divider } from 'antd';
import { BarChartOutlined, UserOutlined, BookOutlined, FileTextOutlined, VideoCameraOutlined, TrophyOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AnalyticsPage: React.FC = () => {
  // 模拟数据
  const platformStats = [
    { id: '1', title: '总注册用户', value: 4589, change: '+12.5%', icon: <UserOutlined /> },
    { id: '2', title: '活跃用户(月)', value: 2847, change: '+8.3%', icon: <TeamOutlined /> },
    { id: '3', title: '总课程数', value: 128, change: '+5.7%', icon: <BookOutlined /> },
    { id: '4', title: '已完成课程', value: 3245, change: '+15.2%', icon: <TrophyOutlined /> },
    { id: '5', title: '总作业数', value: 567, change: '+3.2%', icon: <FileTextOutlined /> },
    { id: '6', title: '总考试数', value: 189, change: '+7.1%', icon: <BarChartOutlined /> },
    { id: '7', title: '直播课程', value: 89, change: '+22.4%', icon: <VideoCameraOutlined /> },
    { id: '8', title: '系统评分', value: 4.7, change: '+0.2', icon: <BarChartOutlined /> },
  ];

  const topCourses = [
    { id: '1', name: '前端开发基础', students: 203, completion: 91 },
    { id: '2', name: 'React 深入浅出', students: 156, completion: 78 },
    { id: '3', name: 'TypeScript 实战', students: 98, completion: 82 },
    { id: '4', name: 'Vue 3 实战课程', students: 87, completion: 85 },
    { id: '5', name: 'JavaScript 高级编程', students: 134, completion: 76 },
  ];

  const topInstructors = [
    { id: '1', name: '张老师', courses: 3, students: 457, rating: 4.8 },
    { id: '2', name: '李老师', courses: 2, students: 195, rating: 4.9 },
    { id: '3', name: '王老师', courses: 4, students: 389, rating: 4.7 },
    { id: '4', name: '赵老师', courses: 1, students: 87, rating: 4.6 },
  ];

  const columns = [
    {
      title: '排名',
      key: 'index',
      render: (text, record, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: '课程名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '学生数',
      dataIndex: 'students',
      key: 'students',
      render: (students: number) => (
        <Space>
          <UserOutlined />
          <span>{students}</span>
        </Space>
      ),
    },
    {
      title: '完成率',
      key: 'completion',
      render: (record: any) => (
        <div>
          <div>{record.completion}%</div>
          <Progress percent={record.completion} size="small" />
        </div>
      ),
    },
  ];

  const instructorColumns = [
    {
      title: '排名',
      key: 'index',
      render: (text, record, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: '教师姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '课程数',
      dataIndex: 'courses',
      key: 'courses',
      render: (courses: number) => (
        <Space>
          <BookOutlined />
          <span>{courses}</span>
        </Space>
      ),
    },
    {
      title: '学生数',
      dataIndex: 'students',
      key: 'students',
      render: (students: number) => (
        <Space>
          <TeamOutlined />
          <span>{students}</span>
        </Space>
      ),
    },
    {
      title: '评分',
      key: 'rating',
      render: (record: any) => (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{record.rating}</div>
          <div>
            <span style={{ color: '#faad14' }}>★</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>数据分析</Title>
        <Text type="secondary">平台运营数据和学习分析</Text>
      </div>

      <Row gutter={[16, 16]}>
        {platformStats.map((stat) => (
          <Col xs={24} sm={12} md={6} key={stat.id}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {stat.icon}
                  </div>
                  <Text type="secondary">{stat.title}</Text>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>
                    {stat.value}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                    {stat.change}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    月同比
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} md={12}>
          <Card title="热门课程排行">
            <Table 
              dataSource={topCourses} 
              columns={columns} 
              rowKey="id"
              pagination={false}
              showHeader={false}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="优秀教师排行">
            <Table 
              dataSource={topInstructors} 
              columns={instructorColumns} 
              rowKey="id"
              pagination={false}
              showHeader={false}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card title="用户注册趋势">
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '20px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '120px', width: '30px', backgroundColor: '#e6f7ff', marginBottom: '8px' }}></div>
                <Text>周一</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '150px', width: '30px', backgroundColor: '#bae7ff', marginBottom: '8px' }}></div>
                <Text>周二</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '180px', width: '30px', backgroundColor: '#1890ff', marginBottom: '8px' }}></div>
                <Text>周三</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '160px', width: '30px', backgroundColor: '#40a9ff', marginBottom: '8px' }}></div>
                <Text>周四</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '140px', width: '30px', backgroundColor: '#85a5ff', marginBottom: '8px' }}></div>
                <Text>周五</Text>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="课程完成率分布">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>90-100%</Text>
                  <Text strong>45</Text>
                </div>
                <Progress percent={35} strokeColor="#52c41a" showInfo={false} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>80-89%</Text>
                  <Text strong>32</Text>
                </div>
                <Progress percent={25} strokeColor="#1890ff" showInfo={false} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>70-79%</Text>
                  <Text strong>18</Text>
                </div>
                <Progress percent={14} strokeColor="#fa8c16" showInfo={false} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>70%以下</Text>
                  <Text strong>8</Text>
                </div>
                <Progress percent={6} strokeColor="#ff4d4f" showInfo={false} />
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="平台数据概览">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <BarChartOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>活跃度趋势</Text>
                </div>
                <Text>本月用户活跃度提升 8.3%</Text>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <BookOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>课程完成度</Text>
                </div>
                <Text>平均课程完成率 81.2%</Text>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <TrophyOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>用户满意度</Text>
                </div>
                <Text>平台平均评分 4.7/5.0</Text>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <VideoCameraOutlined style={{ color: '#722ed1', marginRight: '8px' }} />
                  <Text strong>直播课程</Text>
                </div>
                <Text>直播课程参与率 89.5%</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPage;
import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Statistic, Progress, Divider } from 'antd';
import { BarChartOutlined, UserOutlined, BookOutlined, FileTextOutlined, VideoCameraOutlined, TrophyOutlined, CalendarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AnalyticsPage: React.FC = () => {
  // 模拟课程数据
  const courseData = [
    {
      id: '1',
      course: 'React 深入浅出',
      students: 156,
      completion: 78,
      avgScore: 85.5,
      engagement: 92,
    },
    {
      id: '2',
      course: 'TypeScript 实战',
      students: 98,
      completion: 82,
      avgScore: 88.3,
      engagement: 89,
    },
    {
      id: '3',
      course: '前端开发基础',
      students: 203,
      completion: 91,
      avgScore: 91.2,
      engagement: 95,
    },
  ];

  // 模拟学生数据
  const studentData = [
    {
      id: '1',
      name: '张三',
      course: 'React 深入浅出',
      progress: 85,
      score: 88,
      activity: 92,
    },
    {
      id: '2',
      name: '李四',
      course: 'TypeScript 实战',
      progress: 75,
      score: 82,
      activity: 78,
    },
    {
      id: '3',
      name: '王五',
      course: '前端开发基础',
      progress: 95,
      score: 94,
      activity: 98,
    },
  ];

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'course',
      key: 'course',
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
    {
      title: '平均分',
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (avgScore: number) => (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{avgScore}</div>
          <div>
            <TrophyOutlined style={{ color: '#faad14' }} /> 
          </div>
        </div>
      ),
    },
    {
      title: '参与度',
      key: 'engagement',
      render: (record: any) => (
        <div>
          <div>{record.engagement}%</div>
          <Progress percent={record.engagement} size="small" strokeColor="#52c41a" />
        </div>
      ),
    },
  ];

  const studentColumns = [
    {
      title: '学生姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '课程',
      dataIndex: 'course',
      key: 'course',
    },
    {
      title: '学习进度',
      key: 'progress',
      render: (record: any) => (
        <div>
          <div>{record.progress}%</div>
          <Progress percent={record.progress} size="small" />
        </div>
      ),
    },
    {
      title: '成绩',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{score}</div>
          <div>
            <TrophyOutlined style={{ color: '#faad14' }} /> 
          </div>
        </div>
      ),
    },
    {
      title: '活跃度',
      key: 'activity',
      render: (record: any) => (
        <div>
          <div>{record.activity}%</div>
          <Progress percent={record.activity} size="small" strokeColor="#52c41a" />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>教学分析</Title>
        <Text type="secondary">您的教学效果和学生学习情况分析</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="教授课程"
              value={3}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="学生总数"
              value={457}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均完成率"
              value={84}
              suffix="%"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均分"
              value={88.3}
              precision={1}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="课程分析">
            <Table 
              dataSource={courseData} 
              columns={columns} 
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="学生学习分析">
            <Table 
              dataSource={studentData} 
              columns={studentColumns} 
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 名学生`
              }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card title="月度趋势">
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '20px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '120px', width: '30px', backgroundColor: '#e6f7ff', marginBottom: '8px' }}></div>
                <Text>1月</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '150px', width: '30px', backgroundColor: '#bae7ff', marginBottom: '8px' }}></div>
                <Text>2月</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '180px', width: '30px', backgroundColor: '#1890ff', marginBottom: '8px' }}></div>
                <Text>3月</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '160px', width: '30px', backgroundColor: '#40a9ff', marginBottom: '8px' }}></div>
                <Text>4月</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ height: '140px', width: '30px', backgroundColor: '#85a5ff', marginBottom: '8px' }}></div>
                <Text>5月</Text>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="学生活跃度分布">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>高活跃度 (90-100%)</Text>
                  <Text strong>124 人</Text>
                </div>
                <Progress percent={40} strokeColor="#52c41a" showInfo={false} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>中活跃度 (70-89%)</Text>
                  <Text strong>198 人</Text>
                </div>
                <Progress percent={35} strokeColor="#1890ff" showInfo={false} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>低活跃度 (50-69%)</Text>
                  <Text strong>102 人</Text>
                </div>
                <Progress percent={20} strokeColor="#fa8c16" showInfo={false} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>极低活跃度 (0-49%)</Text>
                  <Text strong>33 人</Text>
                </div>
                <Progress percent={5} strokeColor="#ff4d4f" showInfo={false} />
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="课程表现">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <BookOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>表现最佳课程</Text>
                </div>
                <Text>前端开发基础 - 完成率91%，平均分91.2</Text>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#fff2e8', border: '1px solid #ffccc7', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <BarChartOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>需关注课程</Text>
                </div>
                <Text>React 深入浅出 - 有12名学生完成率低于50%</Text>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <TrophyOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>高分作业</Text>
                </div>
                <Text>前端开发项目作业平均分94.5</Text>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <VideoCameraOutlined style={{ color: '#722ed1', marginRight: '8px' }} />
                  <Text strong>最受欢迎直播</Text>
                </div>
                <Text>React Hooks 最佳实践 - 参与率96%</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPage;
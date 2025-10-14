import React from 'react';
import { Card, Row, Col, Button, Typography, Space, List, Tag, Avatar, Statistic, Divider } from 'antd';
import { VideoCameraOutlined, CalendarOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const LiveClassesPage: React.FC = () => {
  // 模拟直播课程数据
  const liveClasses = [
    {
      id: '1',
      title: 'React Hooks 最佳实践',
      course: 'React 深入浅出',
      instructor: '您',
      startTime: '2024-03-22 19:00',
      duration: '90分钟',
      status: '待开始',
      students: 124,
      enrolled: 156
    },
    {
      id: '2',
      title: 'TypeScript 高级类型系统',
      course: 'TypeScript 实战',
      instructor: '您',
      startTime: '2024-03-20 20:00',
      duration: '120分钟',
      status: '进行中',
      students: 89,
      enrolled: 98
    },
    {
      id: '3',
      title: '前端性能优化实战',
      course: '前端开发基础',
      instructor: '您',
      startTime: '2024-03-15 19:30',
      duration: '75分钟',
      status: '已结束',
      students: 156,
      enrolled: 203
    },
    {
      id: '4',
      title: 'CSS Grid vs Flexbox',
      course: '前端开发基础',
      instructor: '您',
      startTime: '2024-03-10 20:00',
      duration: '60分钟',
      status: '已结束',
      students: 201,
      enrolled: 203
    },
  ];

  // 模拟互动数据
  const interactions = [
    {
      id: 'i1',
      title: 'React Hooks 最佳实践',
      question: '关于useEffect的清理函数使用',
      student: '张同学',
      time: '2024-03-21 15:30',
      status: '待回复'
    },
    {
      id: 'i2',
      title: 'TypeScript 高级类型系统',
      question: '条件类型的概念不太理解',
      student: '李同学',
      time: '2024-03-19 14:20',
      status: '已回复'
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>直播教学</Title>
        <Text type="secondary">您的直播课程安排和互动情况</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总直播数"
              value={12}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="本月直播"
              value={4}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="参与学生"
              value={423}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均参与率"
              value={87}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="直播课程安排">
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary" icon={<PlusOutlined />}>创建直播</Button>
                <Button icon={<EditOutlined />}>批量操作</Button>
              </Space>
              <Space>
                <Button>按状态筛选</Button>
                <Button>导出数据</Button>
              </Space>
            </div>
            
            <List
              itemLayout="vertical"
              size="large"
              dataSource={liveClasses}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[
                    <Button type="link" key={`view-${item.id}`}>查看</Button>,
                    <Button type="link" key={`edit-${item.id}`}>编辑</Button>,
                    <Button type="link" key={`stats-${item.id}`}>统计</Button>,
                  ]}
                  extra={
                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                      {item.status === '进行中' ? (
                        <Tag color="red" style={{ marginBottom: '8px', padding: '4px 8px' }}>
                          <ClockCircleOutlined spin /> 进行中
                        </Tag>
                      ) : item.status === '待开始' ? (
                        <Tag color="orange" style={{ marginBottom: '8px', padding: '4px 8px' }}>
                          <ClockCircleOutlined /> 即将开始
                        </Tag>
                      ) : (
                        <Tag color="green" style={{ marginBottom: '8px', padding: '4px 8px' }}>
                          <CheckCircleOutlined /> 已结束
                        </Tag>
                      )}
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                          {Math.round((item.students / item.enrolled) * 100)}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>参与率</div>
                      </div>
                    </div>
                  }
                >
                  <List.Item.Meta
                    title={<a href="#">{item.title}</a>}
                    description={
                      <Space>
                        <Tag icon={<VideoCameraOutlined />} color="blue">{item.course}</Tag>
                        <Space>
                          <CalendarOutlined /> {item.startTime}
                        </Space>
                        <Space>
                          <ClockCircleOutlined /> {item.duration}
                        </Space>
                      </Space>
                    }
                  />
                  <div>
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} /> {item.instructor}
                    </Space>
                    <br />
                    <div style={{ marginTop: '8px' }}>
                      <Space size="large">
                        <span><UserOutlined /> {item.students} / {item.enrolled} 人参与</span>
                        <span>状态: <Tag color={item.status === '进行中' ? 'red' : item.status === '待开始' ? 'orange' : 'green'}>{item.status}</Tag></span>
                      </Space>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="实时互动">
            <List
              itemLayout="horizontal"
              dataSource={interactions}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    item.status === '待回复' ? (
                      <Button type="primary" key={`reply-${item.id}`}>回复</Button>
                    ) : (
                      <Button type="link" key={`view-${item.id}`}>查看回复</Button>
                    )
                  ]}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <Space direction="vertical" size="small">
                        <Text strong>{item.question}</Text>
                        <Space>
                          <Text>提问者: {item.student}</Text>
                          <Text type="secondary">{item.time}</Text>
                        </Space>
                      </Space>
                    }
                  />
                  <div>
                    <Tag color={item.status === '待回复' ? 'orange' : 'green'}>
                      {item.status}
                    </Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="直播回放">
            <List
              itemLayout="vertical"
              dataSource={liveClasses.filter(cls => cls.status === '已结束')}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[
                    <Button type="link" key={`play-${item.id}`}>观看回放</Button>,
                    <Button type="link" key={`materials-${item.id}`}>课程资料</Button>,
                    <Button type="link" key={`stats-${item.id}`}>查看统计</Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <Space>
                        <Tag icon={<VideoCameraOutlined />} color="blue">{item.course}</Tag>
                        <Space>
                          <CalendarOutlined /> {item.startTime}
                        </Space>
                        <Space>
                          <ClockCircleOutlined /> {item.duration}
                        </Space>
                      </Space>
                    }
                  />
                  <div>
                    <Space>
                      <span><UserOutlined /> {item.students} 人参与</span>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LiveClassesPage;
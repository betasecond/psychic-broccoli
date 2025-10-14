import React from 'react';
import { Card, Row, Col, Button, Typography, Space, List, Tag, Avatar } from 'antd';
import { VideoCameraOutlined, CalendarOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const LiveClassesPage: React.FC = () => {
  // 模拟直播课程数据
  const liveClasses = [
    {
      id: '1',
      title: 'React Hooks 最佳实践',
      course: 'React 深入浅出',
      instructor: '张老师',
      startTime: '2024-03-18 19:00',
      duration: '90分钟',
      status: '即将开始',
      students: 124
    },
    {
      id: '2',
      title: 'TypeScript 高级类型系统',
      course: 'TypeScript 实战',
      instructor: '李老师',
      startTime: '2024-03-16 20:00',
      duration: '120分钟',
      status: '进行中',
      students: 89
    },
    {
      id: '3',
      title: '前端性能优化实战',
      course: '前端开发基础',
      instructor: '王老师',
      startTime: '2024-03-15 19:30',
      duration: '75分钟',
      status: '已结束',
      students: 156
    },
    {
      id: '4',
      title: 'CSS Grid vs Flexbox',
      course: '前端开发基础',
      instructor: '赵老师',
      startTime: '2024-03-14 20:00',
      duration: '60分钟',
      status: '已结束',
      students: 201
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>直播课堂</Title>
        <Text type="secondary">即将开始的直播课程和历史回放</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <VideoCameraOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
              <Title level={4}>待参加</Title>
              <Text strong>1</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '8px' }} />
              <Title level={4}>已参与</Title>
              <Text strong>3</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <UserOutlined style={{ fontSize: '32px', color: '#722ed1', marginBottom: '8px' }} />
              <Title level={4}>总课时</Title>
              <Text strong>4</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: '32px', color: '#fa8c16', marginBottom: '8px' }} />
              <Title level={4}>总时长</Title>
              <Text strong>351分钟</Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="即将开始的直播">
            <List
              itemLayout="vertical"
              size="large"
              dataSource={liveClasses.filter(cls => cls.status !== '已结束')}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  extra={
                    <div style={{ textAlign: 'center' }}>
                      {item.status === '进行中' ? (
                        <Tag color="red" style={{ marginBottom: '8px' }}>
                          <ClockCircleOutlined /> 进行中
                        </Tag>
                      ) : (
                        <Tag color="orange" style={{ marginBottom: '8px' }}>
                          <ClockCircleOutlined /> 即将开始
                        </Tag>
                      )}
                      <div style={{ marginTop: '8px' }}>
                        <Button type={item.status === '进行中' ? 'primary' : 'default'}>
                          {item.status === '进行中' ? '进入教室' : '设置提醒'}
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <List.Item.Meta
                    title={<a href="#">{item.title}</a>}
                    description={
                      <Space>
                        <Tag icon={<BookOutlined />} color="blue">{item.course}</Tag>
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
                        <span><UserOutlined /> {item.students} 人参加</span>
                        <span>课程材料: <a href="#">课件.pdf</a></span>
                      </Space>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="历史直播回放">
            <List
              itemLayout="horizontal"
              dataSource={liveClasses.filter(cls => cls.status === '已结束')}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[
                    <Button type="link" key="watch">观看回放</Button>,
                    <Button type="link" key="materials">课程资料</Button>,
                    <Button type="link" key="notes">课堂笔记</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<VideoCameraOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                    title={item.title}
                    description={
                      <Space direction="vertical">
                        <Space>
                          <Tag icon={<BookOutlined />} color="blue">{item.course}</Tag>
                          <Text>{item.instructor}</Text>
                        </Space>
                        <Space>
                          <CalendarOutlined /> {item.startTime}
                          <ClockCircleOutlined /> {item.duration}
                        </Space>
                      </Space>
                    }
                  />
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
import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag } from 'antd';
import { BookOutlined, StarOutlined, CalendarOutlined, PlayCircleOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const CoursesPage: React.FC = () => {
  // 模拟课程数据
  const courses = [
    {
      id: '1',
      title: '前端开发基础',
      instructor: '张老师',
      progress: 75,
      status: '进行中',
      category: '编程',
      startDate: '2024-01-15',
      endDate: '2024-03-15',
    },
    {
      id: '2',
      title: 'React 深入浅出',
      instructor: '李老师',
      progress: 40,
      status: '进行中',
      category: '前端',
      startDate: '2024-02-01',
      endDate: '2024-04-01',
    },
    {
      id: '3',
      title: 'TypeScript 实战',
      instructor: '王老师',
      progress: 100,
      status: '已完成',
      category: '编程',
      startDate: '2023-12-01',
      endDate: '2024-01-15',
    },
  ];

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '授课教师',
      dataIndex: 'instructor',
      key: 'instructor',
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={category === '编程' ? 'blue' : 'green'}>{category}</Tag>
      ),
    },
    {
      title: '进度',
      key: 'progress',
      render: (record: any) => (
        <div>
          <div>{record.progress}%</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${record.progress}%`, 
                height: '8px', 
                backgroundColor: record.progress === 100 ? '#52c41a' : '#1890ff',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === '已完成' ? 'green' : 'orange'}>{status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">查看</Button>
          <Button type="link">继续学习</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>我的课程</Title>
        <Text type="secondary">您正在学习和已完成的课程</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary">报名新课程</Button>
                <Button>我的收藏</Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={courses} 
              columns={columns} 
              rowKey="id"
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 门课程`
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </div>
            }
          >
            <Card.Meta
              title="前端开发基础"
              description="学习HTML, CSS, JavaScript基础知识"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <StarOutlined style={{ color: '#faad14' }} /> 4.8
              </div>
              <Button type="link">继续学习</Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />
              </div>
            }
          >
            <Card.Meta
              title="React 深入浅出"
              description="掌握React核心概念和最佳实践"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <StarOutlined style={{ color: '#faad14' }} /> 4.9
              </div>
              <Button type="link">继续学习</Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
              </div>
            }
          >
            <Card.Meta
              title="TypeScript 实战"
              description="TypeScript在项目中的实际应用"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <StarOutlined style={{ color: '#faad14' }} /> 4.7
              </div>
              <Button type="link">查看详情</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CoursesPage;
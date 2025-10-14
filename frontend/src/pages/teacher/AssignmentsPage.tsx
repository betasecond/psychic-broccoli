import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic, Divider } from 'antd';
import { FileTextOutlined, BookOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TeacherAssignmentsPage: React.FC = () => {
  // 模拟作业数据
  const assignments = [
    {
      id: '1',
      title: 'React 组件设计作业',
      course: 'React 深入浅出',
      dueDate: '2024-03-25',
      students: 156,
      submitted: 132,
      graded: 98,
      status: '进行中',
    },
    {
      id: '2',
      title: 'TypeScript 泛型练习',
      course: 'TypeScript 实战',
      dueDate: '2024-03-20',
      students: 98,
      submitted: 85,
      graded: 85,
      status: '批改中',
    },
    {
      id: '3',
      title: 'CSS 布局实战',
      course: '前端开发基础',
      dueDate: '2024-03-10',
      students: 203,
      submitted: 187,
      graded: 187,
      status: '已完成',
    },
  ];

  const columns = [
    {
      title: '作业名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '课程',
      dataIndex: 'course',
      key: 'course',
      render: (course: string) => (
        <Space>
          <BookOutlined />
          <span>{course}</span>
        </Space>
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
    {
      title: '学生数',
      key: 'students',
      render: (record: any) => (
        <Space>
          <UserOutlined />
          <span>{record.students}</span>
        </Space>
      ),
    },
    {
      title: '提交数',
      key: 'submitted',
      render: (record: any) => (
        <div>
          <div>{record.submitted}/{record.students}</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${(record.submitted / record.students) * 100}%`, 
                height: '8px', 
                backgroundColor: '#1890ff',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      ),
    },
    {
      title: '已批改',
      key: 'graded',
      render: (record: any) => (
        <div>
          <div>{record.graded}/{record.submitted}</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: record.submitted > 0 ? `${(record.graded / record.submitted) * 100}%` : '0%', 
                height: '8px', 
                backgroundColor: '#52c41a',
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
      render: (status: string) => {
        let color = 'default';
        switch(status) {
          case '进行中':
            color = 'blue';
            break;
          case '批改中':
            color = 'orange';
            break;
          case '已完成':
            color = 'green';
            break;
          default:
            color = 'default';
        }
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">查看</Button>
          <Button type="link">编辑</Button>
          <Button type="link">发布</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>作业管理</Title>
        <Text type="secondary">您发布的作业和学生提交情况</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总作业数"
              value={12}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="进行中"
              value={4}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已批改"
              value={8}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均提交率"
              value={85}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary" icon={<PlusOutlined />}>创建作业</Button>
                <Button icon={<EditOutlined />}>批量操作</Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索作业</Button>
                <Button>按状态筛选</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={assignments} 
              columns={columns} 
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个作业`
              }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="作业统计概览">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>React 组件设计作业</Text>
                  <Text>提交率: 85%</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>已提交: 132/156</Text>
                      <Text>{Math.round((132/156)*100)}%</Text>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${(132/156)*100}%`, 
                          height: '100%', 
                          backgroundColor: '#1890ff',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>已批改: 98/132</Text>
                      <Text>{Math.round((98/132)*100)}%</Text>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${(98/132)*100}%`, 
                          height: '100%', 
                          backgroundColor: '#52c41a',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>TypeScript 泛型练习</Text>
                  <Text>提交率: 87%</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>已提交: 85/98</Text>
                      <Text>{Math.round((85/98)*100)}%</Text>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${(85/98)*100}%`, 
                          height: '100%', 
                          backgroundColor: '#1890ff',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>已批改: 85/85</Text>
                      <Text>{Math.round((85/85)*100)}%</Text>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${(85/85)*100}%`, 
                          height: '100%', 
                          backgroundColor: '#52c41a',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </div>
            }
          >
            <Card.Meta
              title="React 组件设计作业"
              description="设计并实现一个可复用的用户信息卡片组件"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <BookOutlined /> React 深入浅出
              </div>
              <Button type="link">查看详情</Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileTextOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />
              </div>
            }
          >
            <Card.Meta
              title="TypeScript 泛型练习"
              description="理解并应用TypeScript泛型的概念"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <BookOutlined /> TypeScript 实战
              </div>
              <Button type="link">查看详情</Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileTextOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
              </div>
            }
          >
            <Card.Meta
              title="CSS 布局实战"
              description="使用Flexbox和Grid实现复杂页面布局"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <BookOutlined /> 前端开发基础
              </div>
              <Button type="link">查看详情</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherAssignmentsPage;
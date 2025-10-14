import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic, Avatar } from 'antd';
import { BookOutlined, UserOutlined, TeamOutlined, SearchOutlined, DownloadOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined, BarChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AdminCoursesPage: React.FC = () => {
  // 模拟课程数据
  const courses = [
    {
      id: '1',
      title: 'React 深入浅出',
      instructor: '张老师',
      students: 156,
      category: '前端开发',
      status: '进行中',
      progress: 75,
      rating: 4.8,
    },
    {
      id: '2',
      title: 'TypeScript 实战',
      instructor: '李老师',
      students: 98,
      category: '编程语言',
      status: '进行中',
      progress: 60,
      rating: 4.9,
    },
    {
      id: '3',
      title: '前端开发基础',
      instructor: '王老师',
      students: 203,
      category: '前端开发',
      status: '已完成',
      progress: 100,
      rating: 4.7,
    },
    {
      id: '4',
      title: 'Vue 3 实战课程',
      instructor: '赵老师',
      students: 87,
      category: '前端开发',
      status: '待开课',
      progress: 0,
      rating: 4.6,
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
      render: (instructor: string) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <span>{instructor}</span>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        switch(status) {
          case '进行中':
            color = 'blue';
            break;
          case '已完成':
            color = 'green';
            break;
          case '待开课':
            color = 'orange';
            break;
          default:
            color = 'default';
        }
        return <Tag color={color}>{status}</Tag>;
      },
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
                backgroundColor: record.progress === 100 ? '#52c41a' : record.progress > 50 ? '#1890ff' : '#fa8c16',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      ),
    },
    {
      title: '评分',
      key: 'rating',
      render: (record: any) => (
        <Space>
          <span style={{ color: '#faad14' }}>★</span>
          <span>{record.rating}</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">查看</Button>
          <Button type="link">编辑</Button>
          <Button type="link">数据</Button>
        </Space>
      ),
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
            <Statistic
              title="总课程数"
              value={128}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="进行中课程"
              value={89}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="学生总数"
              value={4589}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={4.6}
              precision={1}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary">新增课程</Button>
                <Button icon={<EditOutlined />}>批量操作</Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索课程</Button>
                <Button>按状态筛选</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={courses} 
              columns={columns} 
              rowKey="id"
              pagination={{
                pageSize: 10,
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
          <Card title="课程分布统计">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>前端开发</Text>
                  <Text strong>45</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '35%', 
                      height: '8px', 
                      backgroundColor: '#1890ff',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>后端开发</Text>
                  <Text strong>32</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '25%', 
                      height: '8px', 
                      backgroundColor: '#52c41a',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>编程语言</Text>
                  <Text strong>28</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '22%', 
                      height: '8px', 
                      backgroundColor: '#fa8c16',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>设计</Text>
                  <Text strong>23</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '18%', 
                      height: '8px', 
                      backgroundColor: '#722ed1',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="课程状态统计">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>进行中</Text>
                  <Text strong type="primary">89</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '70%', 
                      height: '8px', 
                      backgroundColor: '#1890ff',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>已完成</Text>
                  <Text strong type="success">35</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '27%', 
                      height: '8px', 
                      backgroundColor: '#52c41a',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>待开课</Text>
                  <Text strong type="warning">4</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '3%', 
                      height: '8px', 
                      backgroundColor: '#fa8c16',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="热门课程">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BarChartOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>最受好评课程</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>React 深入浅出 (4.9分)</Text>
                </div>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TeamOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>最多学生课程</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>前端开发基础 (203人)</Text>
                </div>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ClockCircleOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>最新开课</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>Vue 3 实战课程</Text>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminCoursesPage;
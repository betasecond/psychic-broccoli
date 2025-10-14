import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tabs, Tag, Statistic } from 'antd';
import { BookOutlined, UserOutlined, StarOutlined, FileTextOutlined, VideoCameraOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TeacherCoursesPage: React.FC = () => {
  // 模拟课程数据
  const courses = [
    {
      id: '1',
      title: 'React 深入浅出',
      students: 156,
      progress: 75,
      status: '进行中',
      category: '前端开发',
      rating: 4.8,
    },
    {
      id: '2',
      title: 'TypeScript 实战',
      students: 98,
      progress: 60,
      status: '进行中',
      category: '编程语言',
      rating: 4.9,
    },
    {
      id: '3',
      title: '前端开发基础',
      students: 203,
      progress: 100,
      status: '已完成',
      category: '前端开发',
      rating: 4.7,
    },
  ];

  // 模拟课程材料数据
  const materials = [
    {
      id: 'm1',
      name: 'React 基础课件.pdf',
      type: '文档',
      size: '2.4 MB',
      uploadDate: '2024-01-15',
      downloads: 124,
    },
    {
      id: 'm2',
      name: 'TypeScript 视频教程.mp4',
      type: '视频',
      size: '156 MB',
      uploadDate: '2024-02-01',
      downloads: 89,
    },
    {
      id: 'm3',
      name: '前端开发实战项目.zip',
      type: '压缩包',
      size: '12.3 MB',
      uploadDate: '2023-12-20',
      downloads: 156,
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
          <UserOutlined />
          <span>{students}</span>
        </Space>
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
        <Tag color={status === '已完成' ? 'green' : 'blue'}>{status}</Tag>
      ),
    },
    {
      title: '评分',
      key: 'rating',
      render: (record: any) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
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

  const materialColumns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === '文档' ? 'blue' : type === '视频' ? 'green' : 'orange'}>{type}</Tag>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: '上传日期',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
    },
    {
      title: '下载量',
      dataIndex: 'downloads',
      key: 'downloads',
      render: (downloads: number) => (
        <Space>
          <FileTextOutlined />
          <span>{downloads}</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">下载</Button>
          <Button type="link">编辑</Button>
          <Button type="link">删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>课程管理</Title>
        <Text type="secondary">您的教学课程和相关材料</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="我的课程"
              value={3}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="在学学生"
              value={457}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="课程材料"
              value={24}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={4.8}
              precision={1}
              prefix={<StarOutlined />}
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
                <Button type="primary" icon={<PlusOutlined />}>创建课程</Button>
                <Button icon={<EditOutlined />}>批量操作</Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索课程</Button>
                <Button>按状态筛选</Button>
              </Space>
            </div>
            
            <Tabs defaultActiveKey="courses">
              <TabPane tab="我的课程" key="courses">
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
              </TabPane>
              <TabPane tab="课程材料" key="materials">
                <Table 
                  dataSource={materials} 
                  columns={materialColumns} 
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 个材料`
                  }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <VideoCameraOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </div>
            }
          >
            <Card.Meta
              title="React 深入浅出"
              description="学习React核心概念和最佳实践"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <UserOutlined /> 156 学生
              </div>
              <Button type="link">管理</Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />
              </div>
            }
          >
            <Card.Meta
              title="TypeScript 实战"
              description="TypeScript在项目中的实际应用"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <UserOutlined /> 98 学生
              </div>
              <Button type="link">管理</Button>
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
              title="前端开发基础"
              description="HTML, CSS, JavaScript基础知识"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <UserOutlined /> 203 学生
              </div>
              <Button type="link">管理</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherCoursesPage;
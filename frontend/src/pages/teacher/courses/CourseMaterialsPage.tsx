import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic } from 'antd';
import { BookOutlined, UserOutlined, SearchOutlined, DownloadOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const CourseMaterialsPage: React.FC = () => {
  // 模拟课程资料数据
  const materials = [
    {
      id: 'm1',
      name: 'React 基础课件.pdf',
      type: '文档',
      size: '2.4 MB',
      uploadDate: '2024-01-15',
      downloads: 124,
      course: 'React 深入浅出'
    },
    {
      id: 'm2',
      name: 'TypeScript 视频教程.mp4',
      type: '视频',
      size: '156 MB',
      uploadDate: '2024-02-01',
      downloads: 89,
      course: 'TypeScript 实战'
    },
    {
      id: 'm3',
      name: '前端开发实战项目.zip',
      type: '压缩包',
      size: '12.3 MB',
      uploadDate: '2023-12-20',
      downloads: 156,
      course: '前端开发基础'
    },
    {
      id: 'm4',
      name: 'CSS Grid 详解.docx',
      type: '文档',
      size: '1.8 MB',
      uploadDate: '2024-02-10',
      downloads: 67,
      course: '前端开发基础'
    },
    {
      id: 'm5',
      name: 'JavaScript 高级特性.pptx',
      type: '演示文稿',
      size: '5.2 MB',
      uploadDate: '2024-01-28',
      downloads: 98,
      course: 'JavaScript 高级编程'
    },
  ];

  const columns = [
    {
      title: '资料名称',
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === '文档' ? 'blue' : type === '视频' ? 'green' : type === '压缩包' ? 'orange' : 'purple'}>{type}</Tag>
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
          <DownloadOutlined />
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
        <Title level={2}>课程资料</Title>
        <Text type="secondary">您所有课程的资料管理</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总资料数"
              value={24}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="文档类"
              value={12}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="视频类"
              value={6}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总下载量"
              value={892}
              prefix={<DownloadOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary">上传资料</Button>
                <Button icon={<EditOutlined />}>批量操作</Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索资料</Button>
                <Button>按类型筛选</Button>
                <Button>按课程筛选</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={materials} 
              columns={columns} 
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个资料`
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CourseMaterialsPage;
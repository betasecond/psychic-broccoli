import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic, Divider } from 'antd';
import { FileTextOutlined, BookOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const GradingPage: React.FC = () => {
  // 模拟待批改作业数据
  const assignments = [
    {
      id: '1',
      title: 'React 组件设计作业',
      student: '张三',
      course: 'React 深入浅出',
      submitDate: '2024-03-24',
      status: '待批改',
    },
    {
      id: '2',
      title: 'TypeScript 泛型练习',
      student: '李四',
      course: 'TypeScript 实战',
      submitDate: '2024-03-23',
      status: '待批改',
    },
    {
      id: '3',
      title: 'CSS 布局实战',
      student: '王五',
      course: '前端开发基础',
      submitDate: '2024-03-09',
      status: '已批改',
    },
  ];

  const columns = [
    {
      title: '学生姓名',
      dataIndex: 'student',
      key: 'student',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '作业名称',
      dataIndex: 'title',
      key: 'title',
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
      title: '提交日期',
      dataIndex: 'submitDate',
      key: 'submitDate',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        switch(status) {
          case '待批改':
            color = 'orange';
            break;
          case '已批改':
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
          <Button type="link">查看提交</Button>
          <Button type="primary">批改</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>批改作业</Title>
        <Text type="secondary">待批改和已批改的作业</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待批改"
              value={42}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日批改"
              value={8}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已批改"
              value={187}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均分"
              value={85.5}
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
                <Button type="primary">批量批改</Button>
                <Button icon={<EditOutlined />}>批量操作</Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索作业</Button>
                <Button>按课程筛选</Button>
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
                showTotal: (total) => `共 ${total} 份作业`
              }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="作业批改说明">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>批改流程：</Text>
                <Text>点击"批改"按钮进入详细批改页面，根据作业要求和评分标准进行评分，并填写评语。</Text>
              </div>
              <div>
                <Text strong>评分标准：</Text>
                <Text>满分100分，根据代码质量、功能实现、文档完整性等方面综合评分。</Text>
              </div>
              <div>
                <Text strong>反馈时间：</Text>
                <Text>请在收到作业后3个工作日内完成批改并反馈给学生。</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GradingPage;
import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Progress } from 'antd';
import { FileTextOutlined, CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AssignmentsPage: React.FC = () => {
  // 模拟作业数据
  const assignments = [
    {
      id: '1',
      title: 'React 组件设计作业',
      course: 'React 深入浅出',
      dueDate: '2024-03-15',
      status: '待提交',
      progress: 0,
      grade: '-',
      type: '编程作业'
    },
    {
      id: '2',
      title: 'TypeScript 类型系统练习',
      course: 'TypeScript 实战',
      dueDate: '2024-02-20',
      status: '已提交',
      progress: 100,
      grade: '85',
      type: '编程作业'
    },
    {
      id: '3',
      title: '前端框架对比分析',
      course: '前端开发基础',
      dueDate: '2024-01-30',
      status: '已批改',
      progress: 100,
      grade: '92',
      type: '论文'
    },
    {
      id: '4',
      title: 'CSS 布局实战',
      course: '前端开发基础',
      dueDate: '2024-02-10',
      status: '已批改',
      progress: 100,
      grade: '88',
      type: '编程作业'
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
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === '编程作业' ? 'blue' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{date}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        let icon = null;
        
        switch(status) {
          case '待提交':
            color = 'orange';
            icon = <ClockCircleOutlined />;
            break;
          case '已提交':
            color = 'blue';
            icon = <CheckCircleOutlined />;
            break;
          case '已批改':
            color = 'green';
            icon = <CheckCircleOutlined />;
            break;
          default:
            color = 'default';
        }
        
        return (
          <Space>
            {icon}
            <Tag color={color}>{status}</Tag>
          </Space>
        );
      },
    },
    {
      title: '成绩',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade: string) => (
        <div>
          {grade !== '-' ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{grade}</span>
              <span style={{ marginLeft: '4px' }}>/100</span>
            </div>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space size="middle">
          {record.status === '待提交' ? (
            <Button type="primary">提交作业</Button>
          ) : (
            <Button type="link">查看详情</Button>
          )}
          <Button type="link">下载</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>作业任务</Title>
        <Text type="secondary">您需要完成的作业和练习</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary">查看全部作业</Button>
                <Button>我的待完成</Button>
              </Space>
              <Space>
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
                showTotal: (total) => `共 ${total} 个作业`
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="作业状态概览">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>待提交作业</Text>
                  <Text strong type="warning">2 个</Text>
                </div>
                <Progress percent={25} strokeColor="#fa8c16" />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>已提交作业</Text>
                  <Text strong type="secondary">1 个</Text>
                </div>
                <Progress percent={50} strokeColor="#1890ff" />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>已批改作业</Text>
                  <Text strong type="success">2 个</Text>
                </div>
                <Progress percent={50} strokeColor="#52c41a" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AssignmentsPage;
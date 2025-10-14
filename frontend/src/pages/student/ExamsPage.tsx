import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic, Divider } from 'antd';
import { BarChartOutlined, TrophyOutlined, ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ExamsPage: React.FC = () => {
  // 模拟考试数据
  const exams = [
    {
      id: '1',
      title: 'React 基础测试',
      course: 'React 深入浅出',
      date: '2024-03-20',
      time: '90分钟',
      status: '待考试',
      score: '-',
      maxScore: '100'
    },
    {
      id: '2',
      title: 'TypeScript 概念测试',
      course: 'TypeScript 实战',
      date: '2024-02-25',
      time: '60分钟',
      status: '已完成',
      score: '85',
      maxScore: '100'
    },
    {
      id: '3',
      title: '前端基础综合考试',
      course: '前端开发基础',
      date: '2024-01-25',
      time: '120分钟',
      status: '已批改',
      score: '94',
      maxScore: '100'
    },
    {
      id: '4',
      title: 'CSS 专项测试',
      course: '前端开发基础',
      date: '2024-02-05',
      time: '45分钟',
      status: '已批改',
      score: '88',
      maxScore: '100'
    },
  ];

  const columns = [
    {
      title: '考试名称',
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
      title: '考试时间',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined />
          <span>{time}</span>
        </Space>
      ),
    },
    {
      title: '考试日期',
      dataIndex: 'date',
      key: 'date',
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
          case '待考试':
            color = 'orange';
            icon = <ExclamationCircleOutlined />;
            break;
          case '已完成':
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
      key: 'score',
      render: (record: any) => (
        <div>
          {record.score !== '-' ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{record.score}</span>
              <span style={{ marginLeft: '4px' }}>/ {record.maxScore}</span>
            </div>
          ) : (
            <Text type="secondary">{record.status === '待考试' ? '待考试' : '-'}</Text>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space size="middle">
          {record.status === '待考试' ? (
            <Button type="primary">开始考试</Button>
          ) : (
            <Button type="link">查看结果</Button>
          )}
          <Button type="link">下载报告</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>考试测验</Title>
        <Text type="secondary">您的考试安排和成绩</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总考试数"
              value={4}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已考试"
              value={3}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均分"
              value={89}
              suffix="/100"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待考试"
              value={1}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary">查看全部考试</Button>
                <Button>我的成绩</Button>
              </Space>
              <Space>
                <Button>按状态筛选</Button>
                <Button>导出成绩单</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={exams} 
              columns={columns} 
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 场考试`
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="考试历史">
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '8px 0' }}>
              {exams.filter(exam => exam.status !== '待考试').map((exam) => (
                <Card 
                  key={exam.id} 
                  size="small" 
                  style={{ minWidth: '200px' }}
                  title={`${exam.course} - ${exam.title}`}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: exam.score >= 90 ? '#52c41a' : exam.score >= 80 ? '#1890ff' : '#fa8c16' }}>
                      {exam.score}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Tag color={exam.status === '已批改' ? 'green' : 'blue'}>{exam.status}</Tag>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExamsPage;
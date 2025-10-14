import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic, Divider, Tabs } from 'antd';
import { BarChartOutlined, BookOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ExamResultsPage: React.FC = () => {
  // 模拟考试结果数据
  const examResults = [
    {
      id: '1',
      student: '张三',
      course: 'React 深入浅出',
      exam: 'React 基础测试',
      score: 88,
      totalScore: 100,
      status: '已批改',
      submitDate: '2024-03-26',
    },
    {
      id: '2',
      student: '李四',
      course: 'TypeScript 实战',
      exam: 'TypeScript 概念测试',
      score: 92,
      totalScore: 100,
      status: '已批改',
      submitDate: '2024-03-21',
    },
    {
      id: '3',
      student: '王五',
      course: '前端开发基础',
      exam: '前端基础综合考试',
      score: 94,
      totalScore: 100,
      status: '已批改',
      submitDate: '2024-03-11',
    },
  ];

  const examColumns = [
    {
      title: '学生姓名',
      dataIndex: 'student',
      key: 'student',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '考试名称',
      dataIndex: 'exam',
      key: 'exam',
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
      title: '得分',
      key: 'score',
      render: (record: any) => (
        <div>
          <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>{record.score}</Text>
          <Text> / {record.totalScore}</Text>
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
          case '已批改':
            color = 'green';
            break;
          case '待批改':
            color = 'orange';
            break;
          default:
            color = 'default';
        }
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '提交日期',
      dataIndex: 'submitDate',
      key: 'submitDate',
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">查看详情</Button>
          <Button type="link">下载报告</Button>
        </Space>
      ),
    },
  ];

  // 模拟考试概览数据
  const examStats = [
    { id: '1', exam: 'React 基础测试', students: 142, avgScore: 82.5, passRate: 85 },
    { id: '2', exam: 'TypeScript 概念测试', students: 91, avgScore: 87.3, passRate: 91 },
    { id: '3', exam: '前端基础综合考试', students: 189, avgScore: 89.7, passRate: 93 },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>考试结果</Title>
        <Text type="secondary">考试结果和学生成绩管理</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="考试数"
              value={8}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="参与学生"
              value={456}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均分"
              value={86.5}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均通过率"
              value={89}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <Tabs defaultActiveKey="results">
              <TabPane tab="考试结果" key="results">
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Button icon={<EditOutlined />}>批量操作</Button>
                  </Space>
                  <Space>
                    <Button icon={<SearchOutlined />}>搜索学生</Button>
                    <Button>按考试筛选</Button>
                    <Button>导出成绩</Button>
                  </Space>
                </div>
                
                <Table 
                  dataSource={examResults} 
                  columns={examColumns} 
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条成绩记录`
                  }}
                />
              </TabPane>
              <TabPane tab="考试统计" key="stats">
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Space>
                    <Button>查看图表</Button>
                    <Button>导出统计</Button>
                  </Space>
                </div>
                
                <Table 
                  dataSource={examStats} 
                  columns={[
                    {
                      title: '考试名称',
                      dataIndex: 'exam',
                      key: 'exam',
                      render: (text: string) => <Text strong>{text}</Text>,
                    },
                    {
                      title: '参加学生',
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
                      title: '平均分',
                      dataIndex: 'avgScore',
                      key: 'avgScore',
                    },
                    {
                      title: '通过率',
                      key: 'passRate',
                      render: (record: any) => (
                        <div>
                          <div>{record.passRate}%</div>
                          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${record.passRate}%`, 
                                height: '8px', 
                                backgroundColor: '#52c41a',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                        </div>
                      ),
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            hoverable
            cover={
              <div style={{ height: '120px', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChartOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </div>
            }
          >
            <Card.Meta
              title="React 基础测试"
              description="2024年春季学期"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <UserOutlined /> 142 学生
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
                <BarChartOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />
              </div>
            }
          >
            <Card.Meta
              title="TypeScript 概念测试"
              description="2024年春季学期"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <UserOutlined /> 91 学生
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
                <BarChartOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
              </div>
            }
          >
            <Card.Meta
              title="前端基础综合考试"
              description="2024年春季学期"
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <UserOutlined /> 189 学生
              </div>
              <Button type="link">查看详情</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExamResultsPage;
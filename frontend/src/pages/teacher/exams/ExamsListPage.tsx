import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic, Divider, Input } from 'antd';
import { BarChartOutlined, BookOutlined, SearchOutlined, PlusOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { examService } from '../../../services';

const { Title, Text } = Typography;
const { Search } = Input;

const ExamsListPage: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 模拟考试数据
  const mockExams = [
    {
      id: '1',
      title: 'React 基础测试',
      course: 'React 深入浅出',
      date: '2024-03-25',
      time: '90分钟',
      students: 156,
      participated: 142,
      graded: 138,
      status: '进行中',
    },
    {
      id: '2',
      title: 'TypeScript 概念测试',
      course: 'TypeScript 实战',
      date: '2024-03-20',
      time: '60分钟',
      students: 98,
      participated: 91,
      graded: 91,
      status: '批改中',
    },
    {
      id: '3',
      title: '前端基础综合考试',
      course: '前端开发基础',
      date: '2024-03-10',
      time: '120分钟',
      students: 203,
      participated: 189,
      graded: 189,
      status: '已完成',
    },
    {
      id: '4',
      title: 'JavaScript 高级特性考试',
      course: 'JavaScript 高级编程',
      date: '2024-04-05',
      time: '75分钟',
      students: 134,
      participated: 0,
      graded: 0,
      status: '未开始',
    },
  ];

  // 获取考试列表
  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await examService.getExams({
        title: searchText || undefined,
      });
      // 如果后端返回了数据，使用后端数据，否则使用模拟数据
      if (response.data.exams && response.data.exams.length > 0) {
        // 转换后端数据格式以匹配现有表格结构
        const formattedExams = response.data.exams.map((exam: any) => ({
          id: exam.id.toString(),
          title: exam.title,
          course: exam.courseTitle || '未知课程',
          date: new Date(exam.startTime).toISOString().split('T')[0],
          time: `${Math.floor((new Date(exam.endTime).getTime() - new Date(exam.startTime).getTime()) / (1000 * 60))}分钟`,
          students: 0, // 后端未返回，使用默认值
          participated: 0, // 后端未返回，使用默认值
          graded: 0, // 后端未返回，使用默认值
          status: exam.status || '未知',
        }));
        setExams(formattedExams);
      } else {
        setExams(mockExams);
      }
    } catch (error) {
      console.error('获取考试列表失败:', error);
      // 发生错误时使用模拟数据
      setExams(mockExams);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    fetchExams();
  }, [searchText]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

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
      render: (course: string) => (
        <Space>
          <BookOutlined />
          <span>{course}</span>
        </Space>
      ),
    },
    {
      title: '考试日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '考试时长',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: '应考学生',
      key: 'students',
      render: (record: any) => (
        <Space>
          <span>{record.students}</span>
        </Space>
      ),
    },
    {
      title: '参与考试',
      key: 'participated',
      render: (record: any) => (
        <div>
          <div>{record.participated}/{record.students}</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${(record.participated / record.students) * 100}%`, 
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
          <div>{record.graded}/{record.participated}</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: record.participated > 0 ? `${(record.graded / record.participated) * 100}%` : '0%', 
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
          case '未开始':
            color = 'grey';
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
        <Title level={2}>考试列表</Title>
        <Text type="secondary">您创建的所有考试</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总考试数"
              value={8}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="进行中"
              value={2}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已批改"
              value={3}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均参与率"
              value={92}
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
                <Button type="primary" icon={<PlusOutlined />}>创建考试</Button>
                <Button icon={<EditOutlined />}>批量操作</Button>
              </Space>
              <Space>
                <Search
                  placeholder="搜索考试"
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="middle"
                  onSearch={handleSearch}
                  style={{ width: 200 }}
                />
                <Button>按状态筛选</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={exams} 
              columns={columns} 
              rowKey="id"
              loading={loading}
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
              description="测试React基础知识掌握情况"
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
                <BarChartOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />
              </div>
            }
          >
            <Card.Meta
              title="TypeScript 概念测试"
              description="测试TypeScript核心概念理解"
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
                <BarChartOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
              </div>
            }
          >
            <Card.Meta
              title="前端基础综合考试"
              description="前端开发基础知识综合测试"
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

export default ExamsListPage;
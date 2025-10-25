import React, { useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Statistic, Divider, Spin, message } from 'antd';
import { BarChartOutlined, TrophyOutlined, ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, selectMyExams, selectExamLoading, selectExamError } from '../../store';
import { fetchMyExams } from '../../store/slices/examSlice';

const { Title, Text } = Typography;

const ExamsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const exams = useAppSelector(selectMyExams);
  const loading = useAppSelector(selectExamLoading);
  const error = useAppSelector(selectExamError);

  useEffect(() => {
    dispatch(fetchMyExams());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  // 计算统计数据
  const stats = React.useMemo(() => {
    const completed = exams.filter(e => e.submitted);
    const pending = exams.filter(e => !e.submitted && e.status !== '已结束');
    const scores = exams.filter(e => e.totalScore !== undefined).map(e => e.totalScore!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    return {
      total: exams.length,
      completed: completed.length,
      pending: pending.length,
      avgScore,
    };
  }, [exams]);

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '课程',
      dataIndex: 'courseTitle',
      key: 'courseTitle',
    },
    {
      title: '考试时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (startTime: string, record: any) => {
        const start = new Date(startTime);
        const end = new Date(record.endTime);
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
        return (
          <Space>
            <ClockCircleOutlined />
            <span>{duration} 分钟</span>
          </Space>
        );
      },
    },
    {
      title: '考试日期',
      dataIndex: 'startTime',
      key: 'date',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{new Date(date).toLocaleDateString('zh-CN')}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        let color = 'default';
        let icon = null;
        let displayStatus = status;
        
        if (record.submitted) {
          color = 'green';
          icon = <CheckCircleOutlined />;
          displayStatus = '已完成';
        } else if (status === '进行中') {
          color = 'blue';
          icon = <ClockCircleOutlined />;
        } else if (status === '未开始') {
          color = 'orange';
          icon = <ExclamationCircleOutlined />;
        } else {
          color = 'default';
        }
        
        return (
          <Space>
            {icon}
            <Tag color={color}>{displayStatus}</Tag>
          </Space>
        );
      },
    },
    {
      title: '成绩',
      dataIndex: 'totalScore',
      key: 'score',
      render: (score: number | undefined) => (
        <div>
          {score !== undefined && score !== null ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{score}</span>
              <span style={{ marginLeft: '4px' }}>/ 100</span>
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
          {!record.submitted && record.status === '进行中' ? (
            <Button type="primary" onClick={() => navigate(`/student/exams/${record.id}/take`)}>开始考试</Button>
          ) : record.submitted ? (
            <Button type="link" onClick={() => navigate(`/student/exams/${record.id}`)}>查看结果</Button>
          ) : (
            <Button type="link" onClick={() => navigate(`/student/exams/${record.id}`)}>查看详情</Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading && exams.length === 0) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

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
              value={stats.total}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已考试"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均分"
              value={stats.avgScore}
              suffix="/100"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待考试"
              value={stats.pending}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
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

      {stats.completed > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col span={24}>
            <Card title="考试历史">
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '8px 0' }}>
                {exams.filter(exam => exam.submitted).map((exam) => (
                  <Card 
                    key={exam.id} 
                    size="small" 
                    style={{ minWidth: '200px', cursor: 'pointer' }}
                    title={`${exam.courseTitle} - ${exam.title}`}
                    onClick={() => navigate(`/student/exams/${exam.id}`)}
                    hoverable
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold', 
                        color: exam.totalScore && exam.totalScore >= 90 ? '#52c41a' : exam.totalScore && exam.totalScore >= 80 ? '#1890ff' : '#fa8c16' 
                      }}>
                        {exam.totalScore !== undefined ? exam.totalScore : '-'}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <Tag color="green">已完成</Tag>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ExamsPage;

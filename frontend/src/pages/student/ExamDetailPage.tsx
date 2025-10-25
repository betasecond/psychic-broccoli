import React, { useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag, Divider, Spin, message, Table } from 'antd';
import { 
  BarChartOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector, selectCurrentExam, selectMyExamSubmission, selectExamLoading } from '../../store';
import { fetchExam, fetchMySubmission, clearCurrentExam, clearMySubmission } from '../../store/slices/examSlice';

const { Title, Text, Paragraph } = Typography;

const ExamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const exam = useAppSelector(selectCurrentExam);
  const submission = useAppSelector(selectMyExamSubmission);
  const loading = useAppSelector(selectExamLoading);

  useEffect(() => {
    if (id) {
      dispatch(fetchExam(Number(id)));
      // 尝试获取学生的提交记录
      dispatch(fetchMySubmission(Number(id))).catch(() => {
        // 如果没有提交记录，忽略错误
      });
    }
    return () => {
      dispatch(clearCurrentExam());
      dispatch(clearMySubmission());
    };
  }, [id, dispatch]);

  if (loading && !exam) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Text>考试不存在</Text>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  let examStatus = '未开始';
  let canTakeExam = false;

  if (now.getTime() < startTime.getTime()) {
    examStatus = '未开始';
  } else if (now.getTime() > endTime.getTime()) {
    examStatus = '已结束';
  } else {
    examStatus = '进行中';
    canTakeExam = !submission;
  }

  const answerColumns = [
    {
      title: '题号',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 80,
    },
    {
      title: '题目类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          'SINGLE_CHOICE': '单选题',
          'MULTIPLE_CHOICE': '多选题',
          'TRUE_FALSE': '判断题',
          'SHORT_ANSWER': '简答题',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '题目',
      dataIndex: 'stem',
      key: 'stem',
      ellipsis: true,
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 80,
    },
    {
      title: '得分',
      dataIndex: 'scoreAwarded',
      key: 'scoreAwarded',
      width: 80,
      render: (score: number | undefined) => (
        score !== undefined ? (
          <Text strong style={{ color: '#52c41a' }}>{score}</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/exams')}>
          返回考试列表
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Space>
                  <BarChartOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={2} style={{ margin: 0 }}>{exam.title}</Title>
                </Space>
                <div style={{ marginTop: '12px' }}>
                  <Tag color={examStatus === '进行中' ? 'blue' : examStatus === '已结束' ? 'default' : 'orange'}>
                    {examStatus}
                  </Tag>
                  {submission && <Tag color="green" icon={<CheckCircleOutlined />}>已完成</Tag>}
                  <Text type="secondary" style={{ marginLeft: '12px' }}>
                    课程：{exam.courseTitle}
                  </Text>
                </div>
              </div>

              <Divider />

              <div>
                <Title level={4}>考试信息</Title>
                <Space direction="vertical" size="middle">
                  <div>
                    <Space>
                      <CalendarOutlined />
                      <Text strong>考试时间：</Text>
                      <Text>{startTime.toLocaleString('zh-CN')} - {endTime.toLocaleString('zh-CN')}</Text>
                    </Space>
                  </div>
                  <div>
                    <Space>
                      <ClockCircleOutlined />
                      <Text strong>考试时长：</Text>
                      <Text>{duration} 分钟</Text>
                    </Space>
                  </div>
                </Space>
              </div>

              {!submission && canTakeExam && (
                <>
                  <Divider />
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Button 
                      type="primary" 
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={() => navigate(`/student/exams/${id}/take`)}
                    >
                      开始考试
                    </Button>
                    <div style={{ marginTop: '16px' }}>
                      <Text type="secondary">请确保您有足够的时间完成考试</Text>
                    </div>
                  </div>
                </>
              )}

              {!submission && !canTakeExam && examStatus === '未开始' && (
                <>
                  <Divider />
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Text type="secondary">考试尚未开始，请等待考试开始时间</Text>
                  </div>
                </>
              )}

              {!submission && examStatus === '已结束' && (
                <>
                  <Divider />
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Text type="secondary">考试已结束，您未参加此次考试</Text>
                  </div>
                </>
              )}

              {submission && (
                <>
                  <Divider />
                  <div>
                    <Title level={4}>考试成绩</Title>
                    <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                      <Text type="secondary">您的成绩</Text>
                      <div style={{ marginTop: '12px' }}>
                        <Text style={{ fontSize: '48px', fontWeight: 'bold', color: '#52c41a' }}>
                          {submission.totalScore !== undefined ? submission.totalScore : '-'}
                        </Text>
                        <Text style={{ fontSize: '24px' }}> / 100</Text>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <Text type="secondary">
                          提交时间：{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('zh-CN') : '-'}
                        </Text>
                      </div>
                    </div>
                  </div>

                  {submission.answers && submission.answers.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <Title level={4}>答题详情</Title>
                        <Table
                          dataSource={submission.answers}
                          columns={answerColumns}
                          rowKey="questionId"
                          pagination={false}
                          expandable={{
                            expandedRowRender: (record) => (
                              <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                                <div style={{ marginBottom: '12px' }}>
                                  <Text strong>题目：</Text>
                                  <Paragraph>{record.stem}</Paragraph>
                                </div>
                                {record.options && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <Text strong>选项：</Text>
                                    <Paragraph>{record.options}</Paragraph>
                                  </div>
                                )}
                                <div style={{ marginBottom: '12px' }}>
                                  <Text strong>您的答案：</Text>
                                  <Paragraph style={{ color: '#1890ff' }}>{record.studentAnswer}</Paragraph>
                                </div>
                                <div>
                                  <Text strong>正确答案：</Text>
                                  <Paragraph style={{ color: '#52c41a' }}>{record.correctAnswer}</Paragraph>
                                </div>
                              </div>
                            ),
                          }}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="考试信息">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">课程名称</Text>
                <div><Text strong>{exam.courseTitle}</Text></div>
              </div>

              <div>
                <Text type="secondary">开始时间</Text>
                <div><Text strong>{startTime.toLocaleString('zh-CN')}</Text></div>
              </div>

              <div>
                <Text type="secondary">结束时间</Text>
                <div><Text strong>{endTime.toLocaleString('zh-CN')}</Text></div>
              </div>

              <div>
                <Text type="secondary">考试时长</Text>
                <div><Text strong>{duration} 分钟</Text></div>
              </div>

              <div>
                <Text type="secondary">状态</Text>
                <div>
                  <Tag color={examStatus === '进行中' ? 'blue' : examStatus === '已结束' ? 'default' : 'orange'}>
                    {examStatus}
                  </Tag>
                  {submission && <Tag color="green">已完成</Tag>}
                </div>
              </div>

              {submission && submission.totalScore !== undefined && (
                <div>
                  <Text type="secondary">成绩</Text>
                  <div>
                    <Text strong style={{ fontSize: '24px', color: '#52c41a' }}>
                      {submission.totalScore} / 100
                    </Text>
                  </div>
                </div>
              )}
            </Space>
          </Card>

          {canTakeExam && (
            <Card title="考试须知" style={{ marginTop: '16px' }}>
              <Space direction="vertical" size="small">
                <Text><FileTextOutlined /> 请在规定时间内完成考试</Text>
                <Text><ClockCircleOutlined /> 考试一旦开始，必须在时限内完成</Text>
                <Text><CheckCircleOutlined /> 答题完成后请及时提交</Text>
              </Space>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ExamDetailPage;


import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Space, Form, Input, message, Spin, Tag, Divider } from 'antd';
import { 
  FileTextOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  UploadOutlined,
  ArrowLeftOutlined 
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector, selectCurrentAssignment, selectAssignmentLoading } from '../../store';
import { fetchAssignment, submitAssignment, clearCurrentAssignment } from '../../store/slices/assignmentSlice';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const assignment = useAppSelector(selectCurrentAssignment);
  const loading = useAppSelector(selectAssignmentLoading);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchAssignment(Number(id)));
    }
    return () => {
      dispatch(clearCurrentAssignment());
    };
  }, [id, dispatch]);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    
    setSubmitting(true);
    try {
      await dispatch(submitAssignment({
        id: Number(id),
        data: {
          content: values.content,
          attachments: values.attachments,
        }
      })).unwrap();
      
      message.success('作业提交成功！');
      // 重新获取作业详情
      dispatch(fetchAssignment(Number(id)));
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !assignment) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Text>作业不存在</Text>
        </Card>
      </div>
    );
  }

  const getStatusTag = () => {
    if (assignment.graded) {
      return <Tag color="green" icon={<CheckCircleOutlined />}>已批改</Tag>;
    } else if (assignment.submitted) {
      return <Tag color="blue" icon={<CheckCircleOutlined />}>已提交</Tag>;
    } else {
      return <Tag color="orange" icon={<ClockCircleOutlined />}>待提交</Tag>;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/assignments')}>
          返回作业列表
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Space>
                  <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={2} style={{ margin: 0 }}>{assignment.title}</Title>
                </Space>
                <div style={{ marginTop: '12px' }}>
                  {getStatusTag()}
                  <Text type="secondary" style={{ marginLeft: '12px' }}>
                    课程：{assignment.courseTitle}
                  </Text>
                </div>
              </div>

              <Divider />

              <div>
                <Title level={4}>作业要求</Title>
                <Paragraph>
                  {assignment.content || '暂无作业说明'}
                </Paragraph>
              </div>

              {assignment.deadline && (
                <div>
                  <Space>
                    <CalendarOutlined />
                    <Text strong>截止日期：</Text>
                    <Text>{new Date(assignment.deadline).toLocaleString('zh-CN')}</Text>
                  </Space>
                </div>
              )}

              {assignment.submitted && assignment.graded && (
                <>
                  <Divider />
                  <div>
                    <Title level={4}>批改结果</Title>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <Text strong>成绩：</Text>
                        <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a', marginLeft: '12px' }}>
                          {assignment.grade}
                        </Text>
                        <Text style={{ fontSize: '16px' }}> / 100</Text>
                      </div>
                      {assignment.feedback && (
                        <div>
                          <Text strong>教师评语：</Text>
                          <Paragraph style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                            {assignment.feedback}
                          </Paragraph>
                        </div>
                      )}
                    </Space>
                  </div>
                </>
              )}

              {!assignment.submitted && (
                <>
                  <Divider />
                  <div>
                    <Title level={4}>提交作业</Title>
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleSubmit}
                    >
                      <Form.Item
                        label="作业内容"
                        name="content"
                        rules={[{ required: true, message: '请输入作业内容' }]}
                      >
                        <TextArea
                          rows={8}
                          placeholder="请输入您的作业答案..."
                        />
                      </Form.Item>

                      <Form.Item
                        label="附件链接（可选）"
                        name="attachments"
                      >
                        <Input placeholder="如有附件，请输入附件链接" />
                      </Form.Item>

                      <Form.Item>
                        <Button 
                          type="primary" 
                          htmlType="submit" 
                          icon={<UploadOutlined />}
                          loading={submitting}
                          size="large"
                        >
                          提交作业
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                </>
              )}

              {assignment.submitted && !assignment.graded && (
                <>
                  <Divider />
                  <div>
                    <Title level={4}>我的提交</Title>
                    <Paragraph style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                      作业已提交，等待教师批改...
                    </Paragraph>
                    {assignment.submittedAt && (
                      <Text type="secondary">
                        提交时间：{new Date(assignment.submittedAt).toLocaleString('zh-CN')}
                      </Text>
                    )}
                  </div>
                </>
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="作业信息">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">课程名称</Text>
                <div><Text strong>{assignment.courseTitle}</Text></div>
              </div>

              {assignment.deadline && (
                <div>
                  <Text type="secondary">截止时间</Text>
                  <div><Text strong>{new Date(assignment.deadline).toLocaleString('zh-CN')}</Text></div>
                </div>
              )}

              <div>
                <Text type="secondary">状态</Text>
                <div>{getStatusTag()}</div>
              </div>

              {assignment.submitted && assignment.submittedAt && (
                <div>
                  <Text type="secondary">提交时间</Text>
                  <div><Text strong>{new Date(assignment.submittedAt).toLocaleString('zh-CN')}</Text></div>
                </div>
              )}

              {assignment.graded && assignment.grade !== undefined && (
                <div>
                  <Text type="secondary">成绩</Text>
                  <div>
                    <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                      {assignment.grade} / 100
                    </Text>
                  </div>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AssignmentDetailPage;


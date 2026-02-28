import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Button, Typography, Space, Form, Input,
  message, Spin, Tag, Divider, Upload, Alert,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  ArrowLeftOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAppDispatch,
  useAppSelector,
  selectCurrentAssignment,
  selectAssignmentLoading,
} from '../../store';
import {
  fetchAssignment,
  submitAssignment,
  clearCurrentAssignment,
} from '../../store/slices/assignmentSlice';
import { uploadFile } from '../../services/fileService';
import { assignmentService, type AssignmentSubmission } from '../../services/assignmentService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const assignment = useAppSelector(selectCurrentAssignment);
  const loading = useAppSelector(selectAssignmentLoading);
  const currentUser = useAppSelector((state: any) => state.auth.user);

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 当前学生的提交记录（独立于 Redux，按需刷新）
  const [mySubmission, setMySubmission] = useState<AssignmentSubmission | null>(null);
  const [submissionLoaded, setSubmissionLoaded] = useState(false);

  // 拉取当前学生对本作业的提交记录
  const fetchMySubmission = async () => {
    if (!id || !currentUser?.userId) return;
    try {
      const result = await assignmentService.getSubmissions({
        assignmentId: Number(id),
        studentId: currentUser.userId,
      });
      const list = result as unknown as AssignmentSubmission[];
      setMySubmission(list.length > 0 ? list[0] : null);
    } catch {
      // 未提交时后端可能返回空数组，忽略错误
    } finally {
      setSubmissionLoaded(true);
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchAssignment(Number(id)));
      fetchMySubmission();
    }
    return () => {
      dispatch(clearCurrentAssignment());
    };
  }, [id]);

  // 提交作业
  const handleSubmit = async (values: any) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const attachmentURLs = fileList
        .filter(f => f.status === 'done' && f.response?.url)
        .map(f => f.response.url);

      await dispatch(submitAssignment({
        id: Number(id),
        data: {
          content: values.content,
          attachments: attachmentURLs.length > 0 ? JSON.stringify(attachmentURLs) : undefined,
        },
      })).unwrap();

      message.success('作业提交成功！');
      form.resetFields();
      setFileList([]);
      await fetchMySubmission(); // 刷新提交状态
    } catch (error: any) {
      message.error(error.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    maxCount: 5,
    beforeUpload: (file) => {
      const allowed = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|jpg|jpeg|png|gif|bmp|svg|zip|rar|7z|html|css|js|json|xml|go|py|java|c|cpp)$/i.test(file.name);
      if (!allowed) {
        message.error(`${file.name} 不是支持的文件类型！`);
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 10) {
        message.error(`${file.name} 超过 10MB 限制！`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true);
      try {
        const result = await uploadFile(file as File);
        onSuccess?.(result);
        message.success(`${(file as File).name} 上传成功`);
      } catch (err: any) {
        onError?.(err);
        message.error(`${(file as File).name} 上传失败`);
      } finally {
        setUploading(false);
      }
    },
    onChange: ({ fileList: newList }) => setFileList(newList),
  };

  // 状态派生
  const isSubmitted = !!mySubmission;
  const isGraded = isSubmitted && mySubmission?.grade != null;

  const getStatusTag = () => {
    if (isGraded) return <Tag color="green" icon={<CheckCircleOutlined />}>已批改</Tag>;
    if (isSubmitted) return <Tag color="blue" icon={<CheckCircleOutlined />}>已提交</Tag>;
    return <Tag color="orange" icon={<ClockCircleOutlined />}>待提交</Tag>;
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
        <Card><Text>作业不存在</Text></Card>
      </div>
    );
  }

  // 解析教师附件
  let teacherAttachments: string[] = [];
  try { teacherAttachments = JSON.parse(assignment.attachments || '[]'); } catch { /* ignore */ }

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/assignments')}>
          返回作业列表
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        {/* ── 左栏：主内容 ── */}
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>

              {/* 标题 & 状态 */}
              <div>
                <Space>
                  <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={2} style={{ margin: 0 }}>{assignment.title}</Title>
                </Space>
                <div style={{ marginTop: '12px' }}>
                  {submissionLoaded ? getStatusTag() : <Tag color="default">加载中...</Tag>}
                  <Text type="secondary" style={{ marginLeft: '12px' }}>
                    课程：{assignment.courseTitle || `课程 #${assignment.courseId}`}
                  </Text>
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* 作业要求 */}
              <div>
                <Title level={4}>作业要求</Title>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {assignment.content || '暂无作业说明'}
                </Paragraph>
              </div>

              {/* 截止日期 */}
              {assignment.deadline && (
                <Space>
                  <CalendarOutlined />
                  <Text strong>截止日期：</Text>
                  <Text>{new Date(assignment.deadline).toLocaleString('zh-CN')}</Text>
                </Space>
              )}

              {/* 教师上传的附件 */}
              {teacherAttachments.length > 0 && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div>
                    <Title level={4}>作业附件</Title>
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {teacherAttachments.map((href, idx) => (
                        <li key={idx}>
                          <a href={href} target="_blank" rel="noreferrer">
                            <PaperClipOutlined style={{ marginRight: 4 }} />附件 {idx + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* ── 批改结果 ── */}
              {isGraded && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div>
                    <Title level={4}>批改结果</Title>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <Text strong>成绩：</Text>
                        <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a', marginLeft: 12 }}>
                          {mySubmission?.grade}
                        </Text>
                        <Text style={{ fontSize: '16px', color: '#999' }}> / 100</Text>
                      </div>
                      {mySubmission?.feedback && (
                        <div>
                          <Text strong>教师评语：</Text>
                          <Paragraph style={{ marginTop: 8, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                            {mySubmission.feedback}
                          </Paragraph>
                        </div>
                      )}
                    </Space>
                  </div>
                </>
              )}

              {/* ── 已提交等待批改 ── */}
              {isSubmitted && !isGraded && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div>
                    <Title level={4}>我的提交</Title>
                    <Alert
                      type="info"
                      message="作业已提交，等待教师批改..."
                      showIcon
                      style={{ marginBottom: 12 }}
                    />
                    {mySubmission?.content && (
                      <Paragraph style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                        {mySubmission.content}
                      </Paragraph>
                    )}
                    {mySubmission?.submittedAt && (
                      <Text type="secondary">
                        提交时间：{new Date(mySubmission.submittedAt).toLocaleString('zh-CN')}
                      </Text>
                    )}
                  </div>
                </>
              )}

              {/* ── 提交表单（未提交时显示） ── */}
              {submissionLoaded && !isSubmitted && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div>
                    <Title level={4}>提交作业</Title>
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                      <Form.Item
                        label="作业内容"
                        name="content"
                        rules={[{ required: true, message: '请输入作业内容' }]}
                      >
                        <TextArea rows={8} placeholder="请输入您的作业答案..." showCount maxLength={5000} />
                      </Form.Item>

                      <Form.Item
                        label="附件上传（可选，最多5个文件）"
                        extra="支持文档、图片、压缩包、代码文件，单个文件不超过10MB"
                      >
                        <Upload {...uploadProps}>
                          <Button icon={<UploadOutlined />} loading={uploading}>
                            点击上传附件
                          </Button>
                        </Upload>
                      </Form.Item>

                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<CheckCircleOutlined />}
                          loading={submitting || uploading}
                          size="large"
                          disabled={uploading}
                        >
                          提交作业
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                </>
              )}

            </Space>
          </Card>
        </Col>

        {/* ── 右栏：状态卡片 ── */}
        <Col xs={24} lg={8}>
          <Card title="作业信息">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">课程名称</Text>
                <div><Text strong>{assignment.courseTitle || `课程 #${assignment.courseId}`}</Text></div>
              </div>

              {assignment.deadline && (
                <div>
                  <Text type="secondary">截止时间</Text>
                  <div><Text strong>{new Date(assignment.deadline).toLocaleString('zh-CN')}</Text></div>
                </div>
              )}

              <div>
                <Text type="secondary">提交状态</Text>
                <div>{submissionLoaded ? getStatusTag() : <Tag>加载中...</Tag>}</div>
              </div>

              {isSubmitted && mySubmission?.submittedAt && (
                <div>
                  <Text type="secondary">提交时间</Text>
                  <div><Text strong>{new Date(mySubmission.submittedAt).toLocaleString('zh-CN')}</Text></div>
                </div>
              )}

              {isGraded && (
                <div>
                  <Text type="secondary">成绩</Text>
                  <div>
                    <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                      {mySubmission?.grade} / 100
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

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Typography, Space, Form, Input, Select, DatePicker, message, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { FileTextOutlined, CalendarOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { uploadFile, deleteFile } from '../../../services/fileService';
import { courseService, type Course } from '../../../services/courseService';
import { assignmentService } from '../../../services/assignmentService';
import { useAppSelector } from '../../../store';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CreateAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const currentUser = useAppSelector((state: any) => state.auth.user);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await courseService.getCourses({ instructorId: currentUser?.userId });
      setCourses(res.courses || []);
    } catch {
      message.error('获取课程列表失败');
    } finally {
      setCoursesLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      // 从fileList中提取已上传的文件URL
      const attachmentURLs = fileList
        .filter(file => file.status === 'done' && file.response?.url)
        .map(file => file.response.url);

      // 将 dayjs 对象转为 ISO 8601 字符串
      const deadline = values.deadline ? (values.deadline as dayjs.Dayjs).toISOString() : undefined;

      const submitData = {
        courseId: values.courseId,
        title: values.title,
        content: values.content || undefined,
        deadline,
        attachments: attachmentURLs.length > 0 ? attachmentURLs : undefined,
      };

      await assignmentService.createAssignment(submitData);
      message.success('作业创建成功！');
      form.resetFields();
      setFileList([]);
      navigate('/teacher/assignments/list');
    } catch (error: any) {
      message.error(error.response?.data?.error || error.message || '创建作业失败');
    } finally {
      setSubmitting(false);
    }
  };

  const onFinishFailed = () => {
    message.error('请填写必填信息');
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList: fileList,
    maxCount: 5,
    beforeUpload: (file) => {
      const isAllowedType =
        /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|jpg|jpeg|png|gif|bmp|svg|zip|rar|7z|html|css|js|json|xml|go|py|java|c|cpp)$/i.test(file.name);

      if (!isAllowedType) {
        message.error(`${file.name} 不是支持的文件类型！`);
        return Upload.LIST_IGNORE;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name} 文件大小超过 10MB！`);
        return Upload.LIST_IGNORE;
      }

      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        setUploading(true);
        const result = await uploadFile(file as File);
        onSuccess?.(result);
        message.success(`${(file as File).name} 上传成功`);
      } catch (error: any) {
        onError?.(error);
        message.error(`${(file as File).name} 上传失败: ${error.message || '未知错误'}`);
      } finally {
        setUploading(false);
      }
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: async (file) => {
      if (file.status === 'done' && file.response?.url) {
        try {
          await deleteFile(file.response.url);
          message.success('文件删除成功');
        } catch {
          message.error('文件删除失败');
        }
      }
    },
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Button onClick={() => navigate('/teacher/assignments/list')} style={{ marginBottom: 16 }}>
          返回作业列表
        </Button>
        <Title level={2}>创建作业</Title>
        <Text type="secondary">为课程创建新的作业</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={18}>
          <Card title="作业信息">
            <Form
              form={form}
              name="create-assignment"
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="courseId"
                label="所属课程"
                rules={[{ required: true, message: '请选择所属课程!' }]}
              >
                <Select placeholder="请选择课程" loading={coursesLoading}>
                  {courses.map((course) => (
                    <Option key={course.id} value={course.id}>
                      {course.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="title"
                label="作业标题"
                rules={[{ required: true, message: '请输入作业标题!' }]}
              >
                <Input placeholder="请输入作业标题" />
              </Form.Item>

              <Form.Item
                name="content"
                label="作业要求"
              >
                <TextArea
                  rows={6}
                  placeholder="详细描述作业要求、目标、提交格式等信息"
                />
              </Form.Item>

              <Form.Item
                name="deadline"
                label="截止日期"
                rules={[
                  {
                    validator: (_, value) => {
                      if (value && dayjs(value).isBefore(dayjs())) {
                        return Promise.reject(new Error('截止日期不能早于当前时间'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder="选择截止日期（可选）"
                  disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
                />
              </Form.Item>

              <Form.Item
                label="作业附件（可选，最多5个文件）"
                extra="支持文档、图片、压缩包等格式，单个文件不超过10MB"
              >
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    点击上传附件
                  </Button>
                </Upload>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting || uploading}
                    disabled={uploading}
                  >
                    创建作业
                  </Button>
                  <Button onClick={() => navigate('/teacher/assignments/list')}>取消</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card title="说明">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <FileTextOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>作业标题</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  必填，清晰描述作业主题
                </Text>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <CalendarOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>截止日期</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  可选，超过截止日期后学生无法提交
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CreateAssignmentPage;

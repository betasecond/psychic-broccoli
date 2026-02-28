import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Typography, Space, Form, Input, Select, message,
} from 'antd';
import { DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { examService, type CreateExamRequest } from '../../../services/examService';
import { courseService, type Course } from '../../../services/courseService';
import { useAppSelector } from '../../../store';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const CreateExamPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state: any) => state.auth.user);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser?.userId) return;
    loadCourses();
  }, [currentUser?.userId]);

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await courseService.getCourses({ instructorId: currentUser.userId }) as any;
      setCourses(res?.courses || []);
    } catch {
      message.error('加载课程列表失败');
    } finally {
      setCoursesLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    const [startMoment, endMoment] = values.timeRange;
    const payload: CreateExamRequest = {
      courseId: values.courseId,
      title: values.title,
      startTime: startMoment.toISOString(),
      endTime: endMoment.toISOString(),
    };
    setSubmitting(true);
    try {
      await examService.createExam(payload);
      message.success('考试创建成功');
      navigate('/teacher/exams/list');
    } catch {
      message.error('创建考试失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>创建考试</Title>
        <Text type="secondary">为课程创建一场新考试</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card title="考试信息">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              autoComplete="off"
            >
              <Form.Item
                name="title"
                label="考试标题"
                rules={[{ required: true, message: '请输入考试标题' }]}
              >
                <Input placeholder="例如：期中考试" maxLength={100} showCount />
              </Form.Item>

              <Form.Item
                name="courseId"
                label="所属课程"
                rules={[{ required: true, message: '请选择课程' }]}
              >
                <Select
                  placeholder="请选择课程"
                  loading={coursesLoading}
                  showSearch
                  optionFilterProp="children"
                >
                  {courses.map((c) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.title}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="timeRange"
                label="考试时间段"
                rules={[{ required: true, message: '请选择考试开始和结束时间' }]}
              >
                <RangePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder={['开始时间', '结束时间']}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    创建考试
                  </Button>
                  <Button onClick={() => navigate('/teacher/exams/list')}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="说明">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                创建考试后，您可以在考试列表中为考试添加题目。
              </Text>
              <Text type="secondary">
                考试开始后，学生可以在「我的考试」页面参加考试。
              </Text>
              <Text type="secondary">
                考试结束后，系统会自动批改客观题并统计成绩。
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CreateExamPage;

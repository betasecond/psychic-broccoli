import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Form, Input, Select, Upload, message, Divider } from 'antd';
import { UploadOutlined, BookOutlined, UserOutlined, CalendarOutlined, TagsOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const CreateCoursePage: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('Received values:', values);
    message.success('课程创建成功！');
    form.resetFields();
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>创建课程</Title>
        <Text type="secondary">创建新的教学课程</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={18}>
          <Card title="课程信息">
            <Form
              form={form}
              name="create-course"
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="title"
                label="课程标题"
                rules={[{ required: true, message: '请输入课程标题!' }]}
              >
                <Input placeholder="请输入课程标题，如：React 深入浅出" />
              </Form.Item>

              <Form.Item
                name="subtitle"
                label="课程副标题"
              >
                <Input placeholder="简短描述课程内容" />
              </Form.Item>

              <Form.Item
                name="category"
                label="课程分类"
                rules={[{ required: true, message: '请选择课程分类!' }]}
              >
                <Select placeholder="请选择课程分类">
                  <Option value="前端开发">前端开发</Option>
                  <Option value="后端开发">后端开发</Option>
                  <Option value="编程语言">编程语言</Option>
                  <Option value="数据库">数据库</Option>
                  <Option value="设计">设计</Option>
                  <Option value="产品">产品</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="description"
                label="课程描述"
                rules={[{ required: true, message: '请输入课程描述!' }]}
              >
                <Input.TextArea 
                  rows={6} 
                  placeholder="详细描述课程内容、目标、适合人群等信息" 
                />
              </Form.Item>

              <Form.Item
                name="objectives"
                label="学习目标"
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="列出学生通过本课程能达到的学习目标" 
                />
              </Form.Item>

              <Form.Item
                name="requirements"
                label="先修要求"
              >
                <Input.TextArea 
                  rows={3} 
                  placeholder="列出学习本课程需要的先修知识或技能" 
                />
              </Form.Item>

              <Form.Item
                name="level"
                label="课程难度"
                rules={[{ required: true, message: '请选择课程难度!' }]}
              >
                <Select placeholder="请选择课程难度">
                  <Option value="初级">初级</Option>
                  <Option value="中级">中级</Option>
                  <Option value="高级">高级</Option>
                  <Option value="专家级">专家级</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="duration"
                label="预计学习时长(小时)"
              >
                <Input placeholder="输入课程预计需要的学习时长" />
              </Form.Item>

              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                  placeholder="输入课程相关标签"
                  dropdownRender={() => null}
                >
                </Select>
              </Form.Item>

              <Form.Item
                name="coverImage"
                label="课程封面"
              >
                <Upload>
                  <Button icon={<UploadOutlined />}>上传封面图片</Button>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    建议尺寸: 800x450 像素，支持 JPG、PNG 格式
                  </div>
                </Upload>
              </Form.Item>

              <Divider />

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    创建课程
                  </Button>
                  <Button>保存草稿</Button>
                  <Button>预览</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card title="课程设置">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <BookOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>课程信息</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  填写课程基本信息
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <FileTextOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>课程内容</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  添加章节和课时
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <UserOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>学生管理</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  管理课程学生
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <CalendarOutlined style={{ color: '#722ed1', marginRight: '8px' }} />
                  <Text strong>排课计划</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  安排直播时间
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CreateCoursePage;
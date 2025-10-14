import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Form, Input, Select, DatePicker, InputNumber, message } from 'antd';
import { FileTextOutlined, BookOutlined, CalendarOutlined, EditOutlined, TagsOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CreateAssignmentPage: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('Received values:', values);
    message.success('作业创建成功！');
    form.resetFields();
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>创建作业</Title>
        <Text type="secondary">创建新的课程作业</Text>
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
                name="title"
                label="作业标题"
                rules={[{ required: true, message: '请输入作业标题!' }]}
              >
                <Input placeholder="请输入作业标题，如：React 组件设计作业" />
              </Form.Item>

              <Form.Item
                name="course"
                label="所属课程"
                rules={[{ required: true, message: '请选择所属课程!' }]}
              >
                <Select placeholder="请选择课程">
                  <Option value="react">React 深入浅出</Option>
                  <Option value="typescript">TypeScript 实战</Option>
                  <Option value="frontend">前端开发基础</Option>
                  <Option value="javascript">JavaScript 高级编程</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="description"
                label="作业描述"
                rules={[{ required: true, message: '请输入作业描述!' }]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="详细描述作业要求、目标、提交格式等信息" 
                />
              </Form.Item>

              <Form.Item
                name="instructions"
                label="提交要求"
              >
                <TextArea 
                  rows={4} 
                  placeholder="描述作业提交的具体要求，如文件格式、命名规范等" 
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="dueDate"
                    label="截止日期"
                    rules={[{ required: true, message: '请选择截止日期!' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="totalScore"
                    label="总分"
                    rules={[{ required: true, message: '请输入总分!' }]}
                  >
                    <InputNumber min={1} max={100} placeholder="如：100" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="type"
                label="作业类型"
                rules={[{ required: true, message: '请选择作业类型!' }]}
              >
                <Select placeholder="请选择作业类型">
                  <Option value="编程作业">编程作业</Option>
                  <Option value="论文">论文</Option>
                  <Option value="实验">实验</Option>
                  <Option value="调研">调研</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="difficulty"
                label="难度等级"
                rules={[{ required: true, message: '请选择难度等级!' }]}
              >
                <Select placeholder="请选择难度等级">
                  <Option value="简单">简单</Option>
                  <Option value="中等">中等</Option>
                  <Option value="困难">困难</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                  placeholder="输入作业相关标签"
                  dropdownRender={() => null}
                >
                </Select>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    创建作业
                  </Button>
                  <Button>保存草稿</Button>
                  <Button>预览</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card title="作业设置">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <FileTextOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>作业信息</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  填写作业基本信息
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <CalendarOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>时间安排</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  设置截止日期等
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <EditOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>评分标准</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  定义评分细则
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <BookOutlined style={{ color: '#722ed1', marginRight: '8px' }} />
                  <Text strong>发布设置</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  选择发布对象
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
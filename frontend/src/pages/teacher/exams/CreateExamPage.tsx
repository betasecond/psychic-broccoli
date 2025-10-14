import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Form, Input, Select, DatePicker, InputNumber, message, Divider } from 'antd';
import { BarChartOutlined, BookOutlined, CalendarOutlined, EditOutlined, TagsOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CreateExamPage: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('Received values:', values);
    message.success('考试创建成功！');
    form.resetFields();
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>创建考试</Title>
        <Text type="secondary">创建新的课程考试</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={18}>
          <Card title="考试信息">
            <Form
              form={form}
              name="create-exam"
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="title"
                label="考试标题"
                rules={[{ required: true, message: '请输入考试标题!' }]}
              >
                <Input placeholder="请输入考试标题，如：React 基础测试" />
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
                label="考试说明"
                rules={[{ required: true, message: '请输入考试说明!' }]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="详细描述考试内容、形式、注意事项等信息" 
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="examDate"
                    label="考试日期"
                    rules={[{ required: true, message: '请选择考试日期!' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="duration"
                    label="考试时长(分钟)"
                    rules={[{ required: true, message: '请输入考试时长!' }]}
                  >
                    <InputNumber min={30} max={300} placeholder="如：90" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="totalScore"
                    label="总分"
                    rules={[{ required: true, message: '请输入总分!' }]}
                  >
                    <InputNumber min={1} max={100} placeholder="如：100" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="passScore"
                    label="及格分数"
                    rules={[{ required: true, message: '请输入及格分数!' }]}
                  >
                    <InputNumber min={1} max={100} placeholder="如：60" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="type"
                label="考试类型"
                rules={[{ required: true, message: '请选择考试类型!' }]}
              >
                <Select placeholder="请选择考试类型">
                  <Option value="期中考试">期中考试</Option>
                  <Option value="期末考试">期末考试</Option>
                  <Option value="单元测试">单元测试</Option>
                  <Option value="随堂测验">随堂测验</Option>
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
                name="instructions"
                label="考试须知"
              >
                <TextArea 
                  rows={4} 
                  placeholder="描述考试规则、注意事项、禁止行为等" 
                />
              </Form.Item>

              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                  placeholder="输入考试相关标签"
                  dropdownRender={() => null}
                >
                </Select>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    创建考试
                  </Button>
                  <Button>保存草稿</Button>
                  <Button>预览</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card title="考试设置">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <BarChartOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>考试信息</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  填写考试基本信息
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <CalendarOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>时间安排</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  设置考试日期和时长
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <EditOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>评分标准</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  定义总分和及格线
                </Text>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <ClockCircleOutlined style={{ color: '#722ed1', marginRight: '8px' }} />
                  <Text strong>考试规则</Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  设置考试规则
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CreateExamPage;
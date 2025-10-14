import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tabs, Calendar, Badge } from 'antd';
import { CalendarOutlined, BookOutlined, ClockCircleOutlined, UserOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { CalendarMode } from 'antd/es/calendar/generateCalendar';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const SchedulePage: React.FC = () => {
  // 模拟课程表数据
  const scheduleData = [
    {
      id: '1',
      course: 'React 深入浅出',
      date: '2024-03-18',
      time: '19:00 - 20:30',
      type: '直播课',
      location: '在线教室',
      status: '待上课',
    },
    {
      id: '2',
      course: '前端开发基础',
      date: '2024-03-19',
      time: '14:00 - 15:30',
      type: '录播课',
      location: '学习中心',
      status: '待学习',
    },
    {
      id: '3',
      course: 'TypeScript 实战',
      date: '2024-03-20',
      time: '16:00 - 17:00',
      type: '直播课',
      location: '在线教室',
      status: '待上课',
    },
    {
      id: '4',
      course: 'React 深入浅出',
      date: '2024-03-21',
      time: '19:00 - 20:30',
      type: '直播课',
      location: '在线教室',
      status: '待上课',
    },
  ];

  const assignments = [
    {
      id: '1',
      title: 'React 组件设计作业',
      course: 'React 深入浅出',
      dueDate: '2024-03-25',
      status: '待提交',
    },
    {
      id: '2',
      title: 'CSS 布局实战',
      course: '前端开发基础',
      dueDate: '2024-03-22',
      status: '待提交',
    },
  ];

  const events = [
    { id: 'event1', title: 'React 深入浅出', date: '2024-03-18', time: '19:00', type: 'class' },
    { id: 'event2', title: 'CSS 布局实战作业截止', date: '2024-03-22', time: '23:59', type: 'assignment' },
    { id: 'event3', title: 'TypeScript 概念测试', date: '2024-03-25', time: '09:00', type: 'exam' },
  ];

  const columns = [
    {
      title: '课程',
      dataIndex: 'course',
      key: 'course',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{date}</span>
        </Space>
      ),
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined />
          <span>{time}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <span>
          {type === '直播课' ? (
            <Badge status="processing" text={type} />
          ) : (
            <Badge status="default" text={type} />
          )}
        </span>
      ),
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '状态',
      key: 'status',
      render: (record: any) => (
        <span>
          {record.status === '待上课' ? (
            <Badge status="warning" text="待上课" />
          ) : (
            <Badge status="default" text="待学习" />
          )}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">查看详情</Button>
          <Button type="link">添加提醒</Button>
        </Space>
      ),
    },
  ];

  const assignmentColumns = [
    {
      title: '作业名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '课程',
      dataIndex: 'course',
      key: 'course',
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{date}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: () => (
        <Badge status="warning" text="待提交" />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="primary">去完成</Button>
          <Button type="link">查看详情</Button>
        </Space>
      ),
    },
  ];

  const onPanelChange = (value: any, mode: CalendarMode) => {
    console.log(value.format('YYYY-MM-DD'), mode);
  };

  const dateCellRender = (value: any) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayEvents = events.filter(event => event.date === dateStr);
    
    if (dayEvents.length === 0) {
      return null;
    }

    return (
      <div className="events">
        {dayEvents.map(event => (
          <div key={event.id} className="event" style={{ fontSize: '12px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {event.type === 'class' ? (
                <ClockCircleOutlined style={{ color: '#1890ff', marginRight: '4px' }} />
              ) : event.type === 'assignment' ? (
                <SyncOutlined style={{ color: '#fa8c16', marginRight: '4px' }} />
              ) : (
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
              )}
              <span>{event.title}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>课程表</Title>
        <Text type="secondary">您的学习计划和课程安排</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card>
            <Calendar
              dateCellRender={dateCellRender}
              onPanelChange={onPanelChange}
              fullscreen={false}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="今日安排">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <ClockCircleOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>今晚 19:00 - 20:30</Text>
                </div>
                <Text>React 深入浅出 - 直播课</Text>
                <div style={{ marginTop: '8px' }}>
                  <Button type="primary" block>进入教室</Button>
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <SyncOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>作业提醒</Text>
                </div>
                <Text>CSS 布局实战作业还有2天截止</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1" style={{ marginTop: '16px' }}>
        <TabPane tab="课程安排" key="1">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <Table 
                  dataSource={scheduleData} 
                  columns={columns} 
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`
                  }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="待完成作业" key="2">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <Table 
                  dataSource={assignments} 
                  columns={assignmentColumns} 
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 个作业`
                  }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="我的考试" key="3">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div style={{ padding: '16px', backgroundColor: '#f6ffed', borderRadius: '4px', border: '1px solid #b7eb8f' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      <Text strong>React 概念测试</Text>
                    </div>
                    <div>
                      <Space>
                        <CalendarOutlined /> 2024-03-25 09:00
                      </Space>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Button type="primary">查看考试安排</Button>
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SchedulePage;
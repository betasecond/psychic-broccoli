import React from 'react';
import { Card, Row, Col, Button, Typography, Space, List, Tabs, Badge, Avatar } from 'antd';
import { MessageOutlined, BellOutlined, MailOutlined, CommentOutlined, LikeOutlined, UserAddOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MessagesPage: React.FC = () => {
  // 模拟消息数据
  const messages = [
    {
      id: '1',
      title: '课程提醒：React 深入浅出 直播课即将开始',
      content: '您报名的 React 深入浅出 直播课将在 30 分钟后开始，请做好准备进入教室。',
      date: '2024-03-18 18:30',
      type: '提醒',
      status: 'unread',
      sender: '系统通知'
    },
    {
      id: '2',
      title: '新回复：关于 React Hooks 的讨论',
      content: '张老师在您提问的 "React Hooks 最佳实践" 话题下进行了回复，点击查看详细内容。',
      date: '2024-03-17 15:20',
      type: '互动',
      status: 'read',
      sender: '张老师'
    },
    {
      id: '3',
      title: '作业成绩公布：CSS 布局实战',
      content: '您提交的 "CSS 布局实战" 作业已批改完成，得分为 88 分，请查看详细评价。',
      date: '2024-03-16 10:15',
      type: '成绩',
      status: 'read',
      sender: '李老师'
    },
    {
      id: '4',
      title: '新课程上线：Vue 3 实战课程',
      content: '平台新上线了 Vue 3 实战课程，包含项目实战和源码分析，感兴趣的同学可以报名学习。',
      date: '2024-03-15 09:00',
      type: '通知',
      status: 'read',
      sender: '平台公告'
    },
  ];

  const notifications = [
    {
      id: 'n1',
      title: '课程进度提醒',
      content: '您已经 3 天没有学习 React 深入浅出 课程了，继续加油！',
      date: '2024-03-18 08:00',
      type: 'progress'
    },
    {
      id: 'n2',
      title: '考试报名提醒',
      content: 'TypeScript 概念测试报名即将截止，不要错过考试机会！',
      date: '2024-03-17 17:30',
      type: 'exam'
    },
    {
      id: 'n3',
      title: '新消息提醒',
      content: '张老师回复了您在课程讨论区的提问',
      date: '2024-03-17 15:20',
      type: 'message'
    },
  ];

  const discussions = [
    {
      id: 'd1',
      title: 'React Hooks 最佳实践',
      course: 'React 深入浅出',
      author: '王同学',
      replies: 12,
      lastReply: '2 小时前',
      status: 'active'
    },
    {
      id: 'd2',
      title: 'TypeScript 泛型理解',
      course: 'TypeScript 实战',
      author: '李同学',
      replies: 8,
      lastReply: '5 小时前',
      status: 'active'
    },
    {
      id: 'd3',
      title: 'CSS Grid 布局详解',
      course: '前端开发基础',
      author: '张同学',
      replies: 15,
      lastReply: '1 天前',
      status: 'hot'
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>消息通知</Title>
        <Text type="secondary">您收到的消息和系统通知</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <MessageOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
              <Title level={4}>总消息</Title>
              <Text strong>4</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <BellOutlined style={{ fontSize: '32px', color: '#fa8c16', marginBottom: '8px' }} />
              <Title level={4}>未读消息</Title>
              <Text strong type="warning">1</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CommentOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '8px' }} />
              <Title level={4}>课程讨论</Title>
              <Text strong>3</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: '32px', color: '#722ed1', marginBottom: '8px' }} />
              <Title level={4}>互动提醒</Title>
              <Text strong>3</Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <Tabs defaultActiveKey="1">
              <TabPane tab="全部消息" key="1">
                <List
                  itemLayout="vertical"
                  size="large"
                  pagination={{
                    pageSize: 5,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条消息`
                  }}
                  dataSource={messages}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      extra={
                        item.status === 'unread' ? (
                          <Badge dot>
                            <div style={{ width: 250, height: 200, backgroundColor: '#f0f2f5', borderRadius: '4px' }} />
                          </Badge>
                        ) : (
                          <div style={{ width: 250, height: 200, backgroundColor: '#f0f2f5', borderRadius: '4px' }} />
                        )
                      }
                      actions={[
                        <Button type="link" key={`reply-${item.id}`}>
                          <Space>
                            <MailOutlined />
                            回复
                          </Space>
                        </Button>,
                        <Button type="link" key={`mark-${item.id}`}>
                          <Space>
                            <CheckCircleOutlined />
                            {item.status === 'unread' ? '标记已读' : '标记未读'}
                          </Space>
                        </Button>,
                        <Button type="link" key={`delete-${item.id}`}>
                          <Space>
                            <ExclamationCircleOutlined />
                            删除
                          </Space>
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          item.type === '提醒' ? <BellOutlined style={{ fontSize: '24px', color: '#fa8c16' }} /> :
                          item.type === '互动' ? <CommentOutlined style={{ fontSize: '24px', color: '#52c41a' }} /> :
                          item.type === '成绩' ? <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} /> :
                          <MessageOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                        }
                        title={
                          <Space>
                            {item.title}
                            {item.status === 'unread' && (
                              <Badge status="processing" text="未读" />
                            )}
                          </Space>
                        }
                        description={
                          <Space>
                            <Text>{item.sender}</Text>
                            <Text type="secondary">{item.date}</Text>
                            <Badge 
                              color={
                                item.type === '提醒' ? '#fa8c16' :
                                item.type === '互动' ? '#52c41a' :
                                item.type === '成绩' ? '#52c41a' : '#1890ff'
                              } 
                              text={item.type} 
                            />
                          </Space>
                        }
                      />
                      {item.content}
                    </List.Item>
                  )}
                />
              </TabPane>
              <TabPane tab="系统通知" key="2">
                <List
                  itemLayout="horizontal"
                  dataSource={notifications}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button type="link" key={`action-${item.id}`}>查看详情</Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          item.type === 'progress' ? <CheckCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} /> :
                          item.type === 'exam' ? <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#fa8c16' }} /> :
                          <MessageOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                        }
                        title={item.title}
                        description={
                          <Space direction="vertical">
                            <Text>{item.content}</Text>
                            <Text type="secondary">{item.date}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </TabPane>
              <TabPane tab="课程讨论" key="3">
                <List
                  itemLayout="vertical"
                  dataSource={discussions}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      actions={[
                        <Button type="link" key={`view-${item.id}`}>
                          <Space>
                            <CommentOutlined />
                            参与讨论
                          </Space>
                        </Button>,
                        <Button type="link" key={`follow-${item.id}`}>
                          <Space>
                            <UserAddOutlined />
                            关注
                          </Space>
                        </Button>,
                      ]}
                      extra={
                        item.status === 'hot' ? (
                          <Badge.Ribbon text="热门" color="red">
                            <div style={{ width: 300, height: 180, backgroundColor: '#f0f2f5', borderRadius: '4px' }} />
                          </Badge.Ribbon>
                        ) : (
                          <div style={{ width: 300, height: 180, backgroundColor: '#f0f2f5', borderRadius: '4px' }} />
                        )
                      }
                    >
                      <List.Item.Meta
                        title={<a href="#">{item.title}</a>}
                        description={
                          <Space>
                            <Text>{item.course}</Text>
                            <Text>•</Text>
                            <Text>{item.author}</Text>
                            <Text>•</Text>
                            <Text type="secondary">{item.lastReply}</Text>
                          </Space>
                        }
                      />
                      <div>
                        <Space>
                          <Badge count={item.replies} overflowCount={99} />
                          <Text type="secondary">回复</Text>
                        </Space>
                      </div>
                    </List.Item>
                  )}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MessagesPage;
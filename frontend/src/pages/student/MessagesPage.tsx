import React, { useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Space, List, Tabs, Badge, Avatar, message as antdMessage } from 'antd';
import { MessageOutlined, BellOutlined, MailOutlined, CommentOutlined, LikeOutlined, UserAddOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../store';
import { useNavigate } from 'react-router-dom'
import {
  fetchMessagesAsync,
  markMessageStatusAsync,
  deleteMessageAsync,
  fetchNotificationsAsync,
  fetchDiscussionsAsync,
} from '../../store/slices/messageSlice';
import {
  selectMessages,
  selectNotifications,
  selectDiscussions,
  selectMessagesLoading,
  selectMessagesError,
} from '../../store';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MessagesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate()
  const messages = useAppSelector(selectMessages);
  const notifications = useAppSelector(selectNotifications);
  const discussions = useAppSelector(selectDiscussions);
  const loading = useAppSelector(selectMessagesLoading);
  const error = useAppSelector(selectMessagesError);

  // 组件挂载时获取数据
  useEffect(() => {
    dispatch(fetchMessagesAsync());
    dispatch(fetchNotificationsAsync());
    dispatch(fetchDiscussionsAsync());
  }, [dispatch]);

  // 标记已读/未读
  const handleMarkAsRead = (id: number, status: 'read' | 'unread') => {
    dispatch(markMessageStatusAsync({ messageId: id, status: status === 'read' ? 'unread' : 'read' }))
      .unwrap()
      .then(() => {
        antdMessage.success('消息状态更新成功');
      })
      .catch((err) => {
        antdMessage.error(err || '消息状态更新失败');
      });
  };

  // 删除消息
  const handleDeleteMessage = (id: number) => {
    dispatch(deleteMessageAsync(id))
      .unwrap()
      .then(() => {
        antdMessage.success('消息删除成功');
      })
      .catch((err) => {
        antdMessage.error(err || '消息删除失败');
      });
  };

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
              <Text strong>{messages?.length || 0}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <BellOutlined style={{ fontSize: '32px', color: '#fa8c16', marginBottom: '8px' }} />
              <Title level={4}>未读消息</Title>
              <Text strong type="warning">{messages?.filter(msg => msg.status === 'unread').length || 0}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CommentOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '8px' }} />
              <Title level={4}>课程讨论</Title>
              <Text strong>{discussions?.length || 0}</Text>
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
                  loading={loading}
                  dataSource={messages || []}
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
                        <Button type="link" key={`mark-${item.id}`} onClick={() => handleMarkAsRead(item.id, item.status)}>
                          <Space>
                            <CheckCircleOutlined />
                            {item.status === 'unread' ? '标记已读' : '标记未读'}
                          </Space>
                        </Button>,
                        <Button type="link" key={`delete-${item.id}`} onClick={() => handleDeleteMessage(item.id)}>
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
                            {item.title || '消息'}
                            {item.status === 'unread' && (
                              <Badge status="processing" text="未读" />
                            )}
                          </Space>
                        }
                        description={
                          <Space>
                            <Text>{item.sender || '系统'}</Text>
                            <Text type="secondary">{item.date || ''}</Text>
                            <Badge
                              color={
                                item.type === '提醒' ? '#fa8c16' :
                                item.type === '互动' ? '#52c41a' :
                                item.type === '成绩' ? '#52c41a' : '#1890ff'
                              }
                              text={item.type || '消息'}
                            />
                          </Space>
                        }
                      />
                      {item.content || ''}
                    </List.Item>
                  )}
                />
              </TabPane>
              <TabPane tab="系统通知" key="2">
                <List
                  itemLayout="horizontal"
                  loading={loading}
                  dataSource={notifications || []}
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
                        title={item.title || '通知'}
                        description={
                          <Space direction="vertical">
                            <Text>{item.content || ''}</Text>
                            <Text type="secondary">{item.date || ''}</Text>
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
                  loading={loading}
                  dataSource={discussions || []}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      actions={[
                        <Button type="link" key={`view-${item.id}`} onClick={() => navigate(`/student/discussions/${item.id}`)}>
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
                            <Text>{item.course?.title || '未知课程'}</Text>
                            <Text>•</Text>
                            <Text>{item.author?.username || '匿名'}</Text>
                            <Text>•</Text>
                            <Text type="secondary">{item.lastReply || '暂无回复'}</Text>
                          </Space>
                        }
                      />
                      <div>
                        <Space>
                          <Badge count={item.replies || 0} overflowCount={99} />
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
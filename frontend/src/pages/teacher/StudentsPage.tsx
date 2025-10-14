import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Avatar, Statistic } from 'antd';
import { UserOutlined, TeamOutlined, SearchOutlined, DownloadOutlined, EditOutlined, MailOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const StudentsPage: React.FC = () => {
  // 模拟学生数据
  const students = [
    {
      id: '1',
      name: '张三',
      username: 'zhangsan',
      email: 'zhangsan@example.com',
      course: 'React 深入浅出',
      progress: 75,
      status: '活跃',
      lastLogin: '2024-03-18',
      role: 'STUDENT'
    },
    {
      id: '2',
      name: '李四',
      username: 'lisi',
      email: 'lisi@example.com',
      course: 'TypeScript 实战',
      progress: 45,
      status: '一般',
      lastLogin: '2024-03-17',
      role: 'STUDENT'
    },
    {
      id: '3',
      name: '王五',
      username: 'wangwu',
      email: 'wangwu@example.com',
      course: '前端开发基础',
      progress: 100,
      status: '优秀',
      lastLogin: '2024-03-18',
      role: 'STUDENT'
    },
    {
      id: '4',
      name: '赵六',
      username: 'zhaoliu',
      email: 'zhaoliu@example.com',
      course: 'React 深入浅出',
      progress: 20,
      status: '不活跃',
      lastLogin: '2024-03-10',
      role: 'STUDENT'
    },
    {
      id: '5',
      name: '钱七',
      username: 'qianqi',
      email: 'qianqi@example.com',
      course: '前端开发基础',
      progress: 85,
      status: '活跃',
      lastLogin: '2024-03-17',
      role: 'STUDENT'
    },
  ];

  const columns = [
    {
      title: '学生',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div><Text strong>{name}</Text></div>
            <div style={{ fontSize: '12px', color: '#666' }}>@{record.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '课程',
      dataIndex: 'course',
      key: 'course',
    },
    {
      title: '进度',
      key: 'progress',
      render: (record: any) => (
        <div>
          <div>{record.progress}%</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${record.progress}%`, 
                height: '8px', 
                backgroundColor: record.progress === 100 ? '#52c41a' : record.progress > 50 ? '#1890ff' : '#fa8c16',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        switch(status) {
          case '优秀':
            color = 'green';
            break;
          case '活跃':
            color = 'blue';
            break;
          case '一般':
            color = 'orange';
            break;
          case '不活跃':
            color = 'red';
            break;
          default:
            color = 'default';
        }
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link" icon={<MailOutlined />}>发送消息</Button>
          <Button type="link" icon={<EditOutlined />}>查看进度</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>学生管理</Title>
        <Text type="secondary">您课程中的学生信息和学习情况</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总学生数"
              value={156}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃学生"
              value={112}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均进度"
              value={78}
              suffix="%"
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="课程数"
              value={3}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button icon={<SearchOutlined />}>搜索学生</Button>
                <Button icon={<DownloadOutlined />}>导出数据</Button>
              </Space>
              <Space>
                <Button>按课程筛选</Button>
                <Button>按状态筛选</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={students} 
              columns={columns} 
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 名学生`
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card title="学习情况概览">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>优秀学生</Text>
                  <Text strong type="success">42</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '27%', 
                      height: '8px', 
                      backgroundColor: '#52c41a',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>活跃学生</Text>
                  <Text strong type="primary">70</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '45%', 
                      height: '8px', 
                      backgroundColor: '#1890ff',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>一般学生</Text>
                  <Text strong type="warning">32</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '20%', 
                      height: '8px', 
                      backgroundColor: '#fa8c16',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>不活跃学生</Text>
                  <Text strong type="danger">12</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '8%', 
                      height: '8px', 
                      backgroundColor: '#ff4d4f',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="课程分布">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>React 深入浅出</Text>
                  <Text strong>56 人</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '36%', 
                      height: '8px', 
                      backgroundColor: '#1890ff',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>TypeScript 实战</Text>
                  <Text strong>45 人</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '29%', 
                      height: '8px', 
                      backgroundColor: '#52c41a',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>前端开发基础</Text>
                  <Text strong>55 人</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '35%', 
                      height: '8px', 
                      backgroundColor: '#fa8c16',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card title="学生状态">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#52c41a', marginRight: '8px' }}></div>
                  <Text strong>活跃学生提醒</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>有 12 名学生最近 7 天未登录，建议发送提醒消息。</Text>
                </div>
                <Button type="link" style={{ marginTop: '8px', padding: 0 }}>发送提醒</Button>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#fff2e8', border: '1px solid #ffccc7', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#fa8c16', marginRight: '8px' }}></div>
                  <Text strong>作业未交提醒</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>有 8 名学生未按时提交最近的作业。</Text>
                </div>
                <Button type="link" style={{ marginTop: '8px', padding: 0 }}>查看详情</Button>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#722ed1', marginRight: '8px' }}></div>
                  <Text strong>优秀学生表扬</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>本周有 5 名学生表现特别优秀，值得表扬。</Text>
                </div>
                <Button type="link" style={{ marginTop: '8px', padding: 0 }}>查看名单</Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentsPage;
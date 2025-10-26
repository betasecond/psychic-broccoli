import React, { useState } from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tabs, Tag, Statistic, Avatar, Modal, Upload, message } from 'antd';
import { UserOutlined, TeamOutlined, SearchOutlined, DownloadOutlined, EditOutlined, MailOutlined, CrownOutlined, BookOutlined, CalendarOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { userService } from '../../services/userService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Dragger } = Upload;

const UsersPage: React.FC = () => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      await userService.triggerDownloadTemplate();
      message.success('模板下载成功！');
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  // 批量导入用户
  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择Excel文件');
      return;
    }

    setUploading(true);
    try {
      const file = (fileList[0] && (fileList[0].originFileObj || fileList[0])) as File | undefined;
      if (!file) {
        message.error('未获取到文件，请重新选择');
        setUploading(false);
        return;
      }
      const result = await userService.importUsersFromExcel(file);
      
      Modal.success({
        title: '导入完成',
        content: (
          <div>
            <p>成功导入：{result.successCount} 个用户</p>
            {result.errorCount > 0 && (
              <>
                <p style={{ color: '#ff4d4f' }}>失败：{result.errorCount} 个用户</p>
                {result.errors && result.errors.length > 0 && (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '12px' }}>
                    <Text type="secondary">错误详情：</Text>
                    <ul>
                      {result.errors.map((err, idx) => (
                        <li key={idx} style={{ color: '#ff4d4f' }}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        ),
      });
      
      setImportModalVisible(false);
      setFileList([]);
      // 这里可以刷新用户列表
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx',
    fileList,
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                      file.name.endsWith('.xlsx');
      
      if (!isExcel) {
        message.error('只能上传Excel文件！');
        return false;
      }
      
      setFileList([{
        uid: file.uid,
        name: file.name,
        status: 'done',
        originFileObj: file as any,
      }]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  // 模拟用户数据
  const students = [
    {
      id: 's1',
      name: '张三',
      username: 'zhangsan',
      email: 'zhangsan@example.com',
      course: 'React 深入浅出',
      status: '活跃',
      role: 'STUDENT',
      lastLogin: '2024-03-18',
      regDate: '2024-01-15'
    },
    {
      id: 's2',
      name: '李四',
      username: 'lisi',
      email: 'lisi@example.com',
      course: 'TypeScript 实战',
      status: '一般',
      role: 'STUDENT',
      lastLogin: '2024-03-17',
      regDate: '2024-01-20'
    },
    {
      id: 's3',
      name: '王五',
      username: 'wangwu',
      email: 'wangwu@example.com',
      course: '前端开发基础',
      status: '优秀',
      role: 'STUDENT',
      lastLogin: '2024-03-18',
      regDate: '2024-02-01'
    },
  ];

  const instructors = [
    {
      id: 'i1',
      name: '张老师',
      username: 'zhanglaoshi',
      email: 'zhang@example.com',
      courses: 3,
      status: '活跃',
      role: 'INSTRUCTOR',
      lastLogin: '2024-03-18',
      regDate: '2024-01-10'
    },
    {
      id: 'i2',
      name: '李老师',
      username: 'lilaoshi',
      email: 'li@example.com',
      courses: 2,
      status: '活跃',
      role: 'INSTRUCTOR',
      lastLogin: '2024-03-17',
      regDate: '2024-01-12'
    },
  ];

  const admins = [
    {
      id: 'a1',
      name: '系统管理员',
      username: 'admin',
      email: 'admin@example.com',
      status: '活跃',
      role: 'ADMIN',
      lastLogin: '2024-03-18',
      regDate: '2024-01-01'
    },
  ];

  const studentColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />
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
      title: '注册日期',
      dataIndex: 'regDate',
      key: 'regDate',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{date}</span>
        </Space>
      ),
    },
    {
      title: '当前课程',
      dataIndex: 'course',
      key: 'course',
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
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  const instructorColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <Avatar size="small" icon={<BookOutlined />} style={{ backgroundColor: '#1890ff' }} />
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
      title: '课程数',
      dataIndex: 'courses',
      key: 'courses',
      render: (courses: number) => (
        <Space>
          <BookOutlined />
          <span>{courses}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        switch(status) {
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
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  const adminColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <Avatar size="small" icon={<CrownOutlined />} style={{ backgroundColor: '#fa8c16' }} />
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
      title: '注册日期',
      dataIndex: 'regDate',
      key: 'regDate',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{date}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        switch(status) {
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
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>用户管理</Title>
        <Text type="secondary">平台所有用户信息管理</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={457}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="学生数"
              value={389}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="教师数"
              value={65}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="管理员数"
              value={3}
              prefix={<CrownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary">新增用户</Button>
                <Button 
                  icon={<UploadOutlined />} 
                  onClick={() => setImportModalVisible(true)}
                >
                  批量导入
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                >
                  下载模板
                </Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索用户</Button>
                <Button>按角色筛选</Button>
              </Space>
            </div>
            
            <Tabs defaultActiveKey="students">
              <TabPane tab="学生管理" key="students">
                <Table 
                  dataSource={students} 
                  columns={studentColumns} 
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 名学生`
                  }}
                />
              </TabPane>
              <TabPane tab="教师管理" key="instructors">
                <Table 
                  dataSource={instructors} 
                  columns={instructorColumns} 
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 名教师`
                  }}
                />
              </TabPane>
              <TabPane tab="管理员管理" key="admins">
                <Table 
                  dataSource={admins} 
                  columns={adminColumns} 
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 名管理员`
                  }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card title="用户活跃度">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>活跃用户</Text>
                  <Text strong type="success">342</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '75%', 
                      height: '8px', 
                      backgroundColor: '#52c41a',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>一般用户</Text>
                  <Text strong type="warning">89</Text>
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
                  <Text>不活跃用户</Text>
                  <Text strong type="danger">26</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '5%', 
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
          <Card title="用户分布">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>学生用户</Text>
                  <Text strong>389 (85%)</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '85%', 
                      height: '8px', 
                      backgroundColor: '#1890ff',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>教师用户</Text>
                  <Text strong>65 (14%)</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '14%', 
                      height: '8px', 
                      backgroundColor: '#52c41a',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>管理员用户</Text>
                  <Text strong>3 (1%)</Text>
                </div>
                <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: '1%', 
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
          <Card title="系统概览">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UserOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>新用户注册提醒</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>昨日新增用户 12 人</Text>
                </div>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TeamOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>活跃用户提醒</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>今日活跃用户 245 人</Text>
                </div>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <Text strong>本月统计</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>本月新增用户 156 人</Text>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 批量导入Modal */}
      <Modal
        title="批量导入用户"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => {
          setImportModalVisible(false);
          setFileList([]);
        }}
        okText="开始导入"
        cancelText="取消"
        confirmLoading={uploading}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Paragraph>
              请先下载模板，按照模板格式填写用户信息后再上传。
            </Paragraph>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleDownloadTemplate}
              type="dashed"
              block
            >
              下载Excel模板
            </Button>
          </div>

          <div>
            <Paragraph strong>上传Excel文件：</Paragraph>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">仅支持 .xlsx 格式的 Excel 文件</p>
            </Dragger>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
            <Text strong>导入说明：</Text>
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li>必填字段：用户名、角色；密码留空将使用默认密码 jimei123</li>
              <li>角色可选值：STUDENT（学生）、INSTRUCTOR（教师）、ADMIN（管理员）</li>
              <li>可选字段：邮箱、头像URL</li>
              <li>用户名不能重复</li>
              <li>请严格按照模板格式填写</li>
            </ul>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default UsersPage;
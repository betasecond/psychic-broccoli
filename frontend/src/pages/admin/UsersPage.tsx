import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tabs, Tag, Statistic, Avatar, Modal, Upload, message, Input } from 'antd';
import { UserOutlined, TeamOutlined, SearchOutlined, DownloadOutlined, EditOutlined, MailOutlined, CrownOutlined, BookOutlined, CalendarOutlined, UploadOutlined, InboxOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { userService, type User } from '../../services/userService';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Dragger } = Upload;

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('students');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filteredStudents, setFilteredStudents] = useState<User[] | null>(null);
  const [filteredInstructors, setFilteredInstructors] = useState<User[] | null>(null);
  const [filteredAdmins, setFilteredAdmins] = useState<User[] | null>(null);
  const [searching, setSearching] = useState(false);

  // 查看用户资料
  const handleViewProfile = (userId: number) => {
    navigate(`/profile/${userId}`);
  };

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 获取所有用户
      const allUsersResponse = await userService.getUsers({ page: 1, pageSize: 1000 });
      const allUsers = allUsersResponse.users;

      // 按角色分类
      setStudents(allUsers.filter(user => user.role === 'STUDENT'));
      setInstructors(allUsers.filter(user => user.role === 'INSTRUCTOR'));
      setAdmins(allUsers.filter(user => user.role === 'ADMIN'));
    } catch (error) {
      message.error('获取用户列表失败');
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取用户列表
  useEffect(() => {
    fetchUsers();
  }, []);

  // 切换标签时刷新数据
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // 切换标签时清除搜索过滤
    setFilteredStudents(null);
    setFilteredInstructors(null);
    setFilteredAdmins(null);
    setSearchKeyword('');
    fetchUsers();
  };

  // 执行搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setSearching(true);
    try {
      // 根据当前标签页确定角色
      let role: string | undefined;
      if (activeTab === 'students') {
        role = 'STUDENT';
      } else if (activeTab === 'instructors') {
        role = 'INSTRUCTOR';
      } else if (activeTab === 'admins') {
        role = 'ADMIN';
      }

      // 调用搜索API
      const response = await userService.getUsers({ 
        page: 1, 
        pageSize: 1000, 
        role,
        search: searchKeyword.trim()
      });

      // 根据当前标签页更新过滤后的列表
      if (activeTab === 'students') {
        setFilteredStudents(response.users);
      } else if (activeTab === 'instructors') {
        setFilteredInstructors(response.users);
      } else if (activeTab === 'admins') {
        setFilteredAdmins(response.users);
      }

      message.success(`找到 ${response.users.length} 个匹配的用户`);
      setSearchModalVisible(false);
    } catch (error) {
      message.error('搜索失败');
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchKeyword('');
    setFilteredStudents(null);
    setFilteredInstructors(null);
    setFilteredAdmins(null);
    setSearchModalVisible(false);
    message.info('已清除搜索条件');
  };

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

  const studentColumns = [
    {
      title: '姓名',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, record: User) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />
          <div>
            <div><Text strong>{fullName || record.username}</Text></div>
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
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{new Date(date).toLocaleDateString()}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: any) => {
        const status = active ? '活跃' : '不活跃';
        let color = active ? 'blue' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => (
        <span>{new Date(date).toLocaleString()}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record: User) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewProfile(record.userId)}>查看</Button>
          <Button type="link" size="small" icon={<MailOutlined />}>消息</Button>
          <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  const instructorColumns = [
    {
      title: '姓名',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, record: User) => (
        <Space>
          <Avatar size="small" icon={<BookOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <div><Text strong>{fullName || record.username}</Text></div>
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
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: any) => {
        const status = active ? '活跃' : '不活跃';
        let color = active ? 'blue' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => (
        <span>{new Date(date).toLocaleString()}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record: User) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewProfile(record.userId)}>查看</Button>
          <Button type="link" size="small" icon={<MailOutlined />}>消息</Button>
          <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  const adminColumns = [
    {
      title: '姓名',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, record: User) => (
        <Space>
          <Avatar size="small" icon={<CrownOutlined />} style={{ backgroundColor: '#fa8c16' }} />
          <div>
            <div><Text strong>{fullName || record.username}</Text></div>
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
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <span>{new Date(date).toLocaleDateString()}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: any) => {
        const status = active ? '活跃' : '不活跃';
        let color = active ? 'blue' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => (
        <span>{new Date(date).toLocaleString()}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record: User) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewProfile(record.userId)}>查看</Button>
          <Button type="link" size="small" icon={<MailOutlined />}>消息</Button>
          <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
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
          <Card loading={loading}>
            <Statistic
              title="总用户数"
              value={students.length + instructors.length + admins.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="学生数"
              value={students.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="教师数"
              value={instructors.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="管理员数"
              value={admins.length}
              prefix={<CrownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Space wrap>
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
              <Space wrap>
                <Button 
                  icon={<SearchOutlined />}
                  onClick={() => setSearchModalVisible(true)}
                >
                  搜索用户
                </Button>
                <Button>按角色筛选</Button>
              </Space>
            </div>
            
            <Tabs 
              defaultActiveKey="students" 
              activeKey={activeTab}
              onChange={handleTabChange}
            >
              <TabPane tab="学生管理" key="students">
                <Table 
                  dataSource={filteredStudents !== null ? filteredStudents : students} 
                  columns={studentColumns} 
                  rowKey="userId"
                  loading={loading || searching}
                  scroll={{ x: 1200 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 名学生${filteredStudents !== null ? '（已筛选）' : ''}`
                  }}
                />
              </TabPane>
              <TabPane tab="教师管理" key="instructors">
                <Table 
                  dataSource={filteredInstructors !== null ? filteredInstructors : instructors} 
                  columns={instructorColumns} 
                  rowKey="userId"
                  loading={loading || searching}
                  scroll={{ x: 1000 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 名教师${filteredInstructors !== null ? '（已筛选）' : ''}`
                  }}
                />
              </TabPane>
              <TabPane tab="管理员管理" key="admins">
                <Table 
                  dataSource={filteredAdmins !== null ? filteredAdmins : admins} 
                  columns={adminColumns} 
                  rowKey="userId"
                  loading={loading || searching}
                  scroll={{ x: 1200 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 名管理员${filteredAdmins !== null ? '（已筛选）' : ''}`
                  }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} md={12}>
          <Card title="用户角色分布" loading={loading}>
            {(() => {
              const total = students.length + instructors.length + admins.length || 1;
              const studentPct = Math.round((students.length / total) * 100);
              const instructorPct = Math.round((instructors.length / total) * 100);
              const adminPct = Math.round((admins.length / total) * 100);
              return (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text>学生</Text>
                      <Text strong>{students.length} 人（{studentPct}%）</Text>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${studentPct}%`, height: '8px', backgroundColor: '#1890ff', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text>教师</Text>
                      <Text strong>{instructors.length} 人（{instructorPct}%）</Text>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${instructorPct}%`, height: '8px', backgroundColor: '#52c41a', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text>管理员</Text>
                      <Text strong>{admins.length} 人（{adminPct}%）</Text>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(adminPct, 1)}%`, height: '8px', backgroundColor: '#fa8c16', borderRadius: '4px' }} />
                    </div>
                  </div>
                </Space>
              );
            })()}
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12}>
          <Card title="用户数据概览" loading={loading}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UserOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                  <Text strong>平台总用户</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>共 {students.length + instructors.length + admins.length} 名注册用户</Text>
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TeamOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>学生与教师比</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text>
                    {instructors.length > 0
                      ? `每位教师平均对应 ${Math.round(students.length / instructors.length)} 名学生`
                      : '暂无教师数据'}
                  </Text>
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

      {/* 搜索用户Modal */}
      <Modal
        title="搜索用户"
        open={searchModalVisible}
        onOk={handleSearch}
        onCancel={() => {
          setSearchModalVisible(false);
          setSearchKeyword('');
        }}
        okText="搜索"
        cancelText="取消"
        confirmLoading={searching}
        footer={[
          <Button key="clear" onClick={handleClearSearch}>
            清除搜索
          </Button>,
          <Button key="cancel" onClick={() => {
            setSearchModalVisible(false);
            setSearchKeyword('');
          }}>
            取消
          </Button>,
          <Button key="search" type="primary" loading={searching} onClick={handleSearch}>
            搜索
          </Button>,
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>搜索关键词：</Text>
            <Input
              placeholder="请输入用户名、邮箱或姓名"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ marginTop: '8px' }}
              allowClear
            />
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
            <Text type="secondary">
              当前搜索范围：{activeTab === 'students' ? '学生' : activeTab === 'instructors' ? '教师' : '管理员'}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              搜索将在当前标签页的用户中进行，支持按用户名、邮箱或姓名模糊匹配
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default UsersPage;
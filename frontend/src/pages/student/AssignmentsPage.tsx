import React, { useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Progress, Spin, message } from 'antd';
import { FileTextOutlined, CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, selectMyAssignments, selectAssignmentLoading, selectAssignmentError } from '../../store';
import { fetchMyAssignments } from '../../store/slices/assignmentSlice';

const { Title, Text } = Typography;

const AssignmentsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const assignments = useAppSelector(selectMyAssignments);
  const loading = useAppSelector(selectAssignmentLoading);
  const error = useAppSelector(selectAssignmentError);

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  // 计算统计数据
  const stats = React.useMemo(() => {
    const pending = assignments.filter(a => !a.submitted);
    const submitted = assignments.filter(a => a.submitted && !a.graded);
    const graded = assignments.filter(a => a.graded);
    
    return {
      pending: pending.length,
      submitted: submitted.length,
      graded: graded.length,
      total: assignments.length,
    };
  }, [assignments]);

  const columns = [
    {
      title: '作业名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '课程',
      dataIndex: 'courseTitle',
      key: 'courseTitle',
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (date: string) => (
        date ? (
          <Space>
            <CalendarOutlined />
            <span>{new Date(date).toLocaleDateString('zh-CN')}</span>
          </Space>
        ) : <Text type="secondary">无</Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (record: any) => {
        let color = 'default';
        let icon = null;
        let statusText = '待提交';
        
        if (record.graded) {
          color = 'green';
          icon = <CheckCircleOutlined />;
          statusText = '已批改';
        } else if (record.submitted) {
          color = 'blue';
          icon = <CheckCircleOutlined />;
          statusText = '已提交';
        } else {
          color = 'orange';
          icon = <ClockCircleOutlined />;
          statusText = '待提交';
        }
        
        return (
          <Space>
            {icon}
            <Tag color={color}>{statusText}</Tag>
          </Space>
        );
      },
    },
    {
      title: '成绩',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade: number | undefined) => (
        <div>
          {grade !== undefined && grade !== null ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{grade}</span>
              <span style={{ marginLeft: '4px' }}>/100</span>
            </div>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space size="middle">
          {!record.submitted ? (
            <Button type="primary" onClick={() => navigate(`/student/assignments/${record.id}`)}>提交作业</Button>
          ) : (
            <Button type="link" onClick={() => navigate(`/student/assignments/${record.id}`)}>查看详情</Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading && assignments.length === 0) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>作业任务</Title>
        <Text type="secondary">您需要完成的作业和练习</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <FileTextOutlined style={{ fontSize: '18px' }} />
                <Text strong>共 {stats.total} 个作业</Text>
              </Space>
            </div>
            
            <Table 
              dataSource={assignments} 
              columns={columns} 
              rowKey="id"
              loading={loading}
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

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="作业状态概览">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>待提交作业</Text>
                  <Text strong type="warning">{stats.pending} 个</Text>
                </div>
                <Progress 
                  percent={stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0} 
                  strokeColor="#fa8c16" 
                />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>已提交作业</Text>
                  <Text strong type="secondary">{stats.submitted} 个</Text>
                </div>
                <Progress 
                  percent={stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0} 
                  strokeColor="#1890ff" 
                />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>已批改作业</Text>
                  <Text strong type="success">{stats.graded} 个</Text>
                </div>
                <Progress 
                  percent={stats.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0} 
                  strokeColor="#52c41a" 
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AssignmentsPage;
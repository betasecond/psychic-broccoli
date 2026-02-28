import React, { useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Space, Table, Tag, Spin, message } from 'antd';
import { BookOutlined, StarOutlined, CalendarOutlined, PlayCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, selectMyCourses, selectCourseLoading, selectCourseError } from '../../store';
import { fetchMyCourses } from '../../store/slices/courseSlice';

const { Title, Text } = Typography;

const CoursesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const courses = useAppSelector(selectMyCourses);
  const loading = useAppSelector(selectCourseLoading);
  const error = useAppSelector(selectCourseError);

  useEffect(() => {
    dispatch(fetchMyCourses());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '授课教师',
      dataIndex: 'instructorName',
      key: 'instructorName',
    },
    {
      title: '类别',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (category: string) => (
        category ? <Tag color="blue">{category}</Tag> : <Text type="secondary">-</Text>
      ),
    },
    {
      title: '进度',
      key: 'progress',
      render: (record: any) => (
        <div>
          <div>{record.progress || 0}%</div>
          <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${record.progress || 0}%`, 
                height: '8px', 
                backgroundColor: (record.progress || 0) === 100 ? '#52c41a' : '#1890ff',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (record: any) => {
        const progress = record.progress || 0;
        return (
          <Tag color={progress === 100 ? 'green' : 'orange'}>
            {progress === 100 ? '已完成' : '进行中'}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => (
        <Space size="middle">
          <Button type="link" onClick={() => navigate(`/student/courses/${record.id}`)}>
            查看
          </Button>
          <Button type="link" onClick={() => navigate(`/student/courses/${record.id}`)}>
            继续学习
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && courses.length === 0) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>我的课程</Title>
        <Text type="secondary">您正在学习和已完成的课程</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button type="primary" onClick={() => navigate('/student/courses/browse')}>
                  报名新课程
                </Button>
              </Space>
              <Space>
                <Button icon={<SearchOutlined />}>搜索</Button>
              </Space>
            </div>
            
            <Table 
              dataSource={courses} 
              columns={columns} 
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 门课程`
              }}
            />
          </Card>
        </Col>
      </Row>

      {courses.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          {courses.slice(0, 3).map((course, index) => {
            const colors = ['#e6f7ff', '#fff7e6', '#f6ffed'];
            const iconColors = ['#1890ff', '#fa8c16', '#52c41a'];
            const icons = [BookOutlined, PlayCircleOutlined, CalendarOutlined];
            const Icon = icons[index % 3];
            
            return (
              <Col xs={24} sm={12} md={8} key={course.id}>
                <Card 
                  hoverable
                  cover={
                    <div style={{ 
                      height: '120px', 
                      backgroundColor: colors[index % 3], 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Icon style={{ fontSize: '48px', color: iconColors[index % 3] }} />
                    </div>
                  }
                  onClick={() => navigate(`/student/courses/${course.id}`)}
                >
                  <Card.Meta
                    title={course.title}
                    description={course.description || '暂无描述'}
                  />
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <StarOutlined style={{ color: '#faad14' }} /> {course.instructorName}
                    </div>
                    <Button type="link">继续学习</Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default CoursesPage;

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag, Spin, message, Input } from 'antd';
import { BookOutlined, SearchOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../../services/courseService';

const { Title, Text } = Typography;
const { Search } = Input;

interface Course {
  id: number;
  title: string;
  description: string;
  coverImageUrl?: string;
  instructorName?: string;
  categoryName?: string;
  status?: string;
  enrolled?: boolean; // 是否已选修
}

const CourseBrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await courseService.getCourses({ page: 1, pageSize: 100 });
      // api拦截器已经解包了data，response直接就是data内容
      setCourses((response as any).courses || []);
    } catch (error) {
      message.error('加载课程失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: number) => {
    try {
      await courseService.enrollCourse(courseId);
      message.success('选课成功！');
      // 刷新课程列表
      fetchCourses();
    } catch (error: any) {
      message.error(error.response?.data?.message || '选课失败');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>课程浏览</Title>
        <Text type="secondary">浏览并报名感兴趣的课程</Text>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Search
            placeholder="搜索课程名称或教师"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={(value) => console.log('Search:', value)}
          />
        </Space>
      </Card>

      {courses.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <BookOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
            <div>
              <Text type="secondary">暂无可选课程</Text>
            </div>
          </div>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {courses.map((course) => (
            <Col xs={24} sm={12} md={8} lg={6} key={course.id}>
              <Card
                hoverable
                cover={
                  course.coverImageUrl ? (
                    <img
                      alt={course.title}
                      src={course.coverImageUrl}
                      style={{ height: '180px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        height: '180px',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BookOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
                    </div>
                  )
                }
                actions={[
                  <Button type="link" onClick={() => navigate(`/student/courses/${course.id}`)}>
                    查看详情
                  </Button>,
                  course.enrolled ? (
                    <Button type="default" disabled icon={<CheckCircleOutlined />}>
                      已选修
                    </Button>
                  ) : (
                    <Button type="primary" onClick={() => handleEnroll(course.id)}>
                      选课
                    </Button>
                  ),
                ]}
              >
                <Card.Meta
                  title={<div style={{ height: '48px', overflow: 'hidden' }}>{course.title}</div>}
                  description={
                    <div>
                      <div style={{
                        height: '40px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '8px'
                      }}>
                        {course.description || '暂无描述'}
                      </div>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <UserOutlined /> {course.instructorName || '未指定'}
                        </div>
                        {course.enrolled && (
                          <Tag color="green" icon={<CheckCircleOutlined />}>已选修</Tag>
                        )}
                        {course.categoryName && (
                          <Tag color="blue">{course.categoryName}</Tag>
                        )}
                        {course.status && course.status !== 'PUBLISHED' && (
                          <Tag color="orange">{course.status}</Tag>
                        )}
                      </Space>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default CourseBrowsePage;

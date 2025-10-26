import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Space, Spin, Tag, Button } from 'antd';
import { BookOutlined, UserOutlined, FolderOpenOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/courseService';

const { Title, Text, Paragraph } = Typography;

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [c, ch] = await Promise.all([
          courseService.getCourse(Number(id)),
          courseService.getChapters(Number(id)),
        ]);
        setCourse(c.data);
        const chData = (ch.data as any);
        setChapters(Array.isArray(chData) ? chData : (chData?.chapters || []));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Text>课程不存在</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/courses')}>
          返回课程列表
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Space>
                  <BookOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={2} style={{ margin: 0 }}>{course.title}</Title>
                </Space>
                <div style={{ marginTop: '12px' }}>
                  <Text type="secondary">授课教师：</Text>
                  <Text strong>{course.instructorName}</Text>
                </div>
              </div>

              <div>
                <Title level={4}>课程简介</Title>
                <Paragraph>{course.description || '暂无课程描述'}</Paragraph>
              </div>

              <div>
                <Title level={4}>章节</Title>
                {chapters.length > 0 ? (
                  <ul style={{ paddingLeft: 18 }}>
                    {chapters.map(ch => (
                      <li key={ch.id}>
                        <Space>
                          <FolderOpenOutlined />
                          <Text>
                            第{ch.orderIndex}章 {ch.title}
                          </Text>
                        </Space>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text type="secondary">暂无章节</Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="课程信息">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">分类</Text>
                <div>{course.categoryName ? <Tag color="blue">{course.categoryName}</Tag> : <Text type="secondary">未分类</Text>}</div>
              </div>

              <div>
                <Text type="secondary">状态</Text>
                <div><Tag color={course.status === 'PUBLISHED' ? 'green' : 'orange'}>{course.status}</Tag></div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CourseDetailPage;



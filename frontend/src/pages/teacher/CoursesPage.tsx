import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Table,
  Tag,
  Statistic,
  Modal,
  message,
  Popconfirm,
} from 'antd'
import {
  BookOutlined,
  UserOutlined,
  StarOutlined,
  FileTextOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  BarChartOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { courseService, type Course } from '@/services/courseService'
import { useAppSelector } from '@/store'

const { Title, Text } = Typography

const TeacherCoursesPage: React.FC = () => {
  const navigate = useNavigate()
  const currentUser = useAppSelector((state) => state.auth.user)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState({
    totalCourses: 0,
    totalStudents: 0,
    averageRating: 4.8,
  })

  useEffect(() => {
    fetchMyCourses()
  }, [])

  const fetchMyCourses = async () => {
    if (!currentUser?.userId) return

    setLoading(true)
    try {
      const response = await courseService.getCourses({
        instructorId: currentUser.userId,
      })

      const coursesData = response.courses || []
      setCourses(Array.isArray(coursesData) ? coursesData : [])

      // 计算统计数据
      setStatistics({
        totalCourses: coursesData.length,
        totalStudents: 0, // TODO: 从后端获取
        averageRating: 4.8, // TODO: 从后端获取
      })
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取课程列表失败')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = () => {
    navigate('/teacher/courses/create')
  }

  const handleViewCourse = (courseId: number) => {
    navigate(`/teacher/courses/${courseId}/view`)
  }

  const handleEditCourse = (courseId: number) => {
    navigate(`/teacher/courses/${courseId}/edit`)
  }

  const handleViewStatistics = async (courseId: number) => {
    try {
      const response = await courseService.getCourseStatistics(courseId)
      // api 拦截器已解包 data，response 直接是统计对象
      const stats = (response as any).data || response as any

      Modal.info({
        title: '课程数据统计',
        content: (
          <div>
            <p>学生人数: {stats.studentCount}</p>
            <p>作业数量: {stats.assignmentCount}</p>
            <p>考试数量: {stats.examCount}</p>
            <p>章节数量: {stats.chapterCount}</p>
          </div>
        ),
        width: 500,
      })
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取统计数据失败')
    }
  }

  const handleDeleteCourse = async (courseId: number) => {
    try {
      await courseService.deleteCourse(courseId)
      message.success('课程删除成功')
      fetchMyCourses()
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除课程失败')
    }
  }

  const handleTogglePublish = async (course: Course) => {
    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    const action = newStatus === 'PUBLISHED' ? '发布' : '取消发布'
    try {
      await courseService.updateCourse(course.id, {
        title: course.title,
        description: course.description || '',
        categoryId: course.categoryId,
        coverImageUrl: course.coverImageUrl,
        status: newStatus,
      } as any)
      message.success(`课程已${action}`)
      fetchMyCourses()
    } catch (error: any) {
      message.error(error.response?.data?.error || `${action}失败`)
    }
  }

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (category: string) =>
        category ? <Tag color="blue">{category}</Tag> : <Tag>未分类</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'PUBLISHED') return <Tag color="green">已发布</Tag>
        if (status === 'ARCHIVED') return <Tag color="default">已归档</Tag>
        return <Tag color="orange">草稿</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Course) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewCourse(record.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCourse(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title={record.status === 'PUBLISHED' ? '确定要取消发布吗？学生将无法看到此课程' : '确定要发布此课程吗？学生将可以看到并选课'}
            onConfirm={() => handleTogglePublish(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              icon={record.status === 'PUBLISHED' ? <StopOutlined /> : <CheckCircleOutlined />}
              style={{ color: record.status === 'PUBLISHED' ? '#fa8c16' : '#52c41a' }}
            >
              {record.status === 'PUBLISHED' ? '取消发布' : '发布'}
            </Button>
          </Popconfirm>
          <Button
            type="link"
            size="small"
            icon={<BarChartOutlined />}
            onClick={() => handleViewStatistics(record.id)}
          >
            数据
          </Button>
          <Popconfirm
            title="确定要删除这门课程吗？"
            description="删除后将无法恢复，请谨慎操作"
            onConfirm={() => handleDeleteCourse(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>课程管理</Title>
        <Text type="secondary">管理您的教学课程</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="我的课程"
              value={statistics.totalCourses}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="在学学生"
              value={statistics.totalStudents}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="平均评分"
              value={statistics.averageRating}
              precision={1}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <div
              style={{
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateCourse}
                >
                  创建课程
                </Button>
              </Space>
            </div>

            <Table
              dataSource={courses}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 门课程`,
              }}
              locale={{
                emptyText: (
                  <div style={{ padding: '40px 0' }}>
                    <FileTextOutlined
                      style={{ fontSize: 48, color: '#d9d9d9' }}
                    />
                    <p style={{ marginTop: 16, color: '#999' }}>
                      还没有创建课程
                    </p>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleCreateCourse}
                    >
                      创建第一门课程
                    </Button>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default TeacherCoursesPage

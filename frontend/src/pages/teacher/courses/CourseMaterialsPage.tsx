import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Button, Typography, Space, Table, Tag,
  Statistic, Select, Upload, message, Popconfirm, Spin,
} from 'antd'
import {
  FileTextOutlined, DownloadOutlined, DeleteOutlined,
  UploadOutlined, InboxOutlined, FolderOutlined,
} from '@ant-design/icons'
import { courseService, type CourseMaterial, type Course } from '@/services/courseService'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

const { Title, Text } = Typography
const { Option } = Select
const { Dragger } = Upload

function getFileTypeTag(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return <Tag color="blue">文档</Tag>
  if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return <Tag color="green">视频</Tag>
  if (['zip', 'rar', '7z'].includes(ext)) return <Tag color="orange">压缩包</Tag>
  if (['ppt', 'pptx'].includes(ext)) return <Tag color="purple">演示文稿</Tag>
  if (['xls', 'xlsx'].includes(ext)) return <Tag color="cyan">表格</Tag>
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <Tag color="magenta">图片</Tag>
  return <Tag>其他</Tag>
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const CourseMaterialsPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user)

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!user?.userId) return
    courseService.getCourses({ instructorId: user.userId }).then((res: any) => {
      const list: Course[] = res?.courses || []
      setCourses(list)
      if (list.length > 0) setSelectedCourseId(list[0].id)
    }).catch(() => {})
  }, [user?.userId])

  useEffect(() => {
    if (!selectedCourseId) return
    setLoading(true)
    courseService.getCourseMaterials(selectedCourseId)
      .then((res) => setMaterials(res?.materials || []))
      .catch(() => message.error('加载课程资料失败'))
      .finally(() => setLoading(false))
  }, [selectedCourseId])

  const handleUpload = async (file: File) => {
    if (!selectedCourseId) { message.warning('请先选择课程'); return false }
    setUploading(true)
    try {
      const mat = await courseService.uploadCourseMaterial(selectedCourseId, file)
      setMaterials(prev => [mat as CourseMaterial, ...prev])
      message.success(`"${file.name}" 上传成功`)
    } catch (e: any) {
      message.error(e?.response?.data?.message || '上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  const handleDelete = async (mat: CourseMaterial) => {
    if (!selectedCourseId) return
    try {
      await courseService.deleteCourseMaterial(selectedCourseId, mat.id)
      setMaterials(prev => prev.filter(m => m.id !== mat.id))
      message.success('资料已删除')
    } catch (e: any) {
      message.error(e?.response?.data?.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '资料名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      key: 'type',
      render: (_: any, rec: CourseMaterial) => getFileTypeTag(rec.name),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (s: number) => formatSize(s),
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => d ? d.slice(0, 10) : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, rec: CourseMaterial) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            href={rec.url}
            target="_blank"
            rel="noreferrer"
          >
            下载
          </Button>
          <Popconfirm
            title="确定删除此资料？"
            onConfirm={() => handleDelete(rec)}
            okText="确定" cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const docCount = materials.filter(m => /\.(pdf|doc|docx|txt|md|ppt|pptx|xls|xlsx)$/i.test(m.name)).length
  const videoCount = materials.filter(m => /\.(mp4|avi|mov|mkv)$/i.test(m.name)).length
  const totalSize = materials.reduce((s, m) => s + m.size, 0)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>课程资料</Title>
        <Text type="secondary">管理您课程中的教学资料文件</Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space align="center">
          <FolderOutlined style={{ fontSize: 16 }} />
          <Text strong>选择课程：</Text>
          <Select
            value={selectedCourseId ?? undefined}
            onChange={setSelectedCourseId}
            style={{ width: 280 }}
            placeholder="请选择课程"
          >
            {courses.map(c => (
              <Option key={c.id} value={c.id}>{c.title}</Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="本课程资料总数" value={materials.length} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="文档 / 视频" value={`${docCount} / ${videoCount}`} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="总大小" value={formatSize(totalSize)} />
          </Card>
        </Col>
      </Row>

      <Card
        title="资料列表"
        extra={
          <Upload
            beforeUpload={(file) => { handleUpload(file); return false }}
            showUploadList={false}
            disabled={!selectedCourseId || uploading}
          >
            <Button type="primary" icon={<UploadOutlined />} loading={uploading} disabled={!selectedCourseId}>
              上传资料
            </Button>
          </Upload>
        }
      >
        {!selectedCourseId ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <FolderOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
            <p style={{ color: '#999', marginTop: 12 }}>请先选择课程</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
        ) : materials.length === 0 ? (
          <Dragger
            beforeUpload={(file) => { handleUpload(file); return false }}
            showUploadList={false}
            disabled={uploading}
            style={{ padding: '20px 0' }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 40 }} /></p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持 PDF、Word、PPT、视频、压缩包等格式，单文件不超过 10MB</p>
          </Dragger>
        ) : (
          <Table
            dataSource={materials}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 个资料` }}
          />
        )}
      </Card>
    </div>
  )
}

export default CourseMaterialsPage

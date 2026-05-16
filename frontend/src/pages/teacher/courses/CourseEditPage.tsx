import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Checkbox,
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Form,
  Input,
  Select,
  message,
  Spin,
  Upload,
  Modal,
  Tag,
  Popconfirm,
  Tabs,
  Collapse,
  List,
  Badge,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  LoadingOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  MenuOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  DownOutlined,
  RobotOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  courseService,
  type Category,
  type CourseChapter,
  type CourseSection,
} from '@/services/courseService'
import RagApiKeyControl from '@/components/RagApiKeyControl'
import { uploadFile } from '@/services/fileService'
import { resolveFileUrl } from '@/utils/fileUrl'
import {
  countSelectedOutline,
  getFriendlyOutlineFallbackReason,
  getOutlineFileValidationError,
  hasPendingOutlineImport,
  normalizeParsedOutlineForUI,
  type ParsedOutlineChapterUI,
  validateParsedOutlineForImport,
} from './parsedOutlineHelpers'

const { Title, Text } = Typography
const { Option } = Select
const { Panel } = Collapse

const CourseEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const courseId = Number(id)

  const [form] = Form.useForm()
  const [chapterForm] = Form.useForm()
  const [sectionForm] = Form.useForm()

  const [categories, setCategories] = useState<Category[]>([])
  const [chapters, setChapters] = useState<CourseChapter[]>([])
  // sections indexed by chapterId
  const [sections, setSections] = useState<Record<number, CourseSection[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [coverUploading, setCoverUploading] = useState(false)

  // Chapter modal
  const [chapterModalVisible, setChapterModalVisible] = useState(false)
  const [editingChapter, setEditingChapter] = useState<CourseChapter | null>(null)
  const [chapterSaving, setChapterSaving] = useState(false)

  // Section modal
  const [sectionModalVisible, setSectionModalVisible] = useState(false)
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null)
  const [currentChapterId, setCurrentChapterId] = useState<number>(0)
  const [sectionSaving, setSectionSaving] = useState(false)

  // AI 大纲导入
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const [aiParsing, setAiParsing] = useState(false)
  const [aiImporting, setAiImporting] = useState(false)
  const [parseMode, setParseMode] = useState<'llm' | 'rule_fallback' | null>(null)
  const [fallbackReason, setFallbackReason] = useState<string | undefined>()
  const [parsedChapters, setParsedChapters] = useState<ParsedOutlineChapterUI[]>([])

  const resetAiOutlineState = () => {
    setAiParsing(false)
    setAiImporting(false)
    setParseMode(null)
    setFallbackReason(undefined)
    setParsedChapters([])
  }

  const handleAiParse = async (file: File) => {
    const validationError = getOutlineFileValidationError(file)
    if (validationError) {
      message.warning(validationError)
      return Upload.LIST_IGNORE
    }

    setAiParsing(true)
    setParseMode(null)
    setFallbackReason(undefined)
    setParsedChapters([])
    try {
      const res = await courseService.parseOutline(courseId, file)
      const normalizedChapters = normalizeParsedOutlineForUI(res.chapters || [])
      setParseMode(res.parseMode)
      setFallbackReason(res.fallbackReason)
      setParsedChapters(normalizedChapters)
      if (!normalizedChapters.length) {
        message.warning('未识别到章节，请检查文件内容')
      } else if (res.parseMode === 'rule_fallback') {
        message.warning(`规则解析完成，共识别 ${res.chapterCount} 个章节`)
      } else {
        message.success(`AI 识别到 ${res.chapterCount} 个章节，请确认后导入`)
      }
      return false
    } catch (e: any) {
      message.error(e.response?.data?.message || '解析失败，请检查文件内容')
    } finally {
      setAiParsing(false)
    }
    return false // 闃绘 antd Upload 鑷姩涓婁紶
  }

  const handleAiBatchImport = async () => {
    const validationError = validateParsedOutlineForImport(parsedChapters)
    if (validationError) {
      message.warning(validationError)
      return
    }
    if (!hasPendingOutlineImport(parsedChapters)) {
      message.success('当前没有需要导入的章节')
      return
    }

    setAiImporting(true)
    let importedChapters = 0
    let importedSections = 0
    let stoppedByError = false
    let hasPartialProgress = false

    try {
      const nextChapters = parsedChapters.map(chapter => ({
        ...chapter,
        sections: chapter.sections.map(section => ({ ...section })),
      }))

      for (let chapterIndex = 0; chapterIndex < nextChapters.length; chapterIndex += 1) {
        const chapter = nextChapters[chapterIndex]

        if (!chapter._selected || chapter._saved) {
          continue
        }

        chapter._saving = true
        chapter._error = undefined

        try {
          let targetChapterId = chapter._createdChapterId
          if (!targetChapterId) {
            const chapterResponse = await courseService.createChapter(courseId, {
              title: chapter.title.trim(),
              orderIndex: chapters.length + importedChapters + 1,
            }) as any
            targetChapterId = Number(chapterResponse?.id || chapterResponse?.data?.id)
            chapter._createdChapterId = targetChapterId
            hasPartialProgress = true
          }

          const selectedSections = chapter.sections.filter(section => section._selected)
          const pendingSections = selectedSections.filter(section => !section._saved)

          for (const section of pendingSections) {
            section._error = undefined
            try {
              await courseService.createSection(courseId, targetChapterId, {
                title: section.title.trim(),
                type: section.type,
                orderIndex: section.orderIndex,
              })
              section._saved = true
              importedSections += 1
              hasPartialProgress = true
            } catch (sectionError: any) {
              section._error =
                sectionError.response?.data?.message || '课时导入失败，请稍后重试'
              chapter._error = '章节已创建，但仍有课时未完成导入'
              stoppedByError = true
              break
            }
          }

          if (stoppedByError) {
            chapter._saving = false
            break
          }

          chapter._saved = true
          chapter._saving = false
          chapter._error = undefined
          importedChapters += 1
        } catch (chapterError: any) {
          chapter._saving = false
          chapter._error =
            chapterError.response?.data?.message || '章节导入失败，请稍后重试'
          stoppedByError = true
          break
        }
      }

      setParsedChapters(nextChapters)

      if (stoppedByError) {
        message.warning('部分导入成功，失败项已保留，可继续导入未完成项')
        return
      }

      message.success(`成功导入 ${importedChapters} 个章节，${importedSections} 个课时`)
      setAiModalVisible(false)
      resetAiOutlineState()
      await loadChapters()
      return
    } catch (e: any) {
      if (hasPartialProgress) {
        message.warning('部分导入成功，失败项已保留，可继续导入未完成项')
      } else {
        message.error(e.response?.data?.message || '导入失败，请稍后重试')
      }
      return
    } finally {
      setAiImporting(false)
    }
  }

  const updateParsedChapter = (
    chapterIndex: number,
    patch: Partial<ParsedOutlineChapterUI>
  ) => {
    setParsedChapters(prev =>
      prev.map((chapter, index) =>
        index === chapterIndex ? { ...chapter, ...patch } : chapter
      )
    )
  }

  const updateParsedSection = (
    chapterIndex: number,
    sectionIndex: number,
    patch: Partial<ParsedOutlineChapterUI['sections'][number]>
  ) => {
    setParsedChapters(prev =>
      prev.map((chapter, index) => {
        if (index !== chapterIndex) {
          return chapter
        }
        return {
          ...chapter,
          sections: chapter.sections.map((section, currentSectionIndex) =>
            currentSectionIndex === sectionIndex
              ? { ...section, ...patch }
              : section
          ),
        }
      })
    )
  }

  const toggleParsedChapterSelected = (chapterIndex: number, checked: boolean) => {
    updateParsedChapter(chapterIndex, { _selected: checked })
  }

  const toggleParsedSectionSelected = (
    chapterIndex: number,
    sectionIndex: number,
    checked: boolean
  ) => {
    updateParsedSection(chapterIndex, sectionIndex, { _selected: checked })
  }

  const removeParsedChapter = (chapterIndex: number) => {
    setParsedChapters(prev => prev.filter((_, index) => index !== chapterIndex))
  }

  const removeParsedSection = (chapterIndex: number, sectionIndex: number) => {
    setParsedChapters(prev =>
      prev.map((chapter, index) => {
        if (index !== chapterIndex) {
          return chapter
        }
        return {
          ...chapter,
          sections: chapter.sections.filter((_, currentSectionIndex) => {
            return currentSectionIndex !== sectionIndex
          }),
        }
      })
    )
  }

  useEffect(() => {
    if (courseId) loadData()
  }, [courseId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [courseRes, chaptersRes, categoriesRes] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.getChapters(courseId),
        courseService.getCategories(),
      ])

      const course = courseRes as any
      form.setFieldsValue({
        title: course.title,
        description: course.description,
        categoryId: course.categoryId,
        status: course.status || 'DRAFT',
      })
      setCoverUrl(course.coverImageUrl || '')

      const chapterList: CourseChapter[] = Array.isArray(chaptersRes)
        ? (chaptersRes as unknown as CourseChapter[])
        : ((chaptersRes as any)?.chapters || [])
      setChapters(chapterList)
      setCategories((categoriesRes as any) || [])

      // 批量加载每个章节的课时
      await loadAllSections(chapterList)
    } catch {
      message.error('加载课程信息失败')
    } finally {
      setLoading(false)
    }
  }

  const loadAllSections = async (chapterList: CourseChapter[]) => {
    const map: Record<number, CourseSection[]> = {}
    await Promise.all(
      chapterList.map(async (ch) => {
        try {
          const secs = await courseService.getSections(courseId, ch.id)
          map[ch.id] = secs
        } catch {
          map[ch.id] = []
        }
      })
    )
    setSections(map)
  }

  const loadChapters = async () => {
    try {
      const res = await courseService.getChapters(courseId)
      const list: CourseChapter[] = Array.isArray(res)
        ? (res as unknown as CourseChapter[])
        : ((res as any)?.chapters || [])
      setChapters(list)
      await loadAllSections(list)
    } catch {
      // ignore
    }
  }

  // 鈹€鈹€ Cover upload 鈹€鈹€

  const beforeCoverUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('只能上传图片格式的封面')
      return Upload.LIST_IGNORE
    }
    if (file.size / 1024 / 1024 > 5) {
      message.error('封面图片大小不能超过 5MB')
      return Upload.LIST_IGNORE
    }
    setCoverUploading(true)
    try {
      const result = await uploadFile(file, 'cover')
      setCoverUrl(result.url)
      message.success('封面上传成功')
    } catch {
      message.error('封面上传失败，请重试')
    } finally {
      setCoverUploading(false)
    }
    return Upload.LIST_IGNORE
  }

  // 鈹€鈹€ Save course 鈹€鈹€

  const handleSaveCourse = async (values: any) => {
    if (coverUploading) {
      message.warning('封面还在上传中，请稍等')
      return
    }
    setSaving(true)
    try {
      await courseService.updateCourse(courseId, {
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        coverImageUrl: coverUrl || undefined,
        status: values.status,
      } as any)
      message.success('课程信息已保存')
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 鈹€鈹€ Chapter operations 鈹€鈹€

  const openAddChapter = () => {
    setEditingChapter(null)
    chapterForm.resetFields()
    chapterForm.setFieldsValue({ orderIndex: chapters.length + 1 })
    setChapterModalVisible(true)
  }

  const openEditChapter = (chapter: CourseChapter) => {
    setEditingChapter(chapter)
    chapterForm.setFieldsValue({ title: chapter.title, orderIndex: chapter.orderIndex })
    setChapterModalVisible(true)
  }

  const handleChapterSave = async () => {
    try {
      const values = await chapterForm.validateFields()
      setChapterSaving(true)
      if (editingChapter) {
        await courseService.updateChapter(courseId, editingChapter.id, values)
        message.success('章节已更新')
      } else {
        await courseService.createChapter(courseId, values)
        message.success('章节已添加')
      }
      setChapterModalVisible(false)
      await loadChapters()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.error || '鎿嶄綔澶辫触')
    } finally {
      setChapterSaving(false)
    }
  }

  const handleDeleteChapter = async (chapterId: number) => {
    try {
      await courseService.deleteChapter(courseId, chapterId)
      message.success('章节已删除')
      await loadChapters()
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败')
    }
  }

  // 鈹€鈹€ Section operations 鈹€鈹€

  const openAddSection = (chapterId: number) => {
    setEditingSection(null)
    setCurrentChapterId(chapterId)
    sectionForm.resetFields()
    sectionForm.setFieldsValue({
      type: 'VIDEO',
      orderIndex: (sections[chapterId]?.length || 0) + 1,
    })
    setSectionModalVisible(true)
  }

  const openEditSection = (chapterId: number, section: CourseSection) => {
    setEditingSection(section)
    setCurrentChapterId(chapterId)
    sectionForm.setFieldsValue({
      title: section.title,
      type: section.type,
      orderIndex: section.orderIndex,
      videoUrl: section.videoUrl || '',
      content: section.content || '',
    })
    setSectionModalVisible(true)
  }

  const handleSectionSave = async () => {
    try {
      const values = await sectionForm.validateFields()
      setSectionSaving(true)
      const data = {
        title: values.title,
        type: values.type,
        orderIndex: values.orderIndex,
        videoUrl: values.type === 'VIDEO' ? values.videoUrl || undefined : undefined,
        content: values.type === 'TEXT' ? values.content || undefined : undefined,
      }
      if (editingSection) {
        await courseService.updateSection(courseId, currentChapterId, editingSection.id, data)
        message.success('课时已更新')
      } else {
        await courseService.createSection(courseId, currentChapterId, data)
        message.success('课时已添加')
      }
      setSectionModalVisible(false)
      // 只重新加载该章节的课时
      const secs = await courseService.getSections(courseId, currentChapterId)
      setSections(prev => ({ ...prev, [currentChapterId]: secs }))
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.error || '鎿嶄綔澶辫触')
    } finally {
      setSectionSaving(false)
    }
  }

  const handleDeleteSection = async (chapterId: number, sectionId: number) => {
    try {
      await courseService.deleteSection(courseId, chapterId, sectionId)
      message.success('课时已删除')
      const secs = await courseService.getSections(courseId, chapterId)
      setSections(prev => ({ ...prev, [chapterId]: secs }))
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="加载课程信息..." />
      </div>
    )
  }

  const sectionTypeLabel = (type: string) =>
    type === 'VIDEO' ? (
      <Tag icon={<PlayCircleOutlined />} color="blue">视频</Tag>
    ) : (
      <Tag icon={<FileTextOutlined />} color="green">图文</Tag>
    )

  const selectedOutlineMeta = countSelectedOutline(parsedChapters)
  const pendingOutlineImport = hasPendingOutlineImport(parsedChapters)
  const parseAlertMessage =
    parseMode === 'rule_fallback'
      ? getFriendlyOutlineFallbackReason(fallbackReason)
      : 'AI 解析完成，当前结果可在导入前继续编辑和筛选。'

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher/courses')} style={{ marginBottom: 16 }}>
          返回课程列表
        </Button>
        <Title level={2}>编辑课程</Title>
      </div>

      <Tabs defaultActiveKey="info">
        {/* Tab 1: 基本信息 */}
        <Tabs.TabPane tab="基本信息" key="info">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={18}>
              <Card>
                <Form form={form} layout="vertical" onFinish={handleSaveCourse}>
                  <Form.Item name="title" label="课程标题"
                    rules={[{ required: true, message: '请输入课程标题' }, { max: 100 }]}>
                    <Input placeholder="请输入课程标题" />
                  </Form.Item>

                  <Form.Item name="categoryId" label="课程分类"
                    rules={[{ required: true, message: '请选择课程分类' }]}>
                    <Select placeholder="请选择课程分类">
                      {categories.map((cat) => (
                        <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="description" label="课程描述"
                    rules={[{ required: true, message: '请输入课程描述' }, { max: 1000 }]}>
                    <Input.TextArea rows={6} showCount maxLength={1000} placeholder="详细描述课程内容、目标和适合人群" />
                  </Form.Item>

                  <Form.Item name="status" label="发布状态">
                    <Select>
                      <Option value="DRAFT"><Tag color="default">草稿</Tag> 草稿（学生不可见）</Option>
                      <Option value="PUBLISHED"><Tag color="green">已发布</Tag> 已发布（学生可选课）</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="课程封面">
                    <Upload
                      name="cover"
                      listType="picture-card"
                      showUploadList={false}
                      beforeUpload={beforeCoverUpload}
                      accept="image/*"
                    >
                      {coverUrl ? (
                        <img src={resolveFileUrl(coverUrl)} alt="课程封面" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div>
                          {coverUploading ? <LoadingOutlined /> : <PlusOutlined />}
                          <div style={{ marginTop: 8 }}>{coverUploading ? '上传中...' : '上传封面'}</div>
                        </div>
                      )}
                    </Upload>
                    <Text type="secondary" style={{ fontSize: 12 }}>支持 JPG/PNG/GIF，大小不超过 5MB</Text>
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={saving}
                      disabled={coverUploading}
                      icon={<SaveOutlined />}
                    >
                      保存修改
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* Tab 2: 课程内容（章节 + 课时） */}
        <Tabs.TabPane tab={`课程内容（${chapters.length} 章节）`} key="chapters">
          <Card
            title="章节与课时管理"
            extra={
              <Space>
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => { resetAiOutlineState(); setAiModalVisible(true) }}
                >
                  AI 导入大纲
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddChapter}>
                  添加章节
                </Button>
              </Space>
            }
          >
            {chapters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <MenuOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
                <p style={{ color: '#999', marginTop: 12 }}>还没有章节，点击“添加章节”开始</p>
              </div>
            ) : (
              <Collapse
                accordion={false}
                expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
              >
                {chapters.map((chapter) => {
                  const chSections = sections[chapter.id] || []
                  return (
                    <Panel
                      key={chapter.id}
                      header={
                        <Space>
                          <Tag color="blue">{chapter.orderIndex}</Tag>
                          <Text strong>{chapter.title}</Text>
                          <Badge count={chSections.length} showZero color="#1890ff" style={{ marginLeft: 4 }} />
                        </Space>
                      }
                      extra={
                        <Space onClick={(e) => e.stopPropagation()}>
                          <Button size="small" icon={<PlusOutlined />} type="primary" ghost
                            onClick={() => openAddSection(chapter.id)}>
                            添加课时
                          </Button>
                          <Button size="small" icon={<EditOutlined />}
                            onClick={() => openEditChapter(chapter)}>
                            编辑章节
                          </Button>
                          <Popconfirm
                            title="确定删除此章节及其所有课时？"
                            onConfirm={() => handleDeleteChapter(chapter.id)}
                            okText="确定" cancelText="取消"
                          >
                            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                          </Popconfirm>
                        </Space>
                      }
                    >
                      {/* Section list for this chapter */}
                      {chSections.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                          暂无课时，点击“添加课时”
                        </div>
                      ) : (
                        <List
                          size="small"
                          dataSource={chSections}
                          renderItem={(sec) => (
                            <List.Item
                              key={sec.id}
                              actions={[
                                <Button key="edit" type="link" size="small" icon={<EditOutlined />}
                                  onClick={() => openEditSection(chapter.id, sec)}>
                                  编辑
                                </Button>,
                                <Popconfirm key="del" title="确定删除此课时？"
                                  onConfirm={() => handleDeleteSection(chapter.id, sec.id)}
                                  okText="确定" cancelText="取消">
                                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                                </Popconfirm>,
                              ]}
                            >
                              <List.Item.Meta
                                avatar={sectionTypeLabel(sec.type)}
                                title={
                                  <Space>
                                    <Text>{sec.orderIndex}. {sec.title}</Text>
                                    {sec.videoUrl && (
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {sec.videoUrl.substring(0, 40)}{sec.videoUrl.length > 40 ? '...' : ''}
                                      </Text>
                                    )}
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Panel>
                  )
                })}
              </Collapse>
            )}
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* Chapter Add/Edit Modal */}
      <Modal title={editingChapter ? '编辑章节' : '添加章节'}
        open={chapterModalVisible} onCancel={() => setChapterModalVisible(false)}
        onOk={handleChapterSave} confirmLoading={chapterSaving}
        okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={chapterForm} layout="vertical">
          <Form.Item name="title" label="章节标题"
            rules={[{ required: true, message: '请输入章节标题' }, { max: 100 }]}>
            <Input placeholder="如：第一章 基础入门" />
          </Form.Item>
          <Form.Item name="orderIndex" label="排序序号"
            rules={[{ required: true, message: '请输入序号' }]}>
            <Input type="number" min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Section Add/Edit Modal */}
      <Modal title={editingSection ? '编辑课时' : '添加课时'}
        open={sectionModalVisible} onCancel={() => setSectionModalVisible(false)}
        onOk={handleSectionSave} confirmLoading={sectionSaving}
        okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={sectionForm} layout="vertical">
          <Form.Item name="title" label="课时标题"
            rules={[{ required: true, message: '请输入课时标题' }, { max: 100 }]}>
            <Input placeholder="濡傦細1.1 Hello World" />
          </Form.Item>

          <Form.Item name="type" label="课时类型" rules={[{ required: true }]}>
            <Select>
              <Option value="VIDEO">
                <PlayCircleOutlined style={{ color: '#1890ff', marginRight: 6 }} />视频课时
              </Option>
              <Option value="TEXT">
                <FileTextOutlined style={{ color: '#52c41a', marginRight: 6 }} />图文课时
              </Option>
            </Select>
          </Form.Item>

          <Form.Item name="orderIndex" label="排序序号"
            rules={[{ required: true, message: '请输入序号' }]}>
            <Input type="number" min={1} />
          </Form.Item>

          {/* 根据 type 显示不同字段 */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'VIDEO' ? (
                <Form.Item name="videoUrl" label="视频链接"
                  rules={[{ required: true, message: '请输入视频链接' }]}
                  extra="支持 YouTube、Bilibili、腾讯视频等嵌入链接">
                  <Input placeholder="https://www.bilibili.com/video/..." />
                </Form.Item>
              ) : (
                <Form.Item name="content" label="图文内容"
                  rules={[{ required: true, message: '请输入内容' }]}>
                  <Input.TextArea rows={6} placeholder="输入课时图文内容..." />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* AI 大纲导入 Modal */}
      <Modal
        title={<Space><RobotOutlined />AI 智能导入大纲</Space>}
        open={aiModalVisible}
        onCancel={() => {
          if (!aiImporting) {
            setAiModalVisible(false)
            resetAiOutlineState()
          }
        }}
        footer={
          <Space>
            {parsedChapters.length > 0 && (
              <Button
                icon={<ReloadOutlined />}
                onClick={resetAiOutlineState}
                disabled={aiImporting}
              >
                重新上传
              </Button>
            )}
            <Button
              onClick={() => {
                setAiModalVisible(false)
                resetAiOutlineState()
              }}
              disabled={aiImporting}
            >
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleAiBatchImport}
              loading={aiImporting}
              disabled={!parsedChapters.length || aiParsing || !pendingOutlineImport}
            >
              {pendingOutlineImport && parsedChapters.some(chapter => chapter._createdChapterId || chapter._saved)
                ? `继续导入未完成项（${selectedOutlineMeta.chapters} 章节）`
                : `导入已选章节（${selectedOutlineMeta.chapters}）`}
            </Button>
          </Space>
        }
        width={860}
        destroyOnHidden
      >
        <RagApiKeyControl />

        {parsedChapters.length === 0 && (
          <>
            <Alert
              message="支持 .txt / .md 格式，文件大小不超过 2MB"
              description="上传后会优先走模型解析，失败时自动回退到规则解析。识别结果可在导入前继续编辑、取消或删除。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Upload.Dragger
              accept=".txt,.md"
              beforeUpload={handleAiParse}
              showUploadList={false}
              disabled={aiParsing || aiImporting}
            >
              <p className="ant-upload-drag-icon">
                {aiParsing ? (
                  <LoadingOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                ) : (
                  <UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                )}
              </p>
              <p className="ant-upload-text">
                {aiParsing ? '正在解析大纲文件...' : '点击或拖拽上传大纲文件'}
              </p>
              <p className="ant-upload-hint">
                支持 .txt / .md 格式，按文件后缀和大小校验，不依赖 MIME。
              </p>
            </Upload.Dragger>
          </>
        )}

        {parsedChapters.length > 0 && (
          <Spin spinning={aiImporting} tip="正在导入大纲...">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Alert
                type={parseMode === 'rule_fallback' ? 'warning' : 'success'}
                showIcon
                message={
                  <Space wrap>
                    <Tag color={parseMode === 'rule_fallback' ? 'orange' : 'blue'}>
                      {parseMode === 'rule_fallback' ? '规则解析' : 'AI 解析'}
                    </Tag>
                    <Text>{parseAlertMessage}</Text>
                  </Space>
                }
              />

              <Text type="secondary">
                共识别 {parsedChapters.length} 个章节，{parsedChapters.reduce((sum, chapter) => {
                  return sum + chapter.sections.length
                }, 0)} 个课时；当前已选 {selectedOutlineMeta.chapters} 个章节、{selectedOutlineMeta.sections} 个课时。
              </Text>

              <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                {parsedChapters.map((chapter, chapterIndex) => (
                  <Card
                    key={`${chapter.orderIndex}-${chapterIndex}`}
                    size="small"
                    style={{
                      marginBottom: 12,
                      borderLeft: `4px solid ${
                        chapter._error
                          ? '#ff4d4f'
                          : chapter._saved
                            ? '#52c41a'
                            : chapter._selected
                              ? '#1890ff'
                              : '#d9d9d9'
                      }`,
                      opacity: chapter._selected ? 1 : 0.72,
                    }}
                  >
                    <Space
                      align="start"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space align="start" style={{ flex: 1 }}>
                        <Checkbox
                          checked={chapter._selected}
                          disabled={aiImporting}
                          onChange={event => {
                            toggleParsedChapterSelected(chapterIndex, event.target.checked)
                          }}
                        />
                        <Tag color={chapter._saved ? 'success' : 'blue'}>
                          {chapter._saved ? '已导入' : `章节 ${chapter.orderIndex}`}
                        </Tag>
                        <Input
                          value={chapter.title}
                          disabled={aiImporting}
                          maxLength={100}
                          placeholder="请输入章节标题"
                          onChange={event => {
                            updateParsedChapter(chapterIndex, {
                              title: event.target.value,
                              _error: undefined,
                            })
                          }}
                        />
                      </Space>

                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={aiImporting}
                        onClick={() => removeParsedChapter(chapterIndex)}
                      >
                        删除
                      </Button>
                    </Space>

                    {chapter._error && (
                      <Alert
                        type="error"
                        showIcon
                        message={chapter._error}
                        style={{ marginTop: 12 }}
                      />
                    )}

                    <Space
                      direction="vertical"
                      style={{ width: '100%', marginTop: 12 }}
                      size={8}
                    >
                      {chapter.sections.map((section, sectionIndex) => (
                        <Card key={`${chapterIndex}-${sectionIndex}`} size="small">
                          <Space
                            align="start"
                            style={{ width: '100%', justifyContent: 'space-between' }}
                          >
                            <Space align="start" style={{ flex: 1 }}>
                              <Checkbox
                                checked={chapter._selected && section._selected}
                                disabled={aiImporting || !chapter._selected}
                                onChange={event => {
                                  toggleParsedSectionSelected(
                                    chapterIndex,
                                    sectionIndex,
                                    event.target.checked
                                  )
                                }}
                              />
                              <Tag color={section._saved ? 'success' : section.type === 'TEXT' ? 'green' : 'blue'}>
                                {section._saved
                                  ? '已导入'
                                  : section.type === 'TEXT'
                                    ? '图文'
                                    : '视频'}
                              </Tag>
                              <Input
                                value={section.title}
                                disabled={aiImporting || !chapter._selected}
                                maxLength={100}
                                placeholder="请输入课时标题"
                                onChange={event => {
                                  updateParsedSection(chapterIndex, sectionIndex, {
                                    title: event.target.value,
                                    _error: undefined,
                                  })
                                }}
                              />
                              <Select
                                value={section.type}
                                disabled={aiImporting || !chapter._selected}
                                style={{ width: 110 }}
                                onChange={value => {
                                  updateParsedSection(chapterIndex, sectionIndex, {
                                    type: value as 'VIDEO' | 'TEXT',
                                  })
                                }}
                                options={[
                                  { label: '视频', value: 'VIDEO' },
                                  { label: '图文', value: 'TEXT' },
                                ]}
                              />
                            </Space>

                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              disabled={aiImporting}
                              onClick={() => removeParsedSection(chapterIndex, sectionIndex)}
                            >
                              删除
                            </Button>
                          </Space>

                          {section._error && (
                            <Alert
                              type="error"
                              showIcon
                              message={section._error}
                              style={{ marginTop: 12 }}
                            />
                          )}
                        </Card>
                      ))}
                    </Space>
                  </Card>
                ))}
              </div>
            </Space>
          </Spin>
        )}
      </Modal>
    </div>
  )
}

export default CourseEditPage

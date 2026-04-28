import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import RagApiKeyControl from '@/components/RagApiKeyControl';
import {
  examService,
  type ConfirmParsedQuestionsRequest,
  type ParsedExamQuestion,
} from '@/services/examService';
import {
  buildConfirmParsedQuestionsPayload,
  changeParsedQuestionType,
  getConfidenceMeta,
  getFriendlyFallbackReason,
  getQuestionFileValidationError,
  normalizeParsedQuestionsForUI,
  type ParsedQuestionUI,
  validateParsedQuestionForConfirm,
} from './parsedQuestionHelpers';

const { Title, Text } = Typography;
const { TextArea } = Input;

type QType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER';

const TYPE_LABELS: Record<QType, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  TRUE_FALSE: '判断题',
  SHORT_ANSWER: '简答题',
};

const TYPE_COLORS: Record<QType, string> = {
  SINGLE_CHOICE: 'blue',
  MULTIPLE_CHOICE: 'purple',
  TRUE_FALSE: 'cyan',
  SHORT_ANSWER: 'orange',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface Question {
  id: number;
  type: QType;
  stem: string;
  options?: string;
  answer: string;
  score: number;
  orderIndex: number;
}

const EditExamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [questionType, setQuestionType] = useState<QType>('SINGLE_CHOICE');
  const [optionCount, setOptionCount] = useState(4);
  const [form] = Form.useForm();

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionUI[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<ParsedExamQuestion[]>(
    []
  );
  const [parseMode, setParseMode] = useState<'llm' | 'rule_fallback' | null>(
    null
  );
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();

  useEffect(() => {
    if (!id) return;
    loadExam(Number(id));
  }, [id]);

  const loadExam = async (examId: number) => {
    setLoading(true);
    try {
      const res = (await examService.getExam(examId)) as any;
      setExam(res?.exam);
      setQuestions(res?.questions || []);
    } catch {
      message.error('加载考试信息失败');
    } finally {
      setLoading(false);
    }
  };

  const resetAiState = () => {
    setParsedQuestions([]);
    setOriginalQuestions([]);
    setSelectedFile(null);
    setParseMode(null);
    setFallbackReason(undefined);
  };

  const openAdd = () => {
    setEditingQuestion(null);
    setQuestionType('SINGLE_CHOICE');
    setOptionCount(4);
    form.resetFields();
    form.setFieldsValue({ type: 'SINGLE_CHOICE', score: 5 });
    setModalOpen(true);
  };

  const openEdit = (question: Question) => {
    setEditingQuestion(question);
    setQuestionType(question.type);

    let options: string[] = [];
    if (question.options) {
      try {
        options = JSON.parse(question.options);
      } catch {
        options = [];
      }
    }

    setOptionCount(options.length || 4);
    const values: Record<string, unknown> = {
      type: question.type,
      stem: question.stem,
      score: question.score,
    };

    if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
      options.forEach((option, index) => {
        values[`option_${index}`] = option;
      });
      if (question.type === 'SINGLE_CHOICE') {
        values.answer_single = question.answer;
      } else {
        values.answer_multi = question.answer ? question.answer.split(',') : [];
      }
    } else if (question.type === 'TRUE_FALSE') {
      values.answer_tf = question.answer;
    } else {
      values.answer_text = question.answer;
    }

    form.setFieldsValue(values);
    setModalOpen(true);
  };

  const buildPayload = (values: Record<string, any>) => {
    const type: QType = values.type;
    let options: string | undefined;
    let answer = '';

    if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
      const nextOptions: string[] = [];
      for (let index = 0; index < optionCount; index++) {
        nextOptions.push(values[`option_${index}`] || '');
      }
      options = JSON.stringify(nextOptions);
      answer =
        type === 'SINGLE_CHOICE'
          ? values.answer_single || ''
          : (values.answer_multi || []).join(',');
    } else if (type === 'TRUE_FALSE') {
      answer = values.answer_tf;
    } else {
      answer = values.answer_text || '';
    }

    return {
      type,
      stem: values.stem,
      options,
      answer,
      score: values.score,
      orderIndex: editingQuestion ? editingQuestion.orderIndex : questions.length,
    };
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = buildPayload(values);
      setSubmitting(true);
      if (editingQuestion) {
        await examService.updateQuestion(Number(id), editingQuestion.id, payload as any);
        message.success('题目更新成功');
      } else {
        await examService.addQuestion(Number(id), payload as any);
        message.success('题目添加成功');
      }
      setModalOpen(false);
      loadExam(Number(id));
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(editingQuestion ? '更新题目失败' : '添加题目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (questionId: number) => {
    setDeletingId(questionId);
    try {
      await examService.deleteQuestion(Number(id), questionId);
      message.success('删除成功');
      setQuestions(prev => prev.filter(question => question.id !== questionId));
    } catch {
      message.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const openAiModal = () => {
    resetAiState();
    setAiModalOpen(true);
  };

  const updateParsedQuestion = (
    index: number,
    updater: (question: ParsedQuestionUI) => ParsedQuestionUI
  ) => {
    setParsedQuestions(prev =>
      prev.map((question, questionIndex) =>
        questionIndex === index
          ? { ...updater(question), _error: undefined }
          : question
      )
    );
  };

  const handleAiParse = async () => {
    if (!selectedFile) {
      message.warning('请先选择文件');
      return;
    }

    setAiParsing(true);
    try {
      const response = await examService.parseQuestionsFromFile(Number(id), selectedFile);
      const normalizedQuestions = normalizeParsedQuestionsForUI(
        response.questions || []
      );

      setParsedQuestions(normalizedQuestions);
      setOriginalQuestions(normalizedQuestions.map(question => ({
        type: question.type,
        stem: question.stem,
        options: [...question.options],
        answer: question.answer,
        score: question.score,
        confidence: question.confidence,
        issues: [...question.issues],
      })));
      setParseMode(response.parseMode);
      setFallbackReason(response.fallbackReason);

      if (normalizedQuestions.length === 0) {
        message.warning('未能从文件中识别到题目，请检查文件内容');
      } else if (response.parseMode === 'rule_fallback') {
        message.warning(`规则解析完成，共识别 ${normalizedQuestions.length} 道题目`);
      } else {
        message.success(`AI 识别到 ${normalizedQuestions.length} 道题目，请确认后导入`);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'AI 解析失败');
    } finally {
      setAiParsing(false);
    }
  };

  const toggleParsedSelect = (index: number) => {
    if (batchSaving) return;
    updateParsedQuestion(index, question => ({
      ...question,
      _selected: !question._selected,
    }));
  };

  const toggleParsedEditing = (index: number) => {
    if (batchSaving) return;
    updateParsedQuestion(index, question => ({
      ...question,
      _editing: !question._editing,
    }));
  };

  const deleteParsedQuestion = (index: number) => {
    if (batchSaving) return;
    setParsedQuestions(prev => prev.filter((_, questionIndex) => questionIndex !== index));
  };

  const setParsedQuestionField = (
    index: number,
    field: keyof ParsedQuestionUI,
    value: string | number | string[] | boolean | undefined
  ) => {
    updateParsedQuestion(index, question => ({
      ...question,
      [field]: value,
    }));
  };

  const setParsedQuestionOptions = (index: number, options: string[]) => {
    updateParsedQuestion(index, question => ({
      ...question,
      options,
    }));
  };

  const addParsedOption = (index: number) => {
    updateParsedQuestion(index, question => ({
      ...question,
      options: [...question.options, ''].slice(0, 6),
    }));
  };

  const removeParsedOption = (index: number) => {
    updateParsedQuestion(index, question => ({
      ...question,
      options: question.options.length > 2 ? question.options.slice(0, -1) : question.options,
    }));
  };

  const handleParsedTypeChange = (index: number, nextType: QType) => {
    updateParsedQuestion(index, question =>
      changeParsedQuestionType(question, nextType)
    );
  };

  const handleParsedMultiAnswerChange = (index: number, answers: string[]) => {
    setParsedQuestionField(index, 'answer', answers.join(','));
  };

  const confirmIssueImport = (issueCount: number) =>
    new Promise<boolean>(resolve => {
      Modal.confirm({
        title: '确认导入存在解析提示的题目',
        content: `有 ${issueCount} 道题存在解析提示，确认导入前请确保已检查。`,
        okText: '继续导入',
        cancelText: '返回检查',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  const handleBatchSave = async () => {
    const selectedQuestions = parsedQuestions.filter(question => question._selected);
    if (selectedQuestions.length === 0) {
      message.warning('请至少选择一道题目');
      return;
    }

    let firstErrorMessage = '';
    let firstErrorIndex = -1;
    setParsedQuestions(prev =>
      prev.map((question, index) => {
        if (!question._selected) {
          return { ...question, _error: undefined };
        }
        const validationError = validateParsedQuestionForConfirm(question);
        if (validationError && firstErrorIndex < 0) {
          firstErrorIndex = index;
          firstErrorMessage = validationError;
        }
        return validationError
          ? { ...question, _error: validationError, _editing: true }
          : { ...question, _error: undefined };
      })
    );

    if (firstErrorIndex >= 0) {
      message.warning(`第 ${firstErrorIndex + 1} 题：${firstErrorMessage}`);
      return;
    }

    const issueCount = selectedQuestions.filter(
      question => question.issues.length > 0
    ).length;
    if (issueCount > 0) {
      const confirmed = await confirmIssueImport(issueCount);
      if (!confirmed) {
        return;
      }
    }

    const payload: ConfirmParsedQuestionsRequest = buildConfirmParsedQuestionsPayload(
      Number(id),
      originalQuestions,
      parsedQuestions
    );

    setBatchSaving(true);
    try {
      const result = await examService.confirmParsedQuestions(Number(id), payload);
      if (result.inserted < result.total) {
        message.warning(`部分成功：已导入 ${result.inserted} / ${result.total} 道题目`);
      } else {
        message.success(`成功导入 ${result.inserted} 道题目`);
      }
      setAiModalOpen(false);
      resetAiState();
      await loadExam(Number(id));
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || error?.message || '确认导入失败'
      );
    } finally {
      setBatchSaving(false);
    }
  };

  const renderParsedOptions = (question: ParsedQuestionUI) => {
    if (question.type !== 'SINGLE_CHOICE' && question.type !== 'MULTIPLE_CHOICE') {
      return null;
    }

    const selectedAnswers = question.answer
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    return (
      <div style={{ marginTop: '8px', paddingLeft: '24px' }}>
        {question.options.map((option, index) => {
          const letter = OPTION_LETTERS[index];
          const selected = selectedAnswers.includes(letter);
          return (
            <div key={letter} style={{ color: selected ? '#52c41a' : undefined }}>
              {letter}. {option || '（空选项）'}
              {selected ? ' ✓' : ''}
            </div>
          );
        })}
      </div>
    );
  };

  const renderParsedQuestionEditor = (question: ParsedQuestionUI, index: number) => {
    const optionLetterChoices = question.options.map((_, optionIndex) => OPTION_LETTERS[optionIndex]);

    return (
      <div style={{ marginTop: '12px' }} onClick={event => event.stopPropagation()}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text type="secondary">题型</Text>
            <Select<QType>
              value={question.type}
              onChange={value => handleParsedTypeChange(index, value)}
              style={{ width: 160, marginTop: 4 }}
              disabled={batchSaving}
            >
              {(Object.keys(TYPE_LABELS) as QType[]).map(type => (
                <Select.Option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text type="secondary">题干</Text>
            <TextArea
              rows={3}
              value={question.stem}
              disabled={batchSaving}
              onChange={event =>
                setParsedQuestionField(index, 'stem', event.target.value)
              }
              style={{ marginTop: 4 }}
            />
          </div>

          {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && (
            <div>
              <Space style={{ marginBottom: 8 }}>
                <Text type="secondary">选项</Text>
                {question.options.length < 6 && (
                  <Button
                    size="small"
                    onClick={() => addParsedOption(index)}
                    disabled={batchSaving}
                  >
                    增加选项
                  </Button>
                )}
                {question.options.length > 2 && (
                  <Button
                    size="small"
                    danger
                    onClick={() => removeParsedOption(index)}
                    disabled={batchSaving}
                  >
                    减少选项
                  </Button>
                )}
              </Space>

              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {question.options.map((option, optionIndex) => (
                  <Input
                    key={OPTION_LETTERS[optionIndex]}
                    addonBefore={OPTION_LETTERS[optionIndex]}
                    value={option}
                    disabled={batchSaving}
                    onChange={event => {
                      const nextOptions = [...question.options];
                      nextOptions[optionIndex] = event.target.value;
                      setParsedQuestionOptions(index, nextOptions);
                    }}
                  />
                ))}
              </Space>

              {question.type === 'SINGLE_CHOICE' ? (
                <Radio.Group
                  value={question.answer}
                  onChange={event =>
                    setParsedQuestionField(index, 'answer', event.target.value)
                  }
                  style={{ marginTop: 12 }}
                >
                  <Space wrap>
                    {optionLetterChoices.map(letter => (
                      <Radio key={letter} value={letter}>
                        {letter}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              ) : (
                <Checkbox.Group
                  value={question.answer
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean)}
                  onChange={checked =>
                    handleParsedMultiAnswerChange(index, checked as string[])
                  }
                  style={{ marginTop: 12 }}
                >
                  <Space wrap>
                    {optionLetterChoices.map(letter => (
                      <Checkbox key={letter} value={letter}>
                        {letter}
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              )}
            </div>
          )}

          {question.type === 'TRUE_FALSE' && (
            <Radio.Group
              value={question.answer}
              onChange={event =>
                setParsedQuestionField(index, 'answer', event.target.value)
              }
              disabled={batchSaving}
            >
              <Radio value="true">正确</Radio>
              <Radio value="false">错误</Radio>
            </Radio.Group>
          )}

          {question.type === 'SHORT_ANSWER' && (
            <TextArea
              rows={3}
              value={question.answer}
              disabled={batchSaving}
              onChange={event =>
                setParsedQuestionField(index, 'answer', event.target.value)
              }
            />
          )}

          <div>
            <Text type="secondary">分值</Text>
            <div style={{ marginTop: 4 }}>
              <InputNumber
                min={1}
                max={100}
                value={question.score}
                disabled={batchSaving}
                onChange={value => setParsedQuestionField(index, 'score', value || 0)}
              />
            </div>
          </div>

          <Space>
            <Button
              size="small"
              type="primary"
              onClick={() => toggleParsedEditing(index)}
              disabled={batchSaving}
            >
              完成编辑
            </Button>
            <Button
              size="small"
              onClick={() => toggleParsedEditing(index)}
              disabled={batchSaving}
            >
              取消编辑
            </Button>
          </Space>
        </Space>
      </div>
    );
  };

  const columns = [
    {
      title: '#',
      width: 50,
      render: (_: unknown, __: Question, index: number) => index + 1,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type: QType) => (
        <Tag color={TYPE_COLORS[type] || 'blue'}>{TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: '题干',
      dataIndex: 'stem',
      key: 'stem',
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 70,
      render: (score: number) => <Text strong>{score} 分</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (record: Question) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该题目？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deletingId === record.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalScore = questions.reduce((sum, question) => sum + question.score, 0);
  const selectedCount = parsedQuestions.filter(question => question._selected).length;
  const selectedIssueCount = parsedQuestions.filter(
    question => question._selected && question.issues.length > 0
  ).length;
  const parseAlertType = parseMode === 'rule_fallback' ? 'warning' : 'success';
  const parseAlertMessage =
    parseMode === 'rule_fallback'
      ? getFriendlyFallbackReason(fallbackReason)
      : 'AI 解析完成，当前结果可在导入前继续编辑。';

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/teacher/exams/list')}
            style={{ marginRight: '16px' }}
          >
            返回列表
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              编辑题目
            </Title>
            {exam && <Text type="secondary">{exam.title}</Text>}
          </div>
        </div>
        <Space>
          <Tag color="blue">共 {questions.length} 题</Tag>
          <Tag color="green">总分 {totalScore} 分</Tag>
          <Tooltip title="上传文件，由 AI 识别或生成题目">
            <Button icon={<RobotOutlined />} onClick={openAiModal}>
              AI 解析导入
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            手动添加
          </Button>
        </Space>
      </div>

      <Card loading={loading}>
        <Table
          dataSource={questions}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无题目，点击右上角添加或使用 AI 解析导入' }}
        />
      </Card>

      <Modal
        title={editingQuestion ? '编辑题目' : '添加题目'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editingQuestion ? '保存' : '添加'}
        cancelText="取消"
        confirmLoading={submitting}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
          <Form.Item name="type" label="题目类型" rules={[{ required: true }]}>
            <Select
              onChange={(value: QType) => {
                setQuestionType(value);
                form.resetFields([
                  'answer_single',
                  'answer_multi',
                  'answer_tf',
                  'answer_text',
                ]);
              }}
            >
              {(Object.keys(TYPE_LABELS) as QType[]).map(type => (
                <Select.Option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="stem"
            label="题干"
            rules={[{ required: true, message: '请输入题干' }]}
          >
            <TextArea rows={3} placeholder="请输入题目内容" />
          </Form.Item>

          {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
            <>
              <Divider orientation="left" style={{ fontSize: '13px' }}>
                选项（共 {optionCount} 个）
              </Divider>
              {Array.from({ length: optionCount }).map((_, index) => (
                <Form.Item
                  key={index}
                  name={`option_${index}`}
                  label={`选项 ${OPTION_LETTERS[index]}`}
                  rules={[
                    {
                      required: true,
                      message: `请输入选项 ${OPTION_LETTERS[index]}`,
                    },
                  ]}
                >
                  <Input placeholder={`选项 ${OPTION_LETTERS[index]} 的内容`} />
                </Form.Item>
              ))}
              <Space style={{ marginBottom: '16px' }}>
                {optionCount < 6 && (
                  <Button size="small" onClick={() => setOptionCount(count => count + 1)}>
                    增加选项
                  </Button>
                )}
                {optionCount > 2 && (
                  <Button
                    size="small"
                    danger
                    onClick={() => setOptionCount(count => count - 1)}
                  >
                    减少选项
                  </Button>
                )}
              </Space>

              {questionType === 'SINGLE_CHOICE' && (
                <Form.Item
                  name="answer_single"
                  label="正确答案"
                  rules={[{ required: true, message: '请选择正确答案' }]}
                >
                  <Radio.Group>
                    {Array.from({ length: optionCount }).map((_, index) => (
                      <Radio key={index} value={OPTION_LETTERS[index]}>
                        {OPTION_LETTERS[index]}
                      </Radio>
                    ))}
                  </Radio.Group>
                </Form.Item>
              )}

              {questionType === 'MULTIPLE_CHOICE' && (
                <Form.Item
                  name="answer_multi"
                  label="正确答案（可多选）"
                  rules={[{ required: true, message: '请选择至少一个正确答案' }]}
                >
                  <Checkbox.Group>
                    {Array.from({ length: optionCount }).map((_, index) => (
                      <Checkbox key={index} value={OPTION_LETTERS[index]}>
                        {OPTION_LETTERS[index]}
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              )}
            </>
          )}

          {questionType === 'TRUE_FALSE' && (
            <Form.Item
              name="answer_tf"
              label="正确答案"
              rules={[{ required: true, message: '请选择正确答案' }]}
            >
              <Radio.Group>
                <Radio value="true">
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> 正确
                </Radio>
                <Radio value="false">错误</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          {questionType === 'SHORT_ANSWER' && (
            <Form.Item
              name="answer_text"
              label="参考答案"
              rules={[{ required: true, message: '请输入参考答案' }]}
            >
              <TextArea rows={3} placeholder="输入该题参考答案（用于教师批改时参考）" />
            </Form.Item>
          )}

          <Form.Item
            name="score"
            label="分值"
            rules={[{ required: true, message: '请输入分值' }]}
          >
            <InputNumber min={1} max={100} style={{ width: '120px' }} addonAfter="分" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            AI 智能解析题目
          </Space>
        }
        open={aiModalOpen}
        onCancel={() => {
          if (!aiParsing && !batchSaving) {
            setAiModalOpen(false);
          }
        }}
        footer={
          parsedQuestions.length > 0 ? (
            <Space>
              <Button
                onClick={resetAiState}
                icon={<ReloadOutlined />}
                disabled={batchSaving}
              >
                重新上传
              </Button>
              <Button
                type="primary"
                loading={batchSaving}
                onClick={handleBatchSave}
                disabled={selectedCount === 0}
              >
                确认导入已选 {selectedCount > 0 ? `(${selectedCount} 题)` : ''}
              </Button>
            </Space>
          ) : null
        }
        width={820}
        destroyOnClose
      >
        <RagApiKeyControl />

        {parsedQuestions.length === 0 && (
          <div style={{ padding: '8px 0' }}>
            <Alert
              message="支持 .txt / .md / .csv 格式，文件大小不超过 2MB"
              description="文件中的题目可以是已有题目文本，也可以是自然语言出题要求。解析完成后可在导入前继续编辑。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Upload.Dragger
              accept=".txt,.md,.csv"
              maxCount={1}
              beforeUpload={file => {
                const errorMessage = getQuestionFileValidationError(file);
                if (errorMessage) {
                  message.warning(errorMessage);
                  return Upload.LIST_IGNORE;
                }
                setSelectedFile(file);
                return false;
              }}
              onRemove={() => setSelectedFile(null)}
              disabled={aiParsing}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域</p>
              <p className="ant-upload-hint">支持 .txt .md .csv 格式</p>
            </Upload.Dragger>

            <Button
              type="primary"
              block
              style={{ marginTop: '16px' }}
              icon={<RobotOutlined />}
              loading={aiParsing}
              disabled={!selectedFile}
              onClick={handleAiParse}
            >
              {aiParsing ? 'AI 正在解析中…' : '开始 AI 解析'}
            </Button>
          </div>
        )}

        {parsedQuestions.length > 0 && (
          <Spin spinning={batchSaving} tip="正在确认导入…">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Alert
                type={parseAlertType}
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

              <div>
                <Text type="secondary">
                  共识别 {parsedQuestions.length} 道题目，当前选中 {selectedCount} 道
                </Text>
                {selectedIssueCount > 0 && (
                  <Text type="warning" style={{ marginLeft: 8 }}>
                    其中 {selectedIssueCount} 道存在解析提示
                  </Text>
                )}
              </div>

              <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                {parsedQuestions.map((question, index) => {
                  const confidenceMeta = getConfidenceMeta(question.confidence);

                  return (
                    <Card
                      key={`${question.stem}-${index}`}
                      size="small"
                      style={{
                        marginBottom: '10px',
                        borderLeft: `4px solid ${
                          question._error
                            ? '#ff4d4f'
                            : question._selected
                              ? '#1890ff'
                              : '#d9d9d9'
                        }`,
                        opacity: question._selected ? 1 : 0.72,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <Space
                          style={{ flexWrap: 'wrap', flex: 1, alignItems: 'flex-start' }}
                        >
                          <Checkbox
                            checked={question._selected}
                            disabled={batchSaving}
                            onChange={() => toggleParsedSelect(index)}
                          />
                          <Tag color={TYPE_COLORS[question.type] || 'blue'}>
                            {TYPE_LABELS[question.type] || question.type}
                          </Tag>
                          <Text strong>
                            {index + 1}. {question.stem || '（未填写题干）'}
                          </Text>
                        </Space>

                        <Space wrap>
                          <Tag color={confidenceMeta.color}>
                            置信度 {confidenceMeta.label} {confidenceMeta.text}
                          </Tag>
                          <Tag>{question.score || '-'} 分</Tag>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => toggleParsedEditing(index)}
                            disabled={batchSaving}
                          >
                            {question._editing ? '收起' : '编辑'}
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => deleteParsedQuestion(index)}
                            disabled={batchSaving}
                          >
                            删除
                          </Button>
                        </Space>
                      </div>

                      {!question._editing && renderParsedOptions(question)}

                      {!question._editing && question.type === 'TRUE_FALSE' && (
                        <div
                          style={{
                            marginTop: '6px',
                            paddingLeft: '24px',
                            color: '#52c41a',
                          }}
                        >
                          答案：{question.answer === 'true' ? '正确' : '错误'}
                        </div>
                      )}

                      {!question._editing && question.type === 'SHORT_ANSWER' && (
                        <div style={{ marginTop: '6px', paddingLeft: '24px' }}>
                          <Text type="secondary">参考答案：</Text>
                          <Text>{question.answer || '（未填写）'}</Text>
                        </div>
                      )}

                      {question._editing && renderParsedQuestionEditor(question, index)}

                      {question._error && (
                        <Alert
                          type="error"
                          showIcon
                          message={question._error}
                          style={{ marginTop: 12 }}
                        />
                      )}

                      {question.issues.length > 0 && (
                        <Alert
                          type="warning"
                          showIcon
                          message="解析提示"
                          description={
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {question.issues.map(issue => (
                                <li key={issue}>{issue}</li>
                              ))}
                            </ul>
                          }
                          style={{ marginTop: 12 }}
                        />
                      )}
                    </Card>
                  );
                })}
              </div>
            </Space>
          </Spin>
        )}
      </Modal>
    </div>
  );
};

export default EditExamPage;

import React, { useState, useEffect } from 'react';
import {
  Card, Button, Typography, Space, Tag, Table, Modal, Form, Input,
  Select, InputNumber, Radio, Checkbox, message, Popconfirm, Divider,
  Upload, Alert, Spin, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, RobotOutlined, UploadOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { examService } from '../../../services/examService';

const { Title, Text } = Typography;
const { TextArea } = Input;

type QType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

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

interface ParsedQuestion {
  type: QType;
  stem: string;
  options?: string[];
  answer: string;
  score: number;
  // UI state
  _selected?: boolean;
  _saving?: boolean;
  _saved?: boolean;
}

const EditExamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  // 手动添加/编辑 Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [questionType, setQuestionType] = useState<QType>('SINGLE_CHOICE');
  const [optionCount, setOptionCount] = useState(4);
  const [form] = Form.useForm();

  // AI 解析 Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    loadExam(Number(id));
  }, [id]);

  const loadExam = async (examId: number) => {
    setLoading(true);
    try {
      const res = await examService.getExam(examId) as any;
      setExam(res?.exam);
      setQuestions(res?.questions || []);
    } catch {
      message.error('加载考试信息失败');
    } finally {
      setLoading(false);
    }
  };

  // ── 手动添加/编辑 ──────────────────────────────────

  const openAdd = () => {
    setEditingQuestion(null);
    setQuestionType('SINGLE_CHOICE');
    setOptionCount(4);
    form.resetFields();
    form.setFieldsValue({ type: 'SINGLE_CHOICE', score: 5 });
    setModalOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    const type = q.type;
    setQuestionType(type);

    let opts: string[] = [];
    if (q.options) {
      try { opts = JSON.parse(q.options); } catch { /* ignore */ }
    }
    setOptionCount(opts.length || 4);

    const values: any = { type: q.type, stem: q.stem, score: q.score };
    if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
      opts.forEach((opt, i) => { values[`option_${i}`] = opt; });
      if (type === 'SINGLE_CHOICE') values.answer_single = q.answer;
      else values.answer_multi = q.answer ? q.answer.split(',') : [];
    } else if (type === 'TRUE_FALSE') {
      values.answer_tf = q.answer;
    } else {
      values.answer_text = q.answer;
    }
    form.setFieldsValue(values);
    setModalOpen(true);
  };

  const buildPayload = (values: any) => {
    const type: QType = values.type;
    let options: string | undefined;
    let answer: string;

    if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
      const opts: string[] = [];
      for (let i = 0; i < optionCount; i++) opts.push(values[`option_${i}`] || '');
      options = JSON.stringify(opts);
      answer = type === 'SINGLE_CHOICE'
        ? (values.answer_single || '')
        : (values.answer_multi || []).join(',');
    } else if (type === 'TRUE_FALSE') {
      answer = values.answer_tf;
    } else {
      answer = values.answer_text || '';
    }

    return {
      type, stem: values.stem, options, answer,
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
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(editingQuestion ? '更新题目失败' : '添加题目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (qId: number) => {
    setDeletingId(qId);
    try {
      await examService.deleteQuestion(Number(id), qId);
      message.success('删除成功');
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } catch {
      message.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // ── AI 解析 ─────────────────────────────────────────

  const openAiModal = () => {
    setParsedQuestions([]);
    setSelectedFile(null);
    setAiModalOpen(true);
  };

  const handleAiParse = async () => {
    if (!selectedFile) {
      message.warning('请先选择文件');
      return;
    }
    setAiParsing(true);
    try {
      const res = await examService.parseQuestionsFromFile(Number(id), selectedFile);
      const list: ParsedQuestion[] = (res.questions || []).map((q: any) => ({
        ...q,
        _selected: true,
        _saving: false,
        _saved: false,
      }));
      if (list.length === 0) {
        message.warning('未能从文件中识别到题目，请检查文件格式');
      } else {
        message.success(`AI 识别到 ${list.length} 道题目，请确认后导入`);
      }
      setParsedQuestions(list);
    } catch (err: any) {
      message.error(err?.message || 'AI 解析失败');
    } finally {
      setAiParsing(false);
    }
  };

  const toggleParsedSelect = (index: number) => {
    setParsedQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, _selected: !q._selected } : q)),
    );
  };

  const handleBatchSave = async () => {
    const toSave = parsedQuestions.filter((q) => q._selected && !q._saved);
    if (toSave.length === 0) {
      message.warning('请至少选择一道题目');
      return;
    }
    setBatchSaving(true);
    let saved = 0;
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      if (!q._selected || q._saved) continue;

      setParsedQuestions((prev) =>
        prev.map((pq, idx) => (idx === i ? { ...pq, _saving: true } : pq)),
      );

      try {
        const payload: any = {
          type: q.type,
          stem: q.stem,
          answer: q.answer || (q.type === 'SHORT_ANSWER' ? '（参考答案待填写）' : ''),
          score: q.score || 3,
          orderIndex: questions.length + saved,
        };
        if (q.options && q.options.length > 0) {
          payload.options = JSON.stringify(q.options);
        }
        await examService.addQuestion(Number(id), payload);
        saved++;
        setParsedQuestions((prev) =>
          prev.map((pq, idx) => (idx === i ? { ...pq, _saving: false, _saved: true } : pq)),
        );
      } catch {
        setParsedQuestions((prev) =>
          prev.map((pq, idx) => (idx === i ? { ...pq, _saving: false } : pq)),
        );
        message.error(`第 ${i + 1} 题保存失败，已跳过`);
      }
    }
    setBatchSaving(false);
    message.success(`成功导入 ${saved} 道题目`);
    loadExam(Number(id));
  };

  // ── Table columns ───────────────────────────────────

  const columns = [
    {
      title: '#',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
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
              danger size="small" icon={<DeleteOutlined />}
              loading={deletingId === record.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  const selectedCount = parsedQuestions.filter((q) => q._selected && !q._saved).length;
  const allSaved = parsedQuestions.length > 0 && parsedQuestions.every((q) => !q._selected || q._saved);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/teacher/exams/list')}
            style={{ marginRight: '16px' }}
          >
            返回列表
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>编辑题目</Title>
            {exam && <Text type="secondary">{exam.title}</Text>}
          </div>
        </div>
        <Space>
          <Tag color="blue">共 {questions.length} 题</Tag>
          <Tag color="green">总分 {totalScore} 分</Tag>
          <Tooltip title="上传文件，由 AI 自动识别题目">
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

      {/* ── 手动添加/编辑 Modal ── */}
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
              onChange={(v: QType) => {
                setQuestionType(v);
                form.resetFields(['answer_single', 'answer_multi', 'answer_tf', 'answer_text']);
              }}
            >
              {(Object.keys(TYPE_LABELS) as QType[]).map((t) => (
                <Select.Option key={t} value={t}>{TYPE_LABELS[t]}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="stem" label="题干" rules={[{ required: true, message: '请输入题干' }]}>
            <TextArea rows={3} placeholder="请输入题目内容" />
          </Form.Item>

          {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
            <>
              <Divider orientation="left" style={{ fontSize: '13px' }}>选项（共 {optionCount} 个）</Divider>
              {Array.from({ length: optionCount }).map((_, i) => (
                <Form.Item
                  key={i}
                  name={`option_${i}`}
                  label={`选项 ${OPTION_LETTERS[i]}`}
                  rules={[{ required: true, message: `请输入选项 ${OPTION_LETTERS[i]}` }]}
                >
                  <Input placeholder={`选项 ${OPTION_LETTERS[i]} 的内容`} />
                </Form.Item>
              ))}
              <Space style={{ marginBottom: '16px' }}>
                {optionCount < 6 && (
                  <Button size="small" onClick={() => setOptionCount((n) => n + 1)}>增加选项</Button>
                )}
                {optionCount > 2 && (
                  <Button size="small" danger onClick={() => setOptionCount((n) => n - 1)}>减少选项</Button>
                )}
              </Space>

              {questionType === 'SINGLE_CHOICE' && (
                <Form.Item name="answer_single" label="正确答案" rules={[{ required: true, message: '请选择正确答案' }]}>
                  <Radio.Group>
                    {Array.from({ length: optionCount }).map((_, i) => (
                      <Radio key={i} value={OPTION_LETTERS[i]}>{OPTION_LETTERS[i]}</Radio>
                    ))}
                  </Radio.Group>
                </Form.Item>
              )}

              {questionType === 'MULTIPLE_CHOICE' && (
                <Form.Item name="answer_multi" label="正确答案（可多选）" rules={[{ required: true, message: '请选择至少一个正确答案' }]}>
                  <Checkbox.Group>
                    {Array.from({ length: optionCount }).map((_, i) => (
                      <Checkbox key={i} value={OPTION_LETTERS[i]}>{OPTION_LETTERS[i]}</Checkbox>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              )}
            </>
          )}

          {questionType === 'TRUE_FALSE' && (
            <Form.Item name="answer_tf" label="正确答案" rules={[{ required: true, message: '请选择正确答案' }]}>
              <Radio.Group>
                <Radio value="true"><CheckCircleOutlined style={{ color: '#52c41a' }} /> 正确</Radio>
                <Radio value="false">错误</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          {questionType === 'SHORT_ANSWER' && (
            <Form.Item name="answer_text" label="参考答案" rules={[{ required: true, message: '请输入参考答案' }]}>
              <TextArea rows={3} placeholder="输入该题参考答案（用于教师批改时参考）" />
            </Form.Item>
          )}

          <Form.Item name="score" label="分值" rules={[{ required: true, message: '请输入分值' }]}>
            <InputNumber min={1} max={100} style={{ width: '120px' }} addonAfter="分" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── AI 解析 Modal ── */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            AI 智能解析题目
          </Space>
        }
        open={aiModalOpen}
        onCancel={() => { if (!aiParsing && !batchSaving) setAiModalOpen(false); }}
        footer={
          parsedQuestions.length > 0 && !allSaved ? (
            <Space>
              <Button onClick={() => { setParsedQuestions([]); setSelectedFile(null); }} icon={<ReloadOutlined />}>
                重新上传
              </Button>
              <Button
                type="primary"
                loading={batchSaving}
                onClick={handleBatchSave}
                disabled={selectedCount === 0}
              >
                导入已选 {selectedCount > 0 ? `(${selectedCount} 题)` : ''}
              </Button>
            </Space>
          ) : allSaved ? (
            <Button type="primary" onClick={() => setAiModalOpen(false)}>完成</Button>
          ) : null
        }
        width={760}
        destroyOnClose
      >
        {/* 上传区域 */}
        {parsedQuestions.length === 0 && (
          <div style={{ padding: '8px 0' }}>
            <Alert
              message="支持 .txt / .md / .csv 格式，文件大小不超过 2MB"
              description="文件中的题目可以是任意格式的文本，AI 会自动识别题目类型、选项和答案。建议在文件中标注分值（如「5分」），否则将使用默认值。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Upload.Dragger
              accept=".txt,.md,.csv"
              maxCount={1}
              beforeUpload={(file) => {
                setSelectedFile(file);
                return false; // 阻止自动上传
              }}
              onRemove={() => setSelectedFile(null)}
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

        {/* 解析结果预览 */}
        {parsedQuestions.length > 0 && (
          <Spin spinning={batchSaving} tip="正在批量导入…">
            <div style={{ marginBottom: '12px' }}>
              <Text type="secondary">
                共识别 {parsedQuestions.length} 道题目，请勾选要导入的题目
              </Text>
            </div>
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {parsedQuestions.map((q, index) => (
                <Card
                  key={index}
                  size="small"
                  style={{
                    marginBottom: '10px',
                    borderLeft: `4px solid ${q._saved ? '#52c41a' : q._selected ? '#1890ff' : '#d9d9d9'}`,
                    opacity: q._saved ? 0.6 : 1,
                    cursor: q._saved ? 'default' : 'pointer',
                  }}
                  onClick={() => { if (!q._saved && !batchSaving) toggleParsedSelect(index); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Space style={{ flexWrap: 'wrap', flex: 1 }}>
                      <Checkbox
                        checked={q._selected}
                        disabled={q._saved || batchSaving}
                        onChange={() => toggleParsedSelect(index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Tag color={TYPE_COLORS[q.type] || 'blue'}>{TYPE_LABELS[q.type] || q.type}</Tag>
                      <Text strong>{index + 1}. {q.stem}</Text>
                    </Space>
                    <Space>
                      {q._saving && <Spin size="small" />}
                      {q._saved && <Tag color="green">已导入</Tag>}
                      <Tag>{q.score} 分</Tag>
                    </Space>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div style={{ marginTop: '8px', paddingLeft: '24px' }}>
                      {q.options.map((opt, i) => (
                        <div key={i} style={{ color: q.answer.split(',').includes(OPTION_LETTERS[i]) ? '#52c41a' : undefined }}>
                          {OPTION_LETTERS[i]}. {opt}
                          {q.answer.split(',').includes(OPTION_LETTERS[i]) && ' ✓'}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'TRUE_FALSE' && (
                    <div style={{ marginTop: '6px', paddingLeft: '24px', color: '#52c41a' }}>
                      答案：{q.answer === 'true' ? '正确' : '错误'}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Spin>
        )}
      </Modal>
    </div>
  );
};

export default EditExamPage;

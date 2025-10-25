import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Space, Radio, Checkbox, Input, message, Spin, Modal, Statistic } from 'antd';
import { 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector, selectCurrentExam, selectExamQuestions, selectExamLoading } from '../../store';
import { fetchExam, submitExam, clearCurrentExam } from '../../store/slices/examSlice';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Countdown } = Statistic;

const TakeExamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const exam = useAppSelector(selectCurrentExam);
  const questions = useAppSelector(selectExamQuestions);
  const loading = useAppSelector(selectExamLoading);
  
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchExam(Number(id)));
    }
    return () => {
      dispatch(clearCurrentExam());
    };
  }, [id, dispatch]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = () => {
    const unanswered = questions.filter(q => !answers[q.id]);
    
    if (unanswered.length > 0) {
      Modal.confirm({
        title: '确认提交',
        icon: <ExclamationCircleOutlined />,
        content: `还有 ${unanswered.length} 题未作答，确定要提交吗？`,
        onOk: () => submitAnswers(),
      });
    } else {
      submitAnswers();
    }
  };

  const submitAnswers = async () => {
    if (!id) return;

    const answerList = Object.entries(answers).map(([questionId, answer]) => ({
      questionId: Number(questionId),
      answer: answer,
    }));

    setSubmitting(true);
    try {
      await dispatch(submitExam({
        id: Number(id),
        data: { answers: answerList }
      })).unwrap();
      
      message.success('考试提交成功！');
      navigate(`/student/exams/${id}`);
    } catch (error: any) {
      message.error(error.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !exam) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Text>考试不存在</Text>
        </Card>
      </div>
    );
  }

  const endTime = new Date(exam.endTime).getTime();
  const answeredCount = Object.keys(answers).length;

  const renderQuestion = (question: any, index: number) => {
    const questionNumber = index + 1;
    
    return (
      <Card key={question.id} style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              {questionNumber}. {question.stem}
            </Text>
            <Text type="secondary" style={{ marginLeft: '12px' }}>
              ({question.score}分)
            </Text>
          </div>

          {question.type === 'SINGLE_CHOICE' && (
            <Radio.Group 
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              value={answers[question.id]}
            >
              <Space direction="vertical">
                {question.options && JSON.parse(question.options).map((option: string, idx: number) => (
                  <Radio key={idx} value={String.fromCharCode(65 + idx)}>
                    {String.fromCharCode(65 + idx)}. {option}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          )}

          {question.type === 'MULTIPLE_CHOICE' && (
            <Checkbox.Group
              onChange={(values) => handleAnswerChange(question.id, values.join(','))}
              value={answers[question.id]?.split(',').filter(Boolean)}
            >
              <Space direction="vertical">
                {question.options && JSON.parse(question.options).map((option: string, idx: number) => (
                  <Checkbox key={idx} value={String.fromCharCode(65 + idx)}>
                    {String.fromCharCode(65 + idx)}. {option}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          )}

          {question.type === 'TRUE_FALSE' && (
            <Radio.Group 
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              value={answers[question.id]}
            >
              <Space>
                <Radio value="true">正确</Radio>
                <Radio value="false">错误</Radio>
              </Space>
            </Radio.Group>
          )}

          {question.type === 'SHORT_ANSWER' && (
            <TextArea
              rows={4}
              placeholder="请输入答案..."
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            />
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => {
            Modal.confirm({
              title: '确认退出',
              content: '退出后答题记录将不会保存，确定要退出吗？',
              onOk: () => navigate(`/student/exams/${id}`),
            });
          }}
        >
          退出考试
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={18}>
          <Card>
            <div style={{ marginBottom: '24px' }}>
              <Title level={3}>{exam.title}</Title>
              <Text type="secondary">{exam.courseTitle}</Text>
            </div>

            {questions.map((question, index) => renderQuestion(question, index))}

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleSubmit}
                loading={submitting}
              >
                提交考试
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={6}>
          <Card 
            title="考试信息" 
            style={{ position: 'sticky', top: '24px' }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">剩余时间</Text>
                <div style={{ marginTop: '8px' }}>
                  <Countdown 
                    value={endTime} 
                    onFinish={() => {
                      message.warning('考试时间已到，自动提交！');
                      submitAnswers();
                    }}
                    format="HH:mm:ss"
                    valueStyle={{ fontSize: '24px', color: '#1890ff' }}
                  />
                </div>
              </div>

              <div>
                <Text type="secondary">答题进度</Text>
                <div style={{ marginTop: '8px' }}>
                  <Text strong style={{ fontSize: '20px' }}>
                    {answeredCount} / {questions.length}
                  </Text>
                </div>
              </div>

              <div>
                <Text type="secondary">答题卡</Text>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(5, 1fr)', 
                  gap: '8px', 
                  marginTop: '12px' 
                }}>
                  {questions.map((q, idx) => (
                    <Button
                      key={q.id}
                      size="small"
                      type={answers[q.id] ? 'primary' : 'default'}
                      onClick={() => {
                        document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TakeExamPage;


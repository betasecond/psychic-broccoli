import React, { useState, useEffect } from 'react';
import {
  Card, Button, Typography, Space, Tag, Descriptions, Divider, message,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { examService } from '../../../services/examService';

const { Title, Text } = Typography;

interface AnswerItem {
  questionId: number;
  type: string;
  stem: string;
  score: number;
  studentAnswer: string;
  correctAnswer: string;
  options?: string;
  scoreAwarded?: number;
}

interface SubmissionDetail {
  id: number;
  examId: number;
  examTitle: string;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  totalScore?: number;
  answers: AnswerItem[];
}

const typeLabel: Record<string, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  TRUE_FALSE: '判断题',
  SHORT_ANSWER: '简答题',
};

const SubmissionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    loadDetail(Number(id));
  }, [id]);

  const loadDetail = async (submissionId: number) => {
    setLoading(true);
    try {
      const res = await examService.getSubmissionDetail(submissionId) as any;
      setDetail(res);
    } catch {
      message.error('加载答卷详情失败');
    } finally {
      setLoading(false);
    }
  };

  const renderAnswer = (item: AnswerItem, index: number) => {
    const isObjective = item.type !== 'SHORT_ANSWER';
    const isCorrect = isObjective && item.studentAnswer === item.correctAnswer;

    let displayStudent = item.studentAnswer || '（未作答）';
    let displayCorrect = item.correctAnswer;

    if (item.options) {
      try {
        const opts: string[] = JSON.parse(item.options);
        const fmt = (ans: string) =>
          ans
            .split(',')
            .map((ch) => {
              const i = ch.charCodeAt(0) - 65;
              return opts[i] ? `${ch}. ${opts[i]}` : ch;
            })
            .join(' / ');
        if (item.studentAnswer) displayStudent = fmt(item.studentAnswer);
        displayCorrect = fmt(item.correctAnswer);
      } catch {
        // keep raw
      }
    }

    return (
      <Card
        key={item.questionId}
        size="small"
        style={{
          marginBottom: '16px',
          borderLeft: isObjective
            ? `4px solid ${isCorrect ? '#52c41a' : '#ff4d4f'}`
            : '4px solid #1890ff',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong>
              {index + 1}. [{typeLabel[item.type] || item.type}] {item.stem}
            </Text>
            <Space>
              {isObjective && (
                isCorrect
                  ? <Tag color="green" icon={<CheckCircleOutlined />}>正确</Tag>
                  : <Tag color="red" icon={<CloseCircleOutlined />}>错误</Tag>
              )}
              <Tag color="blue">
                {item.scoreAwarded != null ? item.scoreAwarded : '—'} / {item.score} 分
              </Tag>
            </Space>
          </div>

          <div>
            <Text type="secondary">学生答案：</Text>
            <Text
              style={{ color: isObjective ? (isCorrect ? '#52c41a' : '#ff4d4f') : undefined }}
            >
              {displayStudent}
            </Text>
          </div>

          {isObjective && (
            <div>
              <Text type="secondary">正确答案：</Text>
              <Text style={{ color: '#52c41a' }}>{displayCorrect}</Text>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Text>加载中...</Text>
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ padding: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        <Text type="secondary" style={{ marginLeft: '12px' }}>答卷不存在或加载失败</Text>
      </div>
    );
  }

  const passed = detail.totalScore != null && detail.totalScore >= 60;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginRight: '16px' }}>
          返回
        </Button>
        <div>
          <Title level={2} style={{ margin: 0 }}>答卷详情</Title>
          <Text type="secondary">{detail.courseTitle} · {detail.examTitle}</Text>
        </div>
      </div>

      <Card style={{ marginBottom: '16px' }}>
        <Descriptions column={2}>
          <Descriptions.Item label="学生姓名">{detail.studentName}</Descriptions.Item>
          <Descriptions.Item label="学生邮箱">{detail.studentEmail}</Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {new Date(detail.submittedAt).toLocaleString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="总分">
            <Space>
              <Text style={{ fontSize: '20px', fontWeight: 'bold', color: passed ? '#52c41a' : '#ff4d4f' }}>
                {detail.totalScore ?? '—'}
              </Text>
              <Tag color={passed ? 'green' : 'red'}>{passed ? '通过' : '未通过'}</Tag>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider>答题情况（共 {detail.answers.length} 题）</Divider>

      {detail.answers.map((item, index) => renderAnswer(item, index))}
    </div>
  );
};

export default SubmissionDetailPage;

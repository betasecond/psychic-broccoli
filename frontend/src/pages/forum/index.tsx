import React from 'react';
import { Layout, Result, Button, List, Card, Space, Tag } from 'antd';
import { GlobalOutlined, MessageOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Content } = Layout;

const ForumPage: React.FC = () => {
    const forums = [
        { id: 1, title: 'Go 1.24 泛型语法专题讨论', author: '魏延', tags: ['Backend', 'CourseArk'], replies: 12 },
        { id: 2, title: 'RAG 系统检索准确率优化', author: '诸葛亮', tags: ['AI', 'System'], replies: 45 },
    ];

    return (
        <Content style={{ padding: '24px' }}>
            <Result
                icon={<MessageOutlined style={{ color: '#eb2f96' }} />}
                title="课程论坛 (CourseArk Forum)"
                subTitle="补齐论文提到的社区模块。支持针对课程内容发起实时讨论。"
                extra={<Button type="primary">发起新贴</Button>}
            />
            
            <List
                grid={{ gutter: 16, column: 1 }}
                dataSource={forums}
                renderItem={(item) => (
                    <List.Item>
                        <Card title={item.title}>
                            <Space>
                                <Tag color="blue"><GlobalOutlined /> {item.author}</Tag>
                                <Tag color="green"><ClockCircleOutlined /> 刚更新</Tag>
                                <Tag color="orange">{item.replies} 条回复</Tag>
                                {item.tags.map(t => <Tag key={t}>{t}</Tag>)}
                            </Space>
                        </Card>
                    </List.Item>
                )}
            />
        </Content>
    );
};

export default ForumPage;

import React from 'react';
import { Layout, Result, Button, Alert, Tag } from 'antd';
import { RocketOutlined, ToolOutlined, HourglassOutlined } from '@ant-design/icons';

const { Content } = Layout;

const LivePage: React.FC = () => {
    return (
        <Content style={{ padding: '24px' }}>
            <Alert
                message="功能规划 (Feature Roadmap)"
                description="本模块为 CourseArk 系统的未来展望功能。我们计划在后续版本中引入基于 WebRTC 的超低延迟实训辅导直播系统。"
                type="warning"
                showIcon
                icon={<HourglassOutlined />}
            />
            
            <Result
                status="info"
                icon={<RocketOutlined style={{ color: '#1890ff' }} />}
                title="实训互动直播间 - 即将上线 (Coming Soon)"
                subTitle={
                    <span>
                        作为论文“未来展望”的重要组成部分，直播模块将集成实时白板、代码协作推流等功能。
                        <br />
                        当前状态：<Tag color="processing">架构设计中</Tag> <Tag color="default">V2.0 迭代计划</Tag>
                    </span>
                }
                extra={[
                    <Button type="dashed" key="roadmap" icon={<ToolOutlined />} disabled>
                        查看详细路线图
                    </Button>
                ]}
            />
        </Content>
    );
};

export default LivePage;

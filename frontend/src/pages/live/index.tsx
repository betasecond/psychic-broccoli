import React from 'react';
import { Layout, Result, Button, Alert, Space, Badge } from 'antd';
import { CameraOutlined, TabletOutlined, TeamOutlined } from '@ant-design/icons';

const { Content } = Layout;

const LivePage: React.FC = () => {
    return (
        <Content style={{ padding: '24px' }}>
            <Alert
                message="正在等待直播流连接 (Waiting for Stream)..."
                description="补齐论文提到的实训辅导直播模块。该模块支持 WebRTC 协议实现低延迟教学直播。"
                type="info"
                showIcon
                icon={<CameraOutlined />}
            />
            
            <Result
                icon={<img src="https://img.icons8.com/deco/80/000000/video-clip.png" alt="Live Stream Placeholder" />}
                title="实训互动直播间 (Live Coaching)"
                subTitle="当前没有正在进行的直播课程。讲师可在教师端开启推流。"
                extra={[
                    <Button type="primary" key="join" icon={<TeamOutlined />}>申请进入直播间</Button>,
                    <Button key="back" icon={<TabletOutlined />}>查看直播回放</Button>
                ]}
            />
        </Content>
    );
};

export default LivePage;

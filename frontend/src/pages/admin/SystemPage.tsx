import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tabs, Statistic, Divider, Progress } from 'antd';
import { SettingOutlined, DatabaseOutlined, CloudServerOutlined, SafetyCertificateOutlined, FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const SystemPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>系统设置</Title>
        <Text type="secondary">平台系统配置和管理</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="服务器状态"
              value="正常"
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据库连接"
              value="正常"
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="安全状态"
              value="安全"
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="系统版本"
              value="v1.2.4"
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card>
            <Tabs defaultActiveKey="config">
              <TabPane tab="系统配置" key="config">
                <div style={{ padding: '24px' }}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Title level={4}>基本配置</Title>
                      <div style={{ padding: '16px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                        <Text strong>网站名称:</Text> 在线教育平台
                        <br />
                        <Text strong>网站描述:</Text> 提供高质量的在线教育服务
                        <br />
                        <Text strong>联系方式:</Text> contact@example.com
                      </div>
                    </div>

                    <div>
                      <Title level={4}>用户管理配置</Title>
                      <div style={{ padding: '16px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                        <Text strong>注册设置:</Text> 开放注册
                        <br />
                        <Text strong>邮箱验证:</Text> 需要验证
                        <br />
                        <Text strong>审核机制:</Text> 自动审核
                      </div>
                    </div>

                    <div>
                      <Title level={4}>安全配置</Title>
                      <div style={{ padding: '16px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                        <Text strong>密码强度:</Text> 高强度
                        <br />
                        <Text strong>登录保护:</Text> 启用
                        <br />
                        <Text strong>数据加密:</Text> 启用
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <Space>
                        <Button>取消</Button>
                        <Button type="primary">保存配置</Button>
                      </Space>
                    </div>
                  </Space>
                </div>
              </TabPane>
              
              <TabPane tab="系统日志" key="logs">
                <div style={{ padding: '24px' }}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4}>系统日志</Title>
                        <Space>
                          <Button>清空日志</Button>
                          <Button type="primary">导出日志</Button>
                        </Space>
                      </div>
                      
                      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '4px', padding: '16px' }}>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '2px' }}>
                          <Text type="success"><ClockCircleOutlined /> 2024-03-18 15:30:22</Text> - <Text>系统启动完成</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '2px' }}>
                          <Text type="secondary"><ClockCircleOutlined /> 2024-03-18 15:28:15</Text> - <Text>数据库连接成功</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '2px' }}>
                          <Text type="warning"><ExclamationCircleOutlined /> 2024-03-18 15:25:03</Text> - <Text>发现重复登录尝试: IP 192.168.1.100</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '2px' }}>
                          <Text type="success"><ClockCircleOutlined /> 2024-03-18 15:20:45</Text> - <Text>用户 'admin' 登录成功</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '2px' }}>
                          <Text type="secondary"><ClockCircleOutlined /> 2024-03-18 15:15:33</Text> - <Text>系统配置更新</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '2px' }}>
                          <Text type="warning"><ExclamationCircleOutlined /> 2024-03-18 15:10:12</Text> - <Text>内存使用率超过80%</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '2px' }}>
                          <Text type="success"><ClockCircleOutlined /> 2024-03-18 15:05:01</Text> - <Text>系统备份完成</Text>
                        </div>
                      </div>
                    </div>
                  </Space>
                </div>
              </TabPane>
              
              <TabPane tab="数据备份" key="backup">
                <div style={{ padding: '24px' }}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Title level={4}>数据备份状态</Title>
                      <div style={{ padding: '16px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                        <Text strong>自动备份:</Text> 已启用
                        <br />
                        <Text strong>备份频率:</Text> 每日 2:00 AM
                        <br />
                        <Text strong>保留期限:</Text> 30天
                        <br />
                        <Text strong>最后备份时间:</Text> 2024-03-18 02:00:05
                      </div>
                    </div>

                    <div>
                      <Title level={4}>备份历史</Title>
                      <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '4px', padding: '16px' }}>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '2px' }}>
                          <Text><FileTextOutlined /> backup_20240318_020005.zip</Text> - <Text type="secondary">2.4 GB</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f0f2f5', border: '1px solid #d9d9d9', borderRadius: '2px' }}>
                          <Text><FileTextOutlined /> backup_20240317_020004.zip</Text> - <Text type="secondary">2.3 GB</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f0f2f5', border: '1px solid #d9d9d9', borderRadius: '2px' }}>
                          <Text><FileTextOutlined /> backup_20240316_020003.zip</Text> - <Text type="secondary">2.3 GB</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f0f2f5', border: '1px solid #d9d9d9', borderRadius: '2px' }}>
                          <Text><FileTextOutlined /> backup_20240315_020002.zip</Text> - <Text type="secondary">2.3 GB</Text>
                        </div>
                        <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f0f2f5', border: '1px solid #d9d9d9', borderRadius: '2px' }}>
                          <Text><FileTextOutlined /> backup_20240314_020001.zip</Text> - <Text type="secondary">2.3 GB</Text>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <Space>
                        <Button>立即备份</Button>
                        <Button type="primary">恢复备份</Button>
                      </Space>
                    </div>
                  </Space>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemPage;
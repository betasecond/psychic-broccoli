import React from 'react'
import { Layout, Typography, Space } from 'antd'
import { BookOutlined, GlobalOutlined, SafetyOutlined } from '@ant-design/icons'
import './AuthLayout.css'

const { Content, Footer } = Layout
const { Title, Text } = Typography

interface AuthLayoutProps {
  children: React.ReactNode
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <Layout className="auth-layout">
      {/* Background decoration */}
      <div className="auth-background">
        <div className="auth-background-shape shape-1"></div>
        <div className="auth-background-shape shape-2"></div>
        <div className="auth-background-shape shape-3"></div>
      </div>

      <Content className="auth-content">
        <div className="auth-container">
          {/* Left side - Branding and features */}
          <div className="auth-branding">
            <div className="brand-header">
              <div className="brand-logo">
                <BookOutlined className="logo-icon" />
              </div>
              <Title level={1} className="brand-title">
                在线教育平台
              </Title>
              <Text className="brand-subtitle">
                连接知识与未来，开启学习新体验
              </Text>
            </div>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <GlobalOutlined />
                </div>
                <div className="feature-content">
                  <Title level={4} className="feature-title">
                    全球化学习
                  </Title>
                  <Text className="feature-description">
                    随时随地访问优质教育资源，打破地域限制
                  </Text>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <SafetyOutlined />
                </div>
                <div className="feature-content">
                  <Title level={4} className="feature-title">
                    安全可靠
                  </Title>
                  <Text className="feature-description">
                    采用先进的安全技术，保护您的学习数据和隐私
                  </Text>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <BookOutlined />
                </div>
                <div className="feature-content">
                  <Title level={4} className="feature-title">
                    个性化学习
                  </Title>
                  <Text className="feature-description">
                    智能推荐学习内容，定制专属学习路径
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth form */}
          <div className="auth-form-container">{children}</div>
        </div>
      </Content>

      <Footer className="auth-footer">
        <Space split={<span className="footer-divider">|</span>}>
          <Text type="secondary">© 2024 在线教育平台</Text>
          <Text type="secondary">隐私政策</Text>
          <Text type="secondary">服务条款</Text>
          <Text type="secondary">帮助中心</Text>
        </Space>
      </Footer>
    </Layout>
  )
}

export default AuthLayout

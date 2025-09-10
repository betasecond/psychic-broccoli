import React from 'react'
import { Layout } from 'antd'
import { UserMenu } from './index'
import './AppLayout.css'

const { Header, Content } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-header-content">
          <div className="app-logo">
            <h2>在线教育平台</h2>
          </div>
          <div className="app-header-actions">
            <UserMenu />
          </div>
        </div>
      </Header>
      <Content className="app-content">
        {children}
      </Content>
    </Layout>
  )
}

export default AppLayout
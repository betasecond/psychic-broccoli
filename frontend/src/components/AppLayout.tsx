import React, { useState } from 'react'
import { Layout, Button } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { UserAvatar, RoleBasedNavigation } from './index'
import './AppLayout.css'

const { Header, Content, Sider, Footer } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  return (
    <Layout className="app-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        className="app-sider"
      >
        <div className="app-sider-logo">
          <h3>{collapsed ? '教育' : '在线教育平台'}</h3>
        </div>
        <RoleBasedNavigation />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div className="app-header-content">
            <div className="app-header-left">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggleSidebar}
                className="sidebar-toggle"
              />
            </div>
            <div className="app-header-actions">
              <UserAvatar />
            </div>
          </div>
        </Header>
        <Content className="app-content">
          {children}
        </Content>
        <Footer className="app-footer">
          © {new Date().getFullYear()} 在线教育平台 | 作者: wzh
        </Footer>
      </Layout>
    </Layout>
  )
}

export default AppLayout
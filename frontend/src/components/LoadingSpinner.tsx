import React from 'react'
import { Spin, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const { Text } = Typography

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large'
  tip?: string
  spinning?: boolean
  children?: React.ReactNode
  overlay?: boolean
  delay?: number
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  tip = '加载中...',
  spinning = true,
  children,
  overlay = false,
  delay = 0,
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 24 : size === 'small' ? 14 : 18 }} spin />

  if (children) {
    return (
      <Spin 
        spinning={spinning} 
        tip={tip} 
        size={size} 
        indicator={antIcon}
        delay={delay}
      >
        {children}
      </Spin>
    )
  }

  if (overlay) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
      }}>
        <Spin indicator={antIcon} size={size} />
        {tip && (
          <Text style={{ marginTop: 16, color: '#666' }}>
            {tip}
          </Text>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      minHeight: '200px',
    }}>
      <Spin indicator={antIcon} size={size} />
      {tip && (
        <Text style={{ marginTop: 16, color: '#666' }}>
          {tip}
        </Text>
      )}
    </div>
  )
}

export default LoadingSpinner
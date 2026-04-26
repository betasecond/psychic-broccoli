import React, { useEffect, useState } from 'react'
import { Button, Input, Select, Space, Tag, Typography, message } from 'antd'
import { KeyOutlined, LockOutlined } from '@ant-design/icons'
import { ragCredentialStore, type RagProvider } from '@/services/ragService'

const { Text } = Typography

const providerOptions: Array<{ label: string; value: RagProvider }> = [
  { label: '阿里 DashScope', value: 'dashscope' },
  { label: 'OpenRouter', value: 'openrouter' },
]

const RagApiKeyControl: React.FC = () => {
  const [provider, setProvider] = useState<RagProvider>('dashscope')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const credentials = ragCredentialStore.get()
    setProvider(credentials.provider)
    setSaved(Boolean(credentials.apiKey))
  }, [])

  const handleSave = () => {
    const value = apiKey.trim()
    if (!value) {
      message.warning('请输入 API Key')
      return
    }
    ragCredentialStore.set(value, provider)
    setApiKey('')
    setSaved(true)
    message.success('Key 已保存到当前浏览器会话')
  }

  const handleClear = () => {
    ragCredentialStore.clear()
    setApiKey('')
    setSaved(false)
    message.success('已清除当前会话 Key')
  }

  return (
    <div
      style={{
        padding: 12,
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        marginBottom: 12,
      }}
    >
      <Space wrap align="center" style={{ width: '100%' }}>
        <KeyOutlined style={{ color: '#1677ff' }} />
        <Select
          size="small"
          value={provider}
          options={providerOptions}
          onChange={setProvider}
          style={{ width: 132 }}
        />
        <Input.Password
          size="small"
          value={apiKey}
          autoComplete="off"
          placeholder={saved ? '已保存，重新输入可覆盖' : '输入个人 API Key'}
          onChange={event => setApiKey(event.target.value)}
          style={{ width: 240, maxWidth: '100%' }}
        />
        <Button
          size="small"
          type="primary"
          icon={<LockOutlined />}
          onClick={handleSave}
        >
          保存
        </Button>
        {saved && (
          <Button size="small" onClick={handleClear}>
            清除
          </Button>
        )}
        <Tag color={saved ? 'success' : 'default'}>
          {saved ? '当前会话已启用' : '未设置'}
        </Tag>
      </Space>
      <Text
        type="secondary"
        style={{ display: 'block', marginTop: 8, fontSize: 12 }}
      >
        Key 只保存在当前浏览器会话，随上传或问答请求发送给后端，不写入数据库。
      </Text>
    </div>
  )
}

export default RagApiKeyControl

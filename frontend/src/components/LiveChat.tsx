import React, { useState, useEffect, useRef } from 'react'
import { Input, List, Avatar, message as antMessage } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { liveService } from '@/services'
import type { LiveMessage } from '@/services/liveService'
import './LiveChat.css'

interface LiveChatProps {
  liveId: number
  isInstructor?: boolean
}

export const LiveChat: React.FC<LiveChatProps> = ({ liveId, isInstructor = false }) => {
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [lastTimestamp, setLastTimestamp] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout>()

  // 轮询获取新消息
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const newMessages = await liveService.getMessages(liveId, lastTimestamp)
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages.reverse()])
          setLastTimestamp(newMessages[0].createdAt)
        }
      } catch (error) {
        console.error('获取消息失败', error)
      }
    }

    // 立即获取一次
    fetchMessages()

    // 每2秒轮询一次
    pollingIntervalRef.current = setInterval(fetchMessages, 2000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [liveId, lastTimestamp])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim()) {
      antMessage.warning('请输入消息内容')
      return
    }

    if (inputValue.length > 500) {
      antMessage.warning('消息长度不能超过500字符')
      return
    }

    setLoading(true)
    try {
      const newMessage = await liveService.sendMessage(liveId, inputValue)
      setMessages((prev) => [...prev, newMessage])
      setInputValue('')
      setLastTimestamp(newMessage.createdAt)
    } catch (error: any) {
      antMessage.error(error.response?.data?.error || '发送失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除消息（仅讲师）
  const deleteMessage = async (messageId: number) => {
    try {
      await liveService.deleteMessage(liveId, messageId)
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
      antMessage.success('消息已删除')
    } catch (error: any) {
      antMessage.error(error.response?.data?.error || '删除失败')
    }
  }

  return (
    <div className="live-chat-container">
      <div className="live-chat-header">
        <h3>聊天室</h3>
        <span className="message-count">{messages.length} 条消息</span>
      </div>

      <div className="live-chat-messages">
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item
              key={msg.id}
              className="chat-message-item"
              actions={
                isInstructor
                  ? [
                      <a
                        key="delete"
                        onClick={() => deleteMessage(msg.id)}
                        style={{ color: '#ff4d4f' }}
                      >
                        删除
                      </a>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={msg.user.avatarUrl}
                    icon={!msg.user.avatarUrl && <UserOutlined />}
                  />
                }
                title={
                  <div className="message-header">
                    <span className="message-username">{msg.user.username}</span>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                }
                description={<div className="message-content">{msg.content}</div>}
              />
            </List.Item>
          )}
        />
        <div ref={messagesEndRef} />
      </div>

      <div className="live-chat-input">
        <Input.Search
          placeholder="输入消息... (最多500字符)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSearch={sendMessage}
          onPressEnter={sendMessage}
          enterButton="发送"
          loading={loading}
          maxLength={500}
          disabled={loading}
        />
      </div>
    </div>
  )
}

export default LiveChat

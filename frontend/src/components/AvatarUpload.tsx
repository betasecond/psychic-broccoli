import React, { useState } from 'react'
import { Upload, Avatar, Button, message, Progress, Modal } from 'antd'
import { CameraOutlined, UserOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { uploadFile } from '../services/fileService'
import ImageCropper from './ImageCropper'
import './AvatarUpload.css'

interface AvatarUploadProps {
  avatarUrl?: string
  size?: number
  onUploadSuccess?: (url: string) => void
  disabled?: boolean
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  avatarUrl,
  size = 120,
  onUploadSuccess,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [cropperVisible, setCropperVisible] = useState(false)
  const [selectedImage, setSelectedImage] = useState('')

  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
    if (!isJpgOrPng) {
      message.error('只能上传 JPG/PNG 格式的图片!')
      return false
    }
    const isLt2M = file.size / 1024 / 1024 < 2
    if (!isLt2M) {
      message.error('图片大小不能超过 2MB!')
      return false
    }

    // Show cropper instead of uploading directly
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
      setCropperVisible(true)
    }
    reader.readAsDataURL(file)

    return false // Prevent automatic upload
  }

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File)
    }
    setPreviewImage(file.url || (file.preview as string))
    setPreviewVisible(true)
  }

  const handleCroppedImageUpload = async (croppedFile: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)
      setCropperVisible(false)

      // 上传到本地后端
      const result = await uploadFile(croppedFile, 'avatar', (percent) => {
        setUploadProgress(percent)
      })

      // Call success callback with the returned URL
      onUploadSuccess?.(result.url)
      message.success('头像上传成功')

    } catch (error) {
      console.error('Avatar upload error:', error)
      message.error('头像上传失败，请重试')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const uploadButton = (
    <div className="avatar-upload-container">
      <Avatar
        size={size}
        src={avatarUrl}
        icon={!avatarUrl && <UserOutlined />}
        className="avatar-preview"
      />
      {!disabled && (
        <div className="avatar-upload-overlay">
          <Button
            type="primary"
            shape="circle"
            icon={<CameraOutlined />}
            className="avatar-upload-btn"
            loading={uploading}
          />
          {uploading && (
            <div className="upload-progress">
              <Progress
                type="circle"
                percent={uploadProgress}
                size={40}
                strokeColor="#1890ff"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <Upload
        name="avatar"
        listType="picture-card"
        className="avatar-uploader"
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={disabled || uploading}
        onPreview={handlePreview}
      >
        {uploadButton}
      </Upload>

      <ImageCropper
        visible={cropperVisible}
        imageSrc={selectedImage}
        onCancel={() => setCropperVisible(false)}
        onConfirm={handleCroppedImageUpload}
      />

      <Modal
        open={previewVisible}
        title="头像预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="avatar" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  )
}

export default AvatarUpload

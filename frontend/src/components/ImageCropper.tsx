import React, { useState, useRef, useCallback } from 'react'
import { Modal, Button, Slider, Space, message } from 'antd'
import { RotateLeftOutlined, RotateRightOutlined } from '@ant-design/icons'
import './ImageCropper.css'

interface ImageCropperProps {
  visible: boolean
  imageSrc: string
  onCancel: () => void
  onConfirm: (croppedImage: File) => void
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  visible,
  imageSrc,
  onCancel,
  onConfirm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context
    ctx.save()

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale, scale)
    ctx.translate(-image.width / 2, -image.height / 2)

    // Draw image
    ctx.drawImage(image, 0, 0)

    // Restore context
    ctx.restore()

    // Draw crop area
    ctx.strokeStyle = '#1890ff'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)

    // Draw overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
  }, [scale, rotation, cropArea])

  const handleImageLoad = () => {
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return

    // Set canvas size to image size
    canvas.width = Math.min(image.width, 600)
    canvas.height = Math.min(image.height, 400)

    // Center crop area
    setCropArea({
      x: (canvas.width - 200) / 2,
      y: (canvas.height - 200) / 2,
      width: 200,
      height: 200,
    })

    drawCanvas()
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if click is inside crop area
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true)
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newX = Math.max(0, Math.min(x - dragStart.x, canvas.width - cropArea.width))
    const newY = Math.max(0, Math.min(y - dragStart.y, canvas.height - cropArea.height))

    setCropArea(prev => ({ ...prev, x: newX, y: newY }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const getCroppedImage = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      const image = imageRef.current
      if (!canvas || !image) {
        reject(new Error('Canvas or image not found'))
        return
      }

      // Create a new canvas for the cropped image
      const croppedCanvas = document.createElement('canvas')
      const ctx = croppedCanvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Set cropped canvas size
      croppedCanvas.width = cropArea.width
      croppedCanvas.height = cropArea.height

      // Calculate source coordinates considering transformations
      const sourceX = cropArea.x / scale
      const sourceY = cropArea.y / scale
      const sourceWidth = cropArea.width / scale
      const sourceHeight = cropArea.height / scale

      // Draw cropped image
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        cropArea.width,
        cropArea.height
      )

      // Convert to blob and then to file
      croppedCanvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-avatar.jpg', { type: 'image/jpeg' })
          resolve(file)
        } else {
          reject(new Error('Could not create blob'))
        }
      }, 'image/jpeg', 0.9)
    })
  }

  const handleConfirm = async () => {
    try {
      const croppedImage = await getCroppedImage()
      onConfirm(croppedImage)
    } catch (error) {
      message.error('图片裁剪失败')
      console.error('Crop error:', error)
    }
  }

  React.useEffect(() => {
    if (visible) {
      drawCanvas()
    }
  }, [visible, drawCanvas])

  return (
    <Modal
      title="裁剪头像"
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认裁剪
          </Button>
        </Space>
      }
    >
      <div className="image-cropper">
        <div className="cropper-canvas-container">
          <canvas
            ref={canvasRef}
            className="cropper-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop preview"
            style={{ display: 'none' }}
            onLoad={handleImageLoad}
          />
        </div>
        
        <div className="cropper-controls">
          <div className="control-group">
            <label>缩放:</label>
            <Slider
              min={0.5}
              max={3}
              step={0.1}
              value={scale}
              onChange={setScale}
              style={{ width: 200 }}
            />
          </div>
          
          <div className="control-group">
            <label>旋转:</label>
            <Space>
              <Button
                icon={<RotateLeftOutlined />}
                onClick={() => setRotation(prev => prev - 90)}
              />
              <Button
                icon={<RotateRightOutlined />}
                onClick={() => setRotation(prev => prev + 90)}
              />
            </Space>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ImageCropper
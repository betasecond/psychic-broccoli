import { useRef, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { progressService } from '../services/progressService'

interface UseVideoProgressOptions {
  courseId: number
  chapterId: number
  onProgressUpdate?: (progress: number) => void
  onChapterComplete?: () => void
  reportInterval?: number // 上报间隔（秒）
}

export const useVideoProgress = ({
  courseId,
  chapterId,
  onProgressUpdate,
  onChapterComplete,
  reportInterval = 30, // 默认每30秒上报一次
}: UseVideoProgressOptions) => {
  const intervalRef = useRef<NodeJS.Timeout>()
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const lastReportedProgressRef = useRef<number>(0)
  const hasCompletedRef = useRef<boolean>(false)

  // 上报进度
  const reportProgress = useCallback(
    async (progress: number) => {
      // 只有进度变化超过5%时才上报，减少不必要的请求
      if (Math.abs(progress - lastReportedProgressRef.current) < 5) {
        return
      }

      try {
        await progressService.updateProgress(courseId, progress)
        lastReportedProgressRef.current = progress
        onProgressUpdate?.(progress)
      } catch (error) {
        console.error('Failed to report progress:', error)
      }
    },
    [courseId, onProgressUpdate]
  )

  // 标记章节完成
  const markChapterComplete = useCallback(async () => {
    if (hasCompletedRef.current) {
      return
    }

    try {
      const result = await progressService.completeChapter(chapterId)
      hasCompletedRef.current = true
      message.success(`章节已完成！课程进度: ${result.progress}%`)
      onChapterComplete?.()
    } catch (error) {
      console.error('Failed to mark chapter complete:', error)
    }
  }, [chapterId, onChapterComplete])

  // 开始跟踪
  const startTracking = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (!videoElement) return

      videoElementRef.current = videoElement

      // 清除之前的定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // 定期上报进度
      intervalRef.current = setInterval(() => {
        const video = videoElementRef.current
        if (!video || video.paused) return

        const progress = Math.floor((video.currentTime / video.duration) * 100)
        if (progress > 0 && progress <= 100) {
          reportProgress(progress)
        }

        // 如果播放进度超过95%，标记为完成
        if (progress >= 95 && !hasCompletedRef.current) {
          markChapterComplete()
        }
      }, reportInterval * 1000)

      // 监听视频结束事件
      const handleEnded = () => {
        reportProgress(100)
        markChapterComplete()
      }

      videoElement.addEventListener('ended', handleEnded)

      // 返回清理函数
      return () => {
        videoElement.removeEventListener('ended', handleEnded)
      }
    },
    [reportProgress, markChapterComplete, reportInterval]
  )

  // 停止跟踪
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    startTracking,
    stopTracking,
    reportProgress,
    markChapterComplete,
  }
}

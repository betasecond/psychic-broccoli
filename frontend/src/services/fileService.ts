import api from './api'

export interface UploadFileResponse {
  url: string
  filename: string
  size: number
}

export interface UploadFilesResponse {
  files: UploadFileResponse[]
  failedFiles: string[]
  message: string
}

export type UploadType = 'avatar' | 'cover' | 'assignment'

/**
 * 上传单个文件
 * @param file 要上传的文件
 * @param type 上传类型：avatar（头像）、cover（课程封面）、assignment（作业附件，默认）
 * @param onProgress 上传进度回调
 */
export const uploadFile = async (
  file: File,
  type: UploadType = 'assignment',
  onProgress?: (percent: number) => void
): Promise<UploadFileResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(`/files/upload?type=${type}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      }
    },
  })

  return response as unknown as UploadFileResponse
}

/**
 * 上传多个文件（作业附件）
 */
export const uploadFiles = async (
  files: File[],
  onProgress?: (percent: number) => void
): Promise<UploadFilesResponse> => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await api.post('/files/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      }
    },
  })

  return response as unknown as UploadFilesResponse
}

/**
 * 删除文件
 */
export const deleteFile = async (url: string): Promise<void> => {
  await api.delete('/files', {
    params: { url },
  })
}

export const fileService = {
  uploadFile,
  uploadFiles,
  deleteFile,
}

export default fileService

import api from './api'

// Types for API requests and responses
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  user: {
    userId: number
    username: string
    email?: string
    avatarUrl?: string
    role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
  }
}

export interface RegisterRequest {
  username: string
  password: string
  confirmPassword: string
  role?: 'STUDENT' | 'INSTRUCTOR'
}

export interface RegisterResponse {
  userId: number
  username: string
}

export interface UserResponse {
  userId: number
  username: string
  email?: string
  avatarUrl?: string
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
}

export interface UpdateProfileRequest {
  email?: string
  avatarUrl?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface OssUploadCredentialsResponse {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  bucketName: string
  region: string
  expiration: string
}

// Authentication service class
class AuthService {
  /**
   * User login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/auth/login', credentials)
    return response.data
  }

  /**
   * User registration
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post('/auth/register', userData)
    return response.data
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<UserResponse> {
    const response = await api.get('/auth/me')
    return response.data
  }

  /**
   * Update user profile
   */
  async updateProfile(
    profileData: UpdateProfileRequest
  ): Promise<UserResponse> {
    const response = await api.put('/auth/profile', profileData)
    return response.data
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    await api.put('/auth/password', passwordData)
  }

  /**
   * Get OSS upload credentials for avatar upload
   */
  async getOssUploadCredentials(): Promise<OssUploadCredentialsResponse> {
    const response = await api.get('/auth/oss-credentials')
    return response.data
  }

  /**
   * Logout user (client-side only)
   */
  logout(): void {
    localStorage.removeItem('token')
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token')
    return !!token
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('token')
  }

  /**
   * Set token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem('token', token)
  }
}

// Export singleton instance
export const authService = new AuthService()
export default authService

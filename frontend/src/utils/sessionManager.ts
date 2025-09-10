import { store } from '../store'
import { logout, setCredentials, getCurrentUserAsync } from '../store/slices/authSlice'
import { message } from 'antd'

// Constants
const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const TOKEN_EXPIRY_KEY = 'token_expiry'
const STORAGE_EVENT_KEY = 'auth_storage_change'

// JWT token payload interface
interface JWTPayload {
  userId: number
  username: string
  role: string
  exp: number
  iat: number
}

class SessionManager {
  private checkInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL = 60000 // Check every minute

  /**
   * Initialize session manager
   */
  init(): void {
    this.loadStoredSession()
    this.startTokenExpiryCheck()
    this.setupStorageListener()
  }

  /**
   * Load stored session from localStorage
   */
  private loadStoredSession(): void {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const userStr = localStorage.getItem(USER_KEY)

      if (token && userStr) {
        const user = JSON.parse(userStr)
        
        // Check if token is expired
        if (this.isTokenExpired(token)) {
          this.clearSession()
          return
        }

        // Set credentials in store
        store.dispatch(setCredentials({ user, token }))
        
        // Verify token with server
        store.dispatch(getCurrentUserAsync())
      }
    } catch (error) {
      console.error('Error loading stored session:', error)
      this.clearSession()
    }
  }

  /**
   * Save session to localStorage
   */
  saveSession(token: string, user: any): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      
      // Extract and save token expiry
      const payload = this.decodeJWT(token)
      if (payload?.exp) {
        localStorage.setItem(TOKEN_EXPIRY_KEY, payload.exp.toString())
      }

      // Notify other tabs
      this.notifyStorageChange('login')
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  /**
   * Clear session from localStorage
   */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    
    // Notify other tabs
    this.notifyStorageChange('logout')
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJWT(token)
      if (!payload?.exp) return true

      const currentTime = Math.floor(Date.now() / 1000)
      return payload.exp < currentTime
    } catch (error) {
      return true
    }
  }

  /**
   * Decode JWT token
   */
  private decodeJWT(token: string): JWTPayload | null {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Error decoding JWT:', error)
      return null
    }
  }

  /**
   * Start periodic token expiry check
   */
  private startTokenExpiryCheck(): void {
    this.checkInterval = setInterval(() => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token && this.isTokenExpired(token)) {
        this.handleTokenExpiry()
      }
    }, this.CHECK_INTERVAL)
  }

  /**
   * Handle token expiry
   */
  private handleTokenExpiry(): void {
    store.dispatch(logout())
    message.warning('登录已过期，请重新登录')
    
    // Redirect to login page if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  /**
   * Setup storage event listener for multi-tab synchronization
   */
  private setupStorageListener(): void {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === TOKEN_KEY) {
        // Token changed in another tab
        if (event.newValue === null) {
          // Token removed - logout
          store.dispatch(logout())
        } else if (event.newValue !== event.oldValue) {
          // Token updated - reload session
          this.loadStoredSession()
        }
      }
    })

    // Listen for custom storage events
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_EVENT_KEY) {
        const data = event.newValue ? JSON.parse(event.newValue) : null
        if (data) {
          this.handleStorageChange(data)
        }
      }
    })
  }

  /**
   * Notify other tabs of storage changes
   */
  private notifyStorageChange(action: 'login' | 'logout'): void {
    const data = {
      action,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(data))
    // Remove immediately to trigger event
    localStorage.removeItem(STORAGE_EVENT_KEY)
  }

  /**
   * Handle storage changes from other tabs
   */
  private handleStorageChange(data: { action: string; timestamp: number }): void {
    const { action } = data
    
    if (action === 'logout') {
      // Another tab logged out
      store.dispatch(logout())
    } else if (action === 'login') {
      // Another tab logged in
      this.loadStoredSession()
    }
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiry(): number | null {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null

    const payload = this.decodeJWT(token)
    if (!payload?.exp) return null

    const currentTime = Math.floor(Date.now() / 1000)
    return Math.max(0, payload.exp - currentTime)
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    const token = localStorage.getItem(TOKEN_KEY)
    return token ? !this.isTokenExpired(token) : false
  }

  /**
   * Cleanup session manager
   */
  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()
export default sessionManager
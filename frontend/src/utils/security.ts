/**
 * 安全工具类
 */
export class SecurityUtils {
  /**
   * HTML 转义，防止 XSS 攻击
   */
  static escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * 移除 HTML 标签
   */
  static stripHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 验证密码强度
   */
  static validatePassword(password: string): {
    isValid: boolean
    score: number
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    // 长度检查
    if (password.length < 6) {
      feedback.push('密码长度至少6位')
    } else if (password.length >= 8) {
      score += 1
    }

    // 包含小写字母
    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('密码应包含小写字母')
    }

    // 包含大写字母
    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('密码应包含大写字母')
    }

    // 包含数字
    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('密码应包含数字')
    }

    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push('密码应包含特殊字符')
    }

    // 避免常见密码
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      '12345678', '123456789', 'password1', 'abc123'
    ]
    if (commonPasswords.includes(password.toLowerCase())) {
      feedback.push('请避免使用常见密码')
      score = Math.max(0, score - 2)
    }

    return {
      isValid: password.length >= 6 && score >= 2,
      score,
      feedback
    }
  }

  /**
   * 验证用户名格式
   */
  static isValidUsername(username: string): boolean {
    // 用户名只能包含字母、数字、下划线，长度3-20位
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(username)
  }

  /**
   * 检查是否包含恶意脚本
   */
  static containsScript(input: string): boolean {
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
    const onEventRegex = /\bon\w+\s*=/gi
    const javascriptRegex = /javascript:/gi
    
    return scriptRegex.test(input) || onEventRegex.test(input) || javascriptRegex.test(input)
  }

  /**
   * 清理用户输入
   */
  static sanitizeInput(input: string): string {
    if (!input) return ''
    
    // 移除潜在的恶意内容
    let cleaned = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
      .replace(/\bon\w+\s*=/gi, '') // 移除事件处理器
      .replace(/javascript:/gi, '') // 移除javascript协议
      .trim()

    return cleaned
  }

  /**
   * 生成随机字符串
   */
  static generateRandomString(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * 检查 JWT 令牌是否即将过期
   */
  static isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const exp = payload.exp * 1000 // 转换为毫秒
      const now = Date.now()
      const threshold = thresholdMinutes * 60 * 1000 // 转换为毫秒
      
      return exp - now < threshold
    } catch (error) {
      return true // 如果无法解析，认为已过期
    }
  }

  /**
   * 验证文件类型
   */
  static isValidFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type)
  }

  /**
   * 验证文件大小
   */
  static isValidFileSize(file: File, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    return file.size <= maxSizeInBytes
  }

  /**
   * 验证图片文件
   */
  static validateImageFile(file: File): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 5 // 5MB

    if (!this.isValidFileType(file, allowedTypes)) {
      errors.push('只支持 JPEG、PNG、GIF、WebP 格式的图片')
    }

    if (!this.isValidFileSize(file, maxSize)) {
      errors.push(`图片大小不能超过 ${maxSize}MB`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 防止 CSRF 攻击的令牌生成
   */
  static generateCSRFToken(): string {
    return this.generateRandomString(32)
  }

  /**
   * 检查 URL 是否安全
   */
  static isSafeUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      // 只允许 http 和 https 协议
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  /**
   * 限制字符串长度
   */
  static limitStringLength(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.substring(0, maxLength - 3) + '...'
  }

  /**
   * 检查是否为有效的手机号
   */
  static isValidPhoneNumber(phone: string): boolean {
    // 中国手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  /**
   * 数据脱敏
   */
  static maskSensitiveData(data: string, type: 'email' | 'phone' | 'idCard'): string {
    switch (type) {
      case 'email':
        const [username, domain] = data.split('@')
        if (username.length <= 2) return data
        return `${username.substring(0, 2)}***@${domain}`
      
      case 'phone':
        if (data.length !== 11) return data
        return `${data.substring(0, 3)}****${data.substring(7)}`
      
      case 'idCard':
        if (data.length < 8) return data
        return `${data.substring(0, 4)}****${data.substring(data.length - 4)}`
      
      default:
        return data
    }
  }

  /**
   * 检查内容是否包含敏感词
   */
  static containsSensitiveWords(content: string, sensitiveWords: string[] = []): boolean {
    const defaultSensitiveWords = [
      // 可以根据需要添加敏感词
    ]
    
    const allSensitiveWords = [...defaultSensitiveWords, ...sensitiveWords]
    const lowerContent = content.toLowerCase()
    
    return allSensitiveWords.some(word => lowerContent.includes(word.toLowerCase()))
  }
}
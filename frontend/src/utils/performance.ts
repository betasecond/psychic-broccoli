/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map()

  /**
   * 开始计时
   */
  static startTimer(name: string): void {
    this.timers.set(name, performance.now())
  }

  /**
   * 结束计时并返回耗时
   */
  static endTimer(name: string): number {
    const startTime = this.timers.get(name)
    if (!startTime) {
      console.warn(`Timer "${name}" not found`)
      return 0
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    this.timers.delete(name)

    if (import.meta.env.DEV) {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  /**
   * 测量函数执行时间
   */
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.startTimer(name)
    try {
      const result = await fn()
      this.endTimer(name)
      return result
    } catch (error) {
      this.endTimer(name)
      throw error
    }
  }

  /**
   * 测量同步函数执行时间
   */
  static measure<T>(name: string, fn: () => T): T {
    this.startTimer(name)
    try {
      const result = fn()
      this.endTimer(name)
      return result
    } catch (error) {
      this.endTimer(name)
      throw error
    }
  }

  /**
   * 获取页面加载性能指标
   */
  static getPageLoadMetrics(): Record<string, number> {
    if (typeof window === 'undefined' || !window.performance) {
      return {}
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (!navigation) {
      return {}
    }

    return {
      // DNS 查询时间
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      // TCP 连接时间
      tcpConnect: navigation.connectEnd - navigation.connectStart,
      // 请求响应时间
      request: navigation.responseEnd - navigation.requestStart,
      // DOM 解析时间
      domParse: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      // 页面完全加载时间
      pageLoad: navigation.loadEventEnd - navigation.loadEventStart,
      // 首次内容绘制时间
      firstContentfulPaint: this.getFirstContentfulPaint(),
      // 最大内容绘制时间
      largestContentfulPaint: this.getLargestContentfulPaint(),
    }
  }

  /**
   * 获取首次内容绘制时间
   */
  private static getFirstContentfulPaint(): number {
    const entries = performance.getEntriesByName('first-contentful-paint')
    return entries.length > 0 ? entries[0].startTime : 0
  }

  /**
   * 获取最大内容绘制时间
   */
  private static getLargestContentfulPaint(): number {
    const entries = performance.getEntriesByType('largest-contentful-paint')
    return entries.length > 0 ? entries[entries.length - 1].startTime : 0
  }

  /**
   * 监控内存使用情况
   */
  static getMemoryUsage(): Record<string, number> {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return {}
    }

    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    }
  }

  /**
   * 记录性能指标到控制台
   */
  static logPerformanceMetrics(): void {
    if (!import.meta.env.DEV) return

    console.group('📊 Performance Metrics')
    
    const pageMetrics = this.getPageLoadMetrics()
    if (Object.keys(pageMetrics).length > 0) {
      console.table(pageMetrics)
    }

    const memoryMetrics = this.getMemoryUsage()
    if (Object.keys(memoryMetrics).length > 0) {
      console.log('Memory Usage:', memoryMetrics)
    }

    console.groupEnd()
  }

  /**
   * 创建性能观察器
   */
  static createPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return
    }

    // 观察长任务
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // 超过50ms的任务
            console.warn(`🐌 Long Task detected: ${entry.duration.toFixed(2)}ms`, entry)
          }
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // Long task API not supported
    }

    // 观察布局偏移
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).value > 0.1) { // CLS > 0.1
            console.warn(`📐 Layout Shift detected: ${(entry as any).value}`, entry)
          }
        }
      })
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      // Layout shift API not supported
    }
  }

  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), wait)
    }
  }

  /**
   * 节流函数
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}
# CourseArk 项目30天完成计划

**项目名称**: CourseArk - 在线教育平台
**计划周期**: 30天（2026-02-03 至 2026-03-04）
**每日投入**: 2-3小时
**总开发时长**: 约75小时
**当前完成度**: 70-75%
**目标完成度**: 95%+

---

## 📋 目录

1. [总体策略](#总体策略)
2. [第一周：基础修复（Day 1-7）](#第一周基础修复day-1-7)
3. [第二周：直播功能（Day 8-14）](#第二周直播功能day-8-14)
4. [第三周：互动功能（Day 15-21）](#第三周互动功能day-15-21)
5. [第四周：优化完善（Day 22-30）](#第四周优化完善day-22-30)
6. [技术实现方案](#技术实现方案)
7. [风险预案](#风险预案)
8. [每日检查清单](#每日检查清单)

---

## 总体策略

### 核心原则
- ✅ **稳扎稳打**：先修复现有问题，再开发新功能
- ✅ **重点突出**：优先实现直播功能（核心要求）
- ✅ **简化优先**：采用简化方案，避免过度复杂
- ✅ **持续测试**：每完成一个功能立即测试

### 四周里程碑

| 周次 | 核心目标 | 预期完成度 | 关键产出 |
|------|---------|-----------|---------|
| **Week 1** | 基础修复与文件上传 | 85% | 权限修复、文件上传可用 |
| **Week 2** | 直播功能实现 | 90% | 推流播放功能完整 |
| **Week 3** | 聊天室与讨论区 | 95% | 互动功能完善 |
| **Week 4** | 优化与完善 | 98% | 可演示版本 |

---

## 第一周：基础修复（Day 1-7）

### 🎯 Week 1 目标
让现有功能完全可用，修复安全漏洞，实现文件上传功能。

---

### Day 1-2：权限修复与安全加固（6小时）

#### 任务清单
- [ ] **任务1.1**：修复作业提交记录权限漏洞
  - 文件：`backend/handlers/assignments.go`
  - 函数：`GetSubmissions`, `GetSubmissionDetail`
  - 问题：任何登录用户都可以查询他人的作业提交
  - 修复：添加角色校验和归属校验

- [ ] **任务1.2**：添加选课状态校验
  - 文件：`backend/handlers/courses.go`, `assignments.go`, `exams.go`
  - 问题：未选课的学生也可以看到课程详情
  - 修复：查询时校验 `course_enrollments` 表

- [ ] **任务1.3**：修复未发布课程可见问题
  - 文件：`backend/handlers/courses.go`
  - 函数：`GetCourses`
  - 问题：不传 `status` 参数时返回所有状态课程
  - 修复：默认只返回 `PUBLISHED` 状态

- [ ] **任务1.4**：测试所有权限相关接口
  - 使用不同角色账号测试
  - 确认权限隔离正确

#### 技术要点
```go
// 示例：选课状态校验
func CheckEnrollment(courseID, userID int) bool {
    var count int
    database.DB.QueryRow(
        "SELECT COUNT(*) FROM course_enrollments WHERE course_id = ? AND user_id = ?",
        courseID, userID,
    ).Scan(&count)
    return count > 0
}
```

#### 完成标准
- ✅ 学生只能查看自己的作业提交
- ✅ 未选课学生无法访问课程详情
- ✅ 草稿课程不对学生可见
- ✅ 所有权限测试通过

---

### Day 3-5：本地文件上传功能（7-8小时）

#### 采用方案
**不使用OSS，改用本地文件存储**（简化方案）

#### 任务清单
- [ ] **任务3.1**：创建文件上传处理器
  - 新建文件：`backend/handlers/upload.go`
  - 实现接口：`POST /api/v1/upload`
  - 支持类型：图片（jpg, png, gif）、文档（pdf, doc, docx）
  - 文件大小限制：10MB

- [ ] **任务3.2**：实现头像上传
  - 存储路径：`backend/public/avatars/`
  - 文件命名：`{userID}_{timestamp}.{ext}`
  - 更新用户表：`users.avatar_url`

- [ ] **任务3.3**：实现作业附件上传
  - 存储路径：`backend/public/attachments/`
  - 关联表：`assignment_submissions.attachment_url`

- [ ] **任务3.4**：实现课程封面上传
  - 存储路径：`backend/public/covers/`
  - 关联表：`courses.cover_image`

- [ ] **任务3.5**：前端适配本地上传
  - 修改文件：`frontend/src/components/AvatarUpload.tsx`
  - 移除OSS相关代码
  - 改用 `FormData` 直接上传到后端

#### 目录结构
```
backend/
├── public/
│   ├── avatars/          # 头像存储
│   ├── attachments/      # 作业附件
│   ├── covers/           # 课程封面
│   └── videos/           # 视频文件（Week 2）
```

#### 核心代码（后端）
```go
// backend/handlers/upload.go
package handlers

import (
    "fmt"
    "io"
    "os"
    "path/filepath"
    "time"

    "github.com/gin-gonic/gin"
)

// UploadFile 通用文件上传
func UploadFile(c *gin.Context) {
    file, err := c.FormFile("file")
    if err != nil {
        c.JSON(400, gin.H{"error": "文件上传失败"})
        return
    }

    // 获取上传类型
    uploadType := c.PostForm("type") // avatar, attachment, cover

    // 生成文件名
    ext := filepath.Ext(file.Filename)
    filename := fmt.Sprintf("%d_%d%s", getUserID(c), time.Now().Unix(), ext)

    // 确定存储路径
    var savePath string
    switch uploadType {
    case "avatar":
        savePath = filepath.Join("public", "avatars", filename)
    case "attachment":
        savePath = filepath.Join("public", "attachments", filename)
    case "cover":
        savePath = filepath.Join("public", "covers", filename)
    default:
        c.JSON(400, gin.H{"error": "无效的上传类型"})
        return
    }

    // 保存文件
    if err := c.SaveUploadedFile(file, savePath); err != nil {
        c.JSON(500, gin.H{"error": "保存文件失败"})
        return
    }

    // 返回文件URL
    fileURL := fmt.Sprintf("/static/%s/%s", uploadType+"s", filename)
    c.JSON(200, gin.H{"url": fileURL})
}
```

#### 核心代码（前端）
```typescript
// frontend/src/services/uploadService.ts
export const uploadFile = async (file: File, type: 'avatar' | 'attachment' | 'cover'): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.url
}
```

#### 路由配置
```go
// backend/main.go
// 添加静态文件服务
r.Static("/static", "./public")

// 添加上传路由
v1.POST("/upload", middleware.AuthMiddleware(), handlers.UploadFile)
```

#### 完成标准
- ✅ 文件上传接口正常工作
- ✅ 头像上传和显示正常
- ✅ 作业附件上传下载正常
- ✅ 课程封面显示正常
- ✅ 文件大小和类型校验有效

---

### Day 6-7：学习进度跟踪（5小时）

#### 任务清单
- [ ] **任务6.1**：实现更新学习进度接口
  - 文件：`backend/handlers/courses_ext.go`
  - 接口：`PUT /api/v1/courses/:id/progress`
  - 更新字段：`course_enrollments.progress`

- [ ] **任务6.2**：实现章节完成状态接口
  - 接口：`POST /api/v1/chapters/:id/complete`
  - 记录完成时间

- [ ] **任务6.3**：前端集成进度上报
  - 文件：`frontend/src/components/VideoPlayer.tsx`
  - 视频播放时每30秒上报一次进度
  - 播放结束时标记章节完成

- [ ] **任务6.4**：进度统计查询接口
  - 接口：`GET /api/v1/courses/:id/statistics`
  - 返回：总章节数、已完成数、进度百分比

#### 核心代码
```go
// backend/handlers/courses_ext.go
// UpdateProgress 更新学习进度
func UpdateProgress(c *gin.Context) {
    courseID := c.Param("id")
    userID := getUserID(c)

    var req struct {
        Progress int `json:"progress"` // 0-100
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "参数错误"})
        return
    }

    _, err := database.DB.Exec(
        "UPDATE course_enrollments SET progress = ? WHERE course_id = ? AND user_id = ?",
        req.Progress, courseID, userID,
    )

    if err != nil {
        c.JSON(500, gin.H{"error": "更新失败"})
        return
    }

    c.JSON(200, gin.H{"message": "进度已更新"})
}
```

#### 前端进度上报
```typescript
// frontend/src/hooks/useVideoProgress.ts
export const useVideoProgress = (courseId: number, chapterId: number) => {
  const intervalRef = useRef<NodeJS.Timeout>()

  const reportProgress = async (progress: number) => {
    await api.put(`/courses/${courseId}/progress`, { progress })
  }

  const startTracking = (videoElement: HTMLVideoElement) => {
    intervalRef.current = setInterval(() => {
      const progress = Math.floor((videoElement.currentTime / videoElement.duration) * 100)
      reportProgress(progress)
    }, 30000) // 每30秒上报
  }

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  return { startTracking, stopTracking }
}
```

#### 完成标准
- ✅ 观看视频时进度自动更新
- ✅ 刷新页面后进度保持
- ✅ 课程列表显示学习进度
- ✅ 进度统计准确

---

### Week 1 验收标准

**功能验收**：
- ✅ 所有权限漏洞已修复
- ✅ 文件上传功能完全可用
- ✅ 学习进度正常跟踪
- ✅ 无明显bug

**技术指标**：
- ✅ 文件上传响应时间 < 2秒
- ✅ 接口响应时间 < 500ms
- ✅ 前端页面加载时间 < 3秒

**预期完成度**：**85%**

---

## 第二周：直播功能（Day 8-14）

### 🎯 Week 2 目标
实现直播推流和播放功能，这是项目的核心要求。

### 技术选型：阿里云直播服务

**为什么选择阿里云？**
- ✅ 有免费试用额度（足够开发测试）
- ✅ 文档完善，Go SDK支持好
- ✅ 延迟低（2-3秒），适合直播
- ✅ 稳定性高

---

### Day 8-9：直播服务集成准备（5-6小时）

#### 任务清单
- [ ] **任务8.1**：注册阿里云账号
  - 访问：https://www.aliyun.com/
  - 完成实名认证
  - 开通视频直播服务

- [ ] **任务8.2**：配置直播域名
  - 推流域名：`push.example.com`（测试用官方域名）
  - 播放域名：`play.example.com`（测试用官方域名）
  - 获取鉴权Key

- [ ] **任务8.3**：安装SDK
  ```bash
  cd backend
  go get github.com/aliyun/alibaba-cloud-sdk-go/services/live
  ```

- [ ] **任务8.4**：配置环境变量
  - 添加到 `backend/.env`：
    ```
    ALIYUN_ACCESS_KEY_ID=your_access_key
    ALIYUN_ACCESS_KEY_SECRET=your_secret_key
    LIVE_PUSH_DOMAIN=push.example.com
    LIVE_PLAY_DOMAIN=play.example.com
    LIVE_AUTH_KEY=your_auth_key
    ```

#### 阿里云直播开通步骤
1. 登录阿里云控制台
2. 搜索"视频直播"服务
3. 点击"立即开通"
4. 选择按量付费（免费额度足够）
5. 进入直播控制台
6. 添加推流域名和播放域名
7. 配置鉴权（URL鉴权）
8. 获取AccessKey

#### 完成标准
- ✅ 阿里云账号已开通
- ✅ 直播服务已激活
- ✅ SDK安装成功
- ✅ 配置文件完成

---

### Day 10-12：直播后端实现（8小时）

#### 数据库设计
```sql
-- 创建直播记录表
CREATE TABLE live_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    instructor_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    stream_name TEXT NOT NULL UNIQUE,  -- 流名称，如 room_123
    push_url TEXT NOT NULL,            -- 推流地址
    play_url TEXT NOT NULL,            -- 播放地址
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'LIVE', 'ENDED')),
    scheduled_time DATETIME,
    started_at DATETIME,
    ended_at DATETIME,
    viewers_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- 直播观看记录
CREATE TABLE live_viewers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    live_session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME,
    FOREIGN KEY (live_session_id) REFERENCES live_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 任务清单
- [ ] **任务10.1**：创建直播处理器
  - 新建文件：`backend/handlers/live.go`
  - 实现推流地址生成逻辑
  - 实现播放地址生成逻辑

- [ ] **任务10.2**：实现直播管理接口
  - `POST /api/v1/live` - 创建直播
  - `GET /api/v1/live` - 获取直播列表
  - `GET /api/v1/live/:id` - 获取直播详情
  - `PUT /api/v1/live/:id/start` - 开始直播
  - `PUT /api/v1/live/:id/end` - 结束直播
  - `GET /api/v1/live/:id/urls` - 获取推流/播放地址

- [ ] **任务10.3**：实现观看统计
  - `POST /api/v1/live/:id/join` - 加入直播
  - `POST /api/v1/live/:id/leave` - 离开直播
  - `GET /api/v1/live/:id/viewers` - 获取观看人数

#### 核心代码：推流地址生成
```go
// backend/handlers/live.go
package handlers

import (
    "crypto/md5"
    "fmt"
    "time"

    "github.com/gin-gonic/gin"
)

// 生成推流地址
func generatePushURL(streamName string) string {
    domain := os.Getenv("LIVE_PUSH_DOMAIN")
    appName := "live"
    authKey := os.Getenv("LIVE_AUTH_KEY")

    // 鉴权过期时间（1小时后）
    expireTime := time.Now().Add(time.Hour).Unix()

    // 生成鉴权串：MD5(/AppName/StreamName-ExpireTime-AuthKey)
    authString := fmt.Sprintf("/%s/%s-%d-%s", appName, streamName, expireTime, authKey)
    authToken := fmt.Sprintf("%x", md5.Sum([]byte(authString)))

    // 推流地址格式：rtmp://domain/AppName/StreamName?auth_key=ExpireTime-AuthToken
    pushURL := fmt.Sprintf("rtmp://%s/%s/%s?auth_key=%d-%s",
        domain, appName, streamName, expireTime, authToken)

    return pushURL
}

// 生成播放地址
func generatePlayURL(streamName string) string {
    domain := os.Getenv("LIVE_PLAY_DOMAIN")
    appName := "live"
    authKey := os.Getenv("LIVE_AUTH_KEY")

    expireTime := time.Now().Add(time.Hour).Unix()
    authString := fmt.Sprintf("/%s/%s.m3u8-%d-%s", appName, streamName, expireTime, authKey)
    authToken := fmt.Sprintf("%x", md5.Sum([]byte(authString)))

    // HLS播放地址
    playURL := fmt.Sprintf("https://%s/%s/%s.m3u8?auth_key=%d-%s",
        domain, appName, streamName, expireTime, authToken)

    return playURL
}

// CreateLive 创建直播
func CreateLive(c *gin.Context) {
    userID := getUserID(c)

    var req struct {
        CourseID    int    `json:"courseId" binding:"required"`
        Title       string `json:"title" binding:"required"`
        Description string `json:"description"`
        ScheduledTime string `json:"scheduledTime"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "参数错误"})
        return
    }

    // 生成唯一的流名称
    streamName := fmt.Sprintf("room_%d_%d", req.CourseID, time.Now().Unix())

    // 生成推流和播放地址
    pushURL := generatePushURL(streamName)
    playURL := generatePlayURL(streamName)

    // 保存到数据库
    result, err := database.DB.Exec(`
        INSERT INTO live_sessions (course_id, instructor_id, title, description,
            stream_name, push_url, play_url, scheduled_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, req.CourseID, userID, req.Title, req.Description,
       streamName, pushURL, playURL, req.ScheduledTime)

    if err != nil {
        c.JSON(500, gin.H{"error": "创建失败"})
        return
    }

    liveID, _ := result.LastInsertId()

    c.JSON(200, gin.H{
        "id": liveID,
        "streamName": streamName,
        "pushURL": pushURL,
        "playURL": playURL,
    })
}

// StartLive 开始直播
func StartLive(c *gin.Context) {
    liveID := c.Param("id")

    _, err := database.DB.Exec(`
        UPDATE live_sessions
        SET status = 'LIVE', started_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, liveID)

    if err != nil {
        c.JSON(500, gin.H{"error": "操作失败"})
        return
    }

    c.JSON(200, gin.H{"message": "直播已开始"})
}

// EndLive 结束直播
func EndLive(c *gin.Context) {
    liveID := c.Param("id")

    _, err := database.DB.Exec(`
        UPDATE live_sessions
        SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, liveID)

    if err != nil {
        c.JSON(500, gin.H{"error": "操作失败"})
        return
    }

    c.JSON(200, gin.H{"message": "直播已结束"})
}
```

#### 路由配置
```go
// backend/main.go
live := v1.Group("/live")
live.Use(middleware.AuthMiddleware())
{
    live.POST("", handlers.CreateLive)
    live.GET("", handlers.GetLiveList)
    live.GET("/:id", handlers.GetLiveDetail)
    live.PUT("/:id/start", handlers.StartLive)
    live.PUT("/:id/end", handlers.EndLive)
    live.POST("/:id/join", handlers.JoinLive)
    live.POST("/:id/leave", handlers.LeaveLive)
}
```

#### 完成标准
- ✅ 推流地址生成正确
- ✅ 播放地址生成正确
- ✅ 直播状态管理正常
- ✅ 观看统计准确

---

### Day 13-14：直播前端实现（6小时）

#### 任务清单
- [ ] **任务13.1**：教师端直播管理
  - 文件：`frontend/src/pages/teacher/LiveManagementPage.tsx`
  - 功能：创建直播、查看直播列表、获取推流地址

- [ ] **任务13.2**：教师端直播控制
  - 文件：`frontend/src/pages/teacher/LiveStreamPage.tsx`
  - 功能：开始/结束直播、查看观看人数、推流指导

- [ ] **任务13.3**：学生端观看直播
  - 文件：`frontend/src/pages/student/WatchLivePage.tsx`
  - 功能：观看直播、查看在线人数

- [ ] **任务13.4**：集成播放器
  - 安装：`npm install video.js`
  - 或使用阿里云播放器：`aliplayer-min.js`

#### 教师端：推流指导页面
```tsx
// frontend/src/pages/teacher/LiveStreamPage.tsx
import React, { useState, useEffect } from 'react'
import { Button, Card, Steps, Typography, message } from 'antd'
import { liveService } from '@/services/liveService'

const { Title, Paragraph, Text } = Typography

export const LiveStreamPage: React.FC = () => {
  const [liveInfo, setLiveInfo] = useState<any>(null)
  const [isLive, setIsLive] = useState(false)

  const startLive = async () => {
    try {
      await liveService.startLive(liveInfo.id)
      setIsLive(true)
      message.success('直播已开始')
    } catch (error) {
      message.error('开始直播失败')
    }
  }

  const endLive = async () => {
    try {
      await liveService.endLive(liveInfo.id)
      setIsLive(false)
      message.success('直播已结束')
    } catch (error) {
      message.error('结束直播失败')
    }
  }

  return (
    <div className="live-stream-page">
      <Card>
        <Title level={2}>直播推流</Title>

        <Steps
          current={isLive ? 1 : 0}
          items={[
            { title: '配置推流' },
            { title: '正在直播' },
            { title: '直播结束' },
          ]}
        />

        <div style={{ marginTop: 32 }}>
          <Title level={4}>第一步：使用OBS推流</Title>
          <Paragraph>
            1. 下载并安装 OBS Studio：
            <a href="https://obsproject.com/" target="_blank"> https://obsproject.com/</a>
          </Paragraph>

          <Paragraph>
            2. 打开 OBS，点击"设置" → "推流"
          </Paragraph>

          <Paragraph>
            3. 服务选择"自定义"，配置如下：
          </Paragraph>

          <Card style={{ background: '#f5f5f5' }}>
            <Paragraph>
              <Text strong>推流地址（服务器）：</Text><br />
              <Text code copyable>{liveInfo?.pushURL?.split('/').slice(0, -1).join('/')}</Text>
            </Paragraph>
            <Paragraph>
              <Text strong>推流密钥（串流密钥）：</Text><br />
              <Text code copyable>{liveInfo?.pushURL?.split('/').pop()}</Text>
            </Paragraph>
          </Card>

          <Title level={4}>第二步：开始推流</Title>
          <Paragraph>
            1. 在OBS中添加场景和来源（摄像头、屏幕等）<br />
            2. 点击OBS的"开始推流"按钮<br />
            3. 等待连接成功后，点击下方按钮
          </Paragraph>

          <Button
            type="primary"
            size="large"
            onClick={startLive}
            disabled={isLive}
          >
            开始直播
          </Button>

          {isLive && (
            <Button
              danger
              size="large"
              onClick={endLive}
              style={{ marginLeft: 16 }}
            >
              结束直播
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
```

#### 学生端：观看直播页面
```tsx
// frontend/src/pages/student/WatchLivePage.tsx
import React, { useEffect, useRef, useState } from 'react'
import { Card, Badge, Typography } from 'antd'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

const { Title } = Typography

export const WatchLivePage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const [viewersCount, setViewersCount] = useState(0)
  const [liveInfo, setLiveInfo] = useState<any>(null)

  useEffect(() => {
    // 获取直播信息
    fetchLiveInfo()

    // 初始化播放器
    if (videoRef.current && liveInfo?.playURL) {
      playerRef.current = videojs(videoRef.current, {
        autoplay: true,
        controls: true,
        sources: [{
          src: liveInfo.playURL,
          type: 'application/x-mpegURL' // HLS格式
        }]
      })
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
      }
    }
  }, [liveInfo])

  return (
    <div className="watch-live-page">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Title level={2}>{liveInfo?.title}</Title>
          <Badge
            status="processing"
            text={`${viewersCount} 人正在观看`}
          />
        </div>

        <div className="video-container">
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered"
            style={{ width: '100%', height: '600px' }}
          />
        </div>
      </Card>
    </div>
  )
}
```

#### API Service
```typescript
// frontend/src/services/liveService.ts
import api from './api'

export const liveService = {
  // 创建直播
  createLive: async (data: any) => {
    return await api.post('/live', data)
  },

  // 获取直播列表
  getLiveList: async () => {
    return await api.get('/live')
  },

  // 获取直播详情
  getLiveDetail: async (id: number) => {
    return await api.get(`/live/${id}`)
  },

  // 开始直播
  startLive: async (id: number) => {
    return await api.put(`/live/${id}/start`)
  },

  // 结束直播
  endLive: async (id: number) => {
    return await api.put(`/live/${id}/end`)
  },

  // 加入直播
  joinLive: async (id: number) => {
    return await api.post(`/live/${id}/join`)
  },

  // 离开直播
  leaveLive: async (id: number) => {
    return await api.post(`/live/${id}/leave`)
  },
}
```

#### 完成标准
- ✅ 教师可以创建直播
- ✅ 教师可以获取推流地址
- ✅ 学生可以观看直播
- ✅ 观看人数统计正常
- ✅ 播放器正常工作

---

### Week 2 验收标准

**功能验收**：
- ✅ 直播推流功能完整
- ✅ 学生可以正常观看
- ✅ 直播状态管理正常
- ✅ 观看统计准确

**技术指标**：
- ✅ 直播延迟 < 5秒
- ✅ 播放流畅，无卡顿
- ✅ 推流地址生成正确

**预期完成度**：**90%**

---

## 第三周：互动功能（Day 15-21）

### 🎯 Week 3 目标
实现直播聊天室和课程讨论区，增强师生互动。

---

### Day 15-17：简化版聊天室（7-8小时）

#### 采用方案
**HTTP轮询代替WebSocket**（简化方案）

**为什么不用WebSocket？**
- 时间限制，WebSocket实现复杂
- HTTP轮询足够演示使用
- 后续可升级为WebSocket

#### 数据库设计
```sql
-- 直播聊天消息表
CREATE TABLE live_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    live_session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (live_session_id) REFERENCES live_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_live_messages_session ON live_messages(live_session_id, created_at);
```

#### 任务清单
- [ ] **任务15.1**：创建聊天消息接口
  - 文件：`backend/handlers/live_chat.go`
  - `GET /api/v1/live/:id/messages` - 获取消息
  - `POST /api/v1/live/:id/messages` - 发送消息

- [ ] **任务15.2**：实现消息轮询逻辑
  - 支持增量获取（传入 `since` 参数）
  - 支持分页（最新50条）

- [ ] **任务15.3**：前端聊天UI组件
  - 文件：`frontend/src/components/LiveChat.tsx`
  - 消息列表、发送框、滚动加载

- [ ] **任务15.4**：集成到直播页面
  - 学生端和教师端都可以发送消息
  - 每2秒轮询一次新消息

#### 后端代码
```go
// backend/handlers/live_chat.go
package handlers

import (
    "github.com/gin-gonic/gin"
    "time"
)

// GetLiveMessages 获取直播消息
func GetLiveMessages(c *gin.Context) {
    liveID := c.Param("id")
    since := c.Query("since") // 获取此时间之后的消息

    query := `
        SELECT m.id, m.content, m.created_at,
               u.id as user_id, u.username, u.avatar_url
        FROM live_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.live_session_id = ?
    `

    args := []interface{}{liveID}

    if since != "" {
        query += " AND m.created_at > ?"
        args = append(args, since)
    }

    query += " ORDER BY m.created_at DESC LIMIT 50"

    rows, err := database.DB.Query(query, args...)
    if err != nil {
        c.JSON(500, gin.H{"error": "查询失败"})
        return
    }
    defer rows.Close()

    messages := []map[string]interface{}{}
    for rows.Next() {
        var msg struct {
            ID        int
            Content   string
            CreatedAt time.Time
            UserID    int
            Username  string
            AvatarURL string
        }

        rows.Scan(&msg.ID, &msg.Content, &msg.CreatedAt,
            &msg.UserID, &msg.Username, &msg.AvatarURL)

        messages = append(messages, map[string]interface{}{
            "id": msg.ID,
            "content": msg.Content,
            "createdAt": msg.CreatedAt,
            "user": map[string]interface{}{
                "id": msg.UserID,
                "username": msg.Username,
                "avatarUrl": msg.AvatarURL,
            },
        })
    }

    c.JSON(200, messages)
}

// SendLiveMessage 发送直播消息
func SendLiveMessage(c *gin.Context) {
    liveID := c.Param("id")
    userID := getUserID(c)

    var req struct {
        Content string `json:"content" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "参数错误"})
        return
    }

    _, err := database.DB.Exec(`
        INSERT INTO live_messages (live_session_id, user_id, content)
        VALUES (?, ?, ?)
    `, liveID, userID, req.Content)

    if err != nil {
        c.JSON(500, gin.H{"error": "发送失败"})
        return
    }

    c.JSON(200, gin.H{"message": "发送成功"})
}
```

#### 前端聊天组件
```tsx
// frontend/src/components/LiveChat.tsx
import React, { useState, useEffect, useRef } from 'react'
import { Input, Button, List, Avatar } from 'antd'
import { liveService } from '@/services/liveService'

interface Message {
  id: number
  content: string
  createdAt: string
  user: {
    id: number
    username: string
    avatarUrl: string
  }
}

export const LiveChat: React.FC<{ liveId: number }> = ({ liveId }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [lastTimestamp, setLastTimestamp] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 轮询获取新消息
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const newMessages = await liveService.getMessages(liveId, lastTimestamp)
        if (newMessages.length > 0) {
          setMessages(prev => [...newMessages.reverse(), ...prev])
          setLastTimestamp(newMessages[0].createdAt)
        }
      } catch (error) {
        console.error('获取消息失败', error)
      }
    }

    // 立即获取一次
    fetchMessages()

    // 每2秒轮询一次
    const interval = setInterval(fetchMessages, 2000)

    return () => clearInterval(interval)
  }, [liveId, lastTimestamp])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!inputValue.trim()) return

    try {
      await liveService.sendMessage(liveId, inputValue)
      setInputValue('')
    } catch (error) {
      message.error('发送失败')
    }
  }

  return (
    <div className="live-chat" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item key={msg.id}>
              <List.Item.Meta
                avatar={<Avatar src={msg.user.avatarUrl} />}
                title={msg.user.username}
                description={msg.content}
              />
            </List.Item>
          )}
        />
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
        <Input.Search
          placeholder="输入消息..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSearch={sendMessage}
          enterButton="发送"
        />
      </div>
    </div>
  )
}
```

#### 完成标准
- ✅ 聊天消息实时显示（2秒延迟）
- ✅ 发送消息正常
- ✅ 消息列表自动滚动
- ✅ UI美观易用

---

### Day 18-20：讨论区功能（7-8小时）

#### 数据库设计
```sql
-- 确认discussions表已存在
-- 如果需要，添加回复表
CREATE TABLE IF NOT EXISTS discussion_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discussion_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discussion_id) REFERENCES discussions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 任务清单
- [ ] **任务18.1**：实现讨论区CRUD接口
  - 文件：`backend/handlers/discussions.go`
  - `GET /api/v1/discussions` - 获取讨论列表
  - `POST /api/v1/discussions` - 创建讨论
  - `GET /api/v1/discussions/:id` - 获取讨论详情
  - `POST /api/v1/discussions/:id/replies` - 回复讨论

- [ ] **任务18.2**：前端讨论区列表页
  - 文件：`frontend/src/pages/student/DiscussionsPage.tsx`
  - 显示所有讨论
  - 支持搜索和筛选

- [ ] **任务18.3**：讨论详情页
  - 文件：`frontend/src/pages/student/DiscussionDetailPage.tsx`
  - 显示讨论内容和回复
  - 支持发表回复

- [ ] **任务18.4**：集成到课程详情
  - 课程详情页添加"讨论"标签页
  - 显示该课程相关讨论

#### 后端代码（精简版）
```go
// backend/handlers/discussions.go
package handlers

import (
    "github.com/gin-gonic/gin"
)

// CreateDiscussion 创建讨论
func CreateDiscussion(c *gin.Context) {
    userID := getUserID(c)

    var req struct {
        CourseID int    `json:"courseId" binding:"required"`
        Title    string `json:"title" binding:"required"`
        Content  string `json:"content" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "参数错误"})
        return
    }

    result, err := database.DB.Exec(`
        INSERT INTO discussions (course_id, user_id, title, content, status)
        VALUES (?, ?, ?, ?, 'OPEN')
    `, req.CourseID, userID, req.Title, req.Content)

    if err != nil {
        c.JSON(500, gin.H{"error": "创建失败"})
        return
    }

    id, _ := result.LastInsertId()
    c.JSON(200, gin.H{"id": id})
}

// GetDiscussions 获取讨论列表
func GetDiscussions(c *gin.Context) {
    courseID := c.Query("courseId")

    query := `
        SELECT d.id, d.title, d.content, d.status, d.created_at,
               u.id as user_id, u.username, u.avatar_url
        FROM discussions d
        JOIN users u ON d.user_id = u.id
    `

    args := []interface{}{}
    if courseID != "" {
        query += " WHERE d.course_id = ?"
        args = append(args, courseID)
    }

    query += " ORDER BY d.created_at DESC LIMIT 50"

    rows, err := database.DB.Query(query, args...)
    if err != nil {
        c.JSON(500, gin.H{"error": "查询失败"})
        return
    }
    defer rows.Close()

    discussions := []map[string]interface{}{}
    for rows.Next() {
        var d struct {
            ID        int
            Title     string
            Content   string
            Status    string
            CreatedAt string
            UserID    int
            Username  string
            AvatarURL string
        }

        rows.Scan(&d.ID, &d.Title, &d.Content, &d.Status, &d.CreatedAt,
            &d.UserID, &d.Username, &d.AvatarURL)

        discussions = append(discussions, map[string]interface{}{
            "id": d.ID,
            "title": d.Title,
            "content": d.Content,
            "status": d.Status,
            "createdAt": d.CreatedAt,
            "user": map[string]interface{}{
                "id": d.UserID,
                "username": d.Username,
                "avatarUrl": d.AvatarURL,
            },
        })
    }

    c.JSON(200, discussions)
}

// ReplyDiscussion 回复讨论
func ReplyDiscussion(c *gin.Context) {
    discussionID := c.Param("id")
    userID := getUserID(c)

    var req struct {
        Content string `json:"content" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "参数错误"})
        return
    }

    _, err := database.DB.Exec(`
        INSERT INTO discussion_replies (discussion_id, user_id, content)
        VALUES (?, ?, ?)
    `, discussionID, userID, req.Content)

    if err != nil {
        c.JSON(500, gin.H{"error": "回复失败"})
        return
    }

    c.JSON(200, gin.H{"message": "回复成功"})
}
```

#### 完成标准
- ✅ 可以创建讨论
- ✅ 可以查看讨论列表
- ✅ 可以回复讨论
- ✅ 界面友好

---

### Day 21：缓冲时间

#### 任务清单
- [ ] 处理前三周遗留问题
- [ ] 修复发现的bug
- [ ] 代码优化和重构
- [ ] 准备Week 4的工作

---

### Week 3 验收标准

**功能验收**：
- ✅ 直播聊天室可用
- ✅ 讨论区功能完整
- ✅ 师生互动流畅

**预期完成度**：**95%**

---

## 第四周：优化完善（Day 22-30）

### 🎯 Week 4 目标
提升质量，优化体验，准备演示。

---

### Day 22-24：视频管理优化（6小时）

#### 任务清单
- [ ] **任务22.1**：集成更好的视频播放器
  - 使用 Video.js 或 DPlayer
  - 支持倍速播放（0.5x, 1x, 1.5x, 2x）
  - 支持全屏

- [ ] **任务22.2**：视频封面设置
  - 上传视频时可设置封面
  - 课程列表显示封面

- [ ] **任务22.3**：播放进度保存优化
  - 优化进度上报频率
  - 断点续播功能

#### 完成标准
- ✅ 播放器功能完善
- ✅ 用户体验良好

---

### Day 25-26：UI/UX优化（5小时）

#### 任务清单
- [ ] **任务25.1**：优化移动端适配
  - 响应式布局检查
  - 移动端菜单优化

- [ ] **任务25.2**：优化加载速度
  - 图片懒加载
  - 代码分割

- [ ] **任务25.3**：添加加载动画
  - Skeleton屏幕
  - Loading动画

- [ ] **任务25.4**：错误提示优化
  - 统一错误处理
  - 友好的错误提示

#### 完成标准
- ✅ 界面美观
- ✅ 加载流畅
- ✅ 体验良好

---

### Day 27-28：全面测试（6小时）

#### 测试清单
- [ ] **功能测试**
  - [ ] 用户注册登录流程
  - [ ] 课程选课流程
  - [ ] 作业提交批改流程
  - [ ] 考试答题流程
  - [ ] 直播推流播放流程
  - [ ] 文件上传下载
  - [ ] 聊天室功能
  - [ ] 讨论区功能

- [ ] **权限测试**
  - [ ] 学生权限
  - [ ] 教师权限
  - [ ] 管理员权限
  - [ ] 未登录访问

- [ ] **性能测试**
  - [ ] 页面加载时间
  - [ ] 接口响应时间
  - [ ] 并发访问测试

- [ ] **兼容性测试**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge
  - [ ] Safari（如有Mac）

#### 测试报告模板
```markdown
# 测试报告

## 测试日期
2026-03-XX

## 测试环境
- 浏览器：Chrome 120
- 操作系统：Windows 11
- 后端：Go 1.24
- 前端：React 19

## 测试结果

### 功能测试
| 功能 | 测试结果 | 问题描述 | 严重程度 |
|------|---------|---------|---------|
| 用户登录 | ✅ 通过 | - | - |
| 课程选课 | ✅ 通过 | - | - |
| ... | ... | ... | ... |

### 发现的问题
1. [P1] 直播推流地址过期时间过短
2. [P2] 移动端菜单显示异常
3. [P3] 作业列表加载较慢

### 修复计划
...
```

---

### Day 29：文档完善（3小时）

#### 任务清单
- [ ] **任务29.1**：更新README.md
  - 项目介绍
  - 功能列表
  - 技术栈
  - 安装部署

- [ ] **任务29.2**：编写部署文档
  - 本地开发环境搭建
  - 生产环境部署
  - 常见问题FAQ

- [ ] **任务29.3**：编写用户手册
  - 学生使用指南
  - 教师使用指南
  - 管理员使用指南

- [ ] **任务29.4**：准备演示PPT
  - 项目概述
  - 核心功能演示
  - 技术架构
  - 创新点

---

### Day 30：演示准备（3小时）

#### 任务清单
- [ ] **任务30.1**：准备演示数据
  - 创建演示用课程
  - 准备测试账号
  - 准备演示视频

- [ ] **任务30.2**：录制演示视频
  - 功能演示视频
  - 操作流程视频

- [ ] **任务30.3**：准备答辩材料
  - 答辩PPT
  - 技术文档
  - 项目源码

- [ ] **任务30.4**：最后检查
  - 代码格式化
  - 注释完善
  - 删除调试代码
  - 环境变量检查

---

## 技术实现方案

### 直播技术方案详解

#### 1. 阿里云直播服务
- **产品**：阿里云视频直播（ApsaraVideo Live）
- **协议**：RTMP推流 + HLS/FLV播放
- **延迟**：2-3秒
- **费用**：新用户有免费额度

#### 2. 推流方式
**教师端推流（两种方式）**：
1. **OBS推流**（推荐）
   - 下载OBS Studio
   - 配置推流地址和密钥
   - 添加摄像头/屏幕源
   - 开始推流

2. **浏览器推流**（WebRTC，可选）
   - 使用WebRTC采集摄像头
   - 转换为RTMP推流
   - 实现复杂，不推荐

#### 3. 播放方式
**学生端播放**：
- HLS格式（.m3u8）
- 使用Video.js或阿里云播放器
- 支持自适应码率

### 聊天室技术方案

#### 为什么用HTTP轮询？
- ✅ 实现简单，1-2天完成
- ✅ 不需要WebSocket服务器
- ✅ 延迟可接受（2秒）
- ✅ 足够演示使用

#### 如何优化？
1. **长轮询**：服务器等待新消息再返回
2. **增量获取**：只获取新消息，不重复
3. **消息缓存**：减少数据库查询

#### 后续升级方案
如果时间充裕，可升级为WebSocket：
- 使用 `gorilla/websocket`
- 实现实时推送
- 延迟 < 100ms

---

## 风险预案

### 风险评估

| 风险 | 可能性 | 影响 | 应对策略 |
|------|--------|------|---------|
| 直播服务配置困难 | 中 | 高 | 提前测试，准备备用方案 |
| 开发进度落后 | 高 | 中 | 采用简化方案，减少功能 |
| 技术问题无法解决 | 中 | 高 | 及时求助，寻找替代方案 |
| 服务器部署失败 | 低 | 中 | 使用本地演示 |

### Plan B：最小可演示版本

**如果到Day 20进度严重落后，启用Plan B**：

#### 保留功能（必须完成）
- ✅ 用户认证
- ✅ 课程管理
- ✅ 作业管理
- ✅ 考试管理
- ✅ 文件上传

#### 简化功能
- ⚠️ 直播功能：使用预录视频 + 定时发布模拟直播
- ⚠️ 聊天室：使用留言板代替实时聊天

#### 放弃功能
- ❌ 讨论区
- ❌ 复杂的学习进度统计

**Plan B 完成度**：**85%**（仍可答辩）

---

## 每日检查清单

### 开发前检查
- [ ] 确认今天的任务目标
- [ ] 准备好开发环境
- [ ] 拉取最新代码（如有团队协作）

### 开发中检查
- [ ] 每完成一个小功能就测试
- [ ] 遇到问题及时记录
- [ ] 代码提交前检查格式

### 开发后检查
- [ ] 功能是否达到预期
- [ ] 是否有新的bug
- [ ] 更新开发日志
- [ ] 提交代码（git commit）

### 每周检查
- [ ] 本周目标是否达成
- [ ] 完成度是否达到预期
- [ ] 下周计划是否清晰
- [ ] 是否需要调整进度

---

## 开发环境配置

### 后端环境
```bash
# Go版本
go version  # 1.24+

# 安装依赖
cd backend
go mod tidy

# 运行
go run main.go
```

### 前端环境
```bash
# Node版本
node --version  # 18+

# 安装依赖
cd frontend
npm install

# 运行
npm run dev
```

### 数据库
- SQLite 3
- 数据库文件：`backend/database/education.db`

---

## 资源链接

### 阿里云直播
- 官网：https://www.aliyun.com/product/live
- 文档：https://help.aliyun.com/product/29949.html
- Go SDK：https://github.com/aliyun/alibaba-cloud-sdk-go

### 开发工具
- OBS Studio：https://obsproject.com/
- Video.js：https://videojs.com/
- Postman：https://www.postman.com/

### 学习资源
- Go语言：https://go.dev/
- React：https://react.dev/
- Ant Design：https://ant.design/

---

## 附录：完整功能清单

### 已实现功能（70-75%）
- ✅ 用户认证（注册、登录、JWT）
- ✅ 课程管理（CRUD、选课）
- ✅ 作业管理（创建、提交、批改）
- ✅ 考试管理（创建、答题、自动判分）
- ✅ 消息通知
- ✅ 前端页面架构

### Week 1 新增功能
- ✅ 权限漏洞修复
- ✅ 文件上传（头像、附件、封面）
- ✅ 学习进度跟踪

### Week 2 新增功能
- ✅ 直播推流功能
- ✅ 直播播放功能
- ✅ 直播状态管理
- ✅ 观看统计

### Week 3 新增功能
- ✅ 直播聊天室
- ✅ 课程讨论区

### Week 4 优化
- ✅ UI/UX优化
- ✅ 性能优化
- ✅ 文档完善

---

## 总结

### 30天后的成果
- **完成度**：95%+
- **核心功能**：全部完成
- **直播功能**：完整实现
- **可演示性**：强

### 成功关键
1. **严格按计划执行**
2. **每天完成2-3小时开发**
3. **遇到问题及时解决**
4. **保持进度不拖延**

### 最终目标
✅ 一个功能完整、可演示的在线教育平台
✅ 顺利通过答辩
✅ 获得好成绩

---

**文档版本**: 1.0
**创建日期**: 2026-02-02
**最后更新**: 2026-02-02
**维护者**: 开发团队

**祝你开发顺利！加油！💪**

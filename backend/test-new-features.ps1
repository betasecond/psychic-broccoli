# 测试新增的CRUD功能
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  测试新增CRUD功能" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8080"

# 1. 登录获取token
Write-Host "1️⃣  登录教师账号..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "instructor"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $response.data.accessToken
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    Write-Host "   ✅ 登录成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 登录失败" -ForegroundColor Red
    exit
}

Write-Host ""

# 2. 测试更新作业
Write-Host "2️⃣  测试更新作业..." -ForegroundColor Yellow
try {
    $updateData = @{
        courseId = 1
        title = "Go语言基础练习（已更新）"
        content = "更新后的作业内容"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/assignments/1" -Method Put -Body $updateData -ContentType "application/json" -Headers $headers
    Write-Host "   ✅ 更新作业成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 更新作业失败: $_" -ForegroundColor Red
}

Write-Host ""

# 3. 测试更新考试
Write-Host "3️⃣  测试更新考试..." -ForegroundColor Yellow
try {
    $updateExamData = @{
        courseId = 1
        title = "Go语言基础测试（已更新）"
        startTime = "2025-10-26T10:00:00Z"
        endTime = "2025-11-02T10:00:00Z"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/exams/1" -Method Put -Body $updateExamData -ContentType "application/json" -Headers $headers
    Write-Host "   ✅ 更新考试成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 更新考试失败: $_" -ForegroundColor Red
}

Write-Host ""

# 4. 测试更新章节
Write-Host "4️⃣  测试更新章节..." -ForegroundColor Yellow
try {
    $updateChapterData = @{
        title = "Go语言基础（已更新）"
        orderIndex = 1
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/courses/1/chapters/1" -Method Put -Body $updateChapterData -ContentType "application/json" -Headers $headers
    Write-Host "   ✅ 更新章节成功" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 更新章节失败: $_" -ForegroundColor Red
}

Write-Host ""

# 5. 测试下载用户导入模板（管理员）
Write-Host "5️⃣  测试下载用户导入模板..." -ForegroundColor Yellow
Write-Host "   请使用管理员账号登录后，访问以下地址下载模板：" -ForegroundColor Cyan
Write-Host "   $baseUrl/api/v1/auth/user-template" -ForegroundColor White
Write-Host "   （需要在浏览器中登录后访问，或使用管理员token）" -ForegroundColor Gray

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  测试完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 新增API端点:" -ForegroundColor Yellow
Write-Host ""
Write-Host "作业管理:" -ForegroundColor Cyan
Write-Host "  PUT    /api/v1/assignments/:id - 更新作业" -ForegroundColor White
Write-Host "  DELETE /api/v1/assignments/:id - 删除作业" -ForegroundColor White
Write-Host ""
Write-Host "考试管理:" -ForegroundColor Cyan
Write-Host "  PUT    /api/v1/exams/:id - 更新考试" -ForegroundColor White
Write-Host "  DELETE /api/v1/exams/:id - 删除考试" -ForegroundColor White
Write-Host "  PUT    /api/v1/exams/:id/questions/:qid - 更新题目" -ForegroundColor White
Write-Host "  DELETE /api/v1/exams/:id/questions/:qid - 删除题目" -ForegroundColor White
Write-Host ""
Write-Host "章节管理:" -ForegroundColor Cyan
Write-Host "  PUT    /api/v1/courses/:id/chapters/:cid - 更新章节" -ForegroundColor White
Write-Host "  DELETE /api/v1/courses/:id/chapters/:cid - 删除章节" -ForegroundColor White
Write-Host ""
Write-Host "用户批量导入:" -ForegroundColor Cyan
Write-Host "  POST   /api/v1/auth/import-users - 批量导入用户（管理员）" -ForegroundColor White
Write-Host "  GET    /api/v1/auth/user-template - 下载导入模板（管理员）" -ForegroundColor White
Write-Host ""


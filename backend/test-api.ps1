# 测试后端API
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  API 测试脚本" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8081"

# 测试健康检查
Write-Host "1️⃣  测试健康检查..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "   ✅ 健康检查通过" -ForegroundColor Green
    Write-Host "   响应: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 健康检查失败: $_" -ForegroundColor Red
    Write-Host "   请确保服务器已启动 (运行 start-background.ps1)" -ForegroundColor Yellow
    exit
}

Write-Host ""

# 测试用户注册
Write-Host "2️⃣  测试用户注册..." -ForegroundColor Yellow
try {
    $registerData = @{
        username = "testuser"
        password = "test123456"
        confirmPassword = "test123456"
        role = "STUDENT"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method Post -Body $registerData -ContentType "application/json"
    Write-Host "   ✅ 注册成功" -ForegroundColor Green
    Write-Host "   响应: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   ⚠️  用户可能已存在（正常）" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ 注册失败: $_" -ForegroundColor Red
    }
}

Write-Host ""

# 测试用户登录
Write-Host "3️⃣  测试用户登录..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "student"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "   ✅ 登录成功" -ForegroundColor Green
    
    $token = $response.data.accessToken
    $user = $response.data.user
    Write-Host "   用户: $($user.username) ($($user.role))" -ForegroundColor Cyan
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray

    # 保存token用于后续测试
    $global:authToken = $token
} catch {
    Write-Host "   ❌ 登录失败: $_" -ForegroundColor Red
    exit
}

Write-Host ""

# 测试获取课程列表
Write-Host "4️⃣  测试获取课程列表..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/courses" -Method Get
    Write-Host "   ✅ 获取课程列表成功" -ForegroundColor Green
    Write-Host "   课程数量: $($response.data.total)" -ForegroundColor Cyan
    
    if ($response.data.courses.Count -gt 0) {
        Write-Host "   第一门课程: $($response.data.courses[0].title)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ 获取课程列表失败: $_" -ForegroundColor Red
}

Write-Host ""

# 测试获取分类
Write-Host "5️⃣  测试获取课程分类..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/categories" -Method Get
    Write-Host "   ✅ 获取分类成功" -ForegroundColor Green
    Write-Host "   分类数量: $($response.data.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ 获取分类失败: $_" -ForegroundColor Red
}

Write-Host ""

# 测试获取当前用户信息（需要认证）
Write-Host "6️⃣  测试获取当前用户信息（需要认证）..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $global:authToken"
    }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/me" -Method Get -Headers $headers
    Write-Host "   ✅ 获取用户信息成功" -ForegroundColor Green
    Write-Host "   用户: $($response.data.username) (ID: $($response.data.userId))" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ 获取用户信息失败: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  测试完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 测试账号:" -ForegroundColor Yellow
Write-Host "   学生: student / password123" -ForegroundColor White
Write-Host "   教师: instructor / password123" -ForegroundColor White
Write-Host "   管理员: admin / password123" -ForegroundColor White
Write-Host ""


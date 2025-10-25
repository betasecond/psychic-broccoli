# 测试后端API
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  后端API测试" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8080"

# 测试健康检查
Write-Host "1️⃣  测试健康检查..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 5
    Write-Host "   ✅ 健康检查通过" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 健康检查失败" -ForegroundColor Red
    Write-Host "   请确保后端已启动: .\start-all.ps1" -ForegroundColor Yellow
    exit
}

Write-Host ""

# 测试登录
Write-Host "2️⃣  测试用户登录..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "student"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "   ✅ 登录成功" -ForegroundColor Green
    Write-Host "   用户: $($response.data.user.username) ($($response.data.user.role))" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ 登录失败: $_" -ForegroundColor Red
}

Write-Host ""

# 测试课程列表
Write-Host "3️⃣  测试获取课程列表..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/courses" -Method Get
    Write-Host "   ✅ 获取成功" -ForegroundColor Green
    Write-Host "   课程数量: $($response.data.total)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ 获取失败: $_" -ForegroundColor Red
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
Write-Host "📚 后端地址: http://localhost:8080" -ForegroundColor Cyan
Write-Host "📚 API文档: http://localhost:8080/api/v1" -ForegroundColor Cyan
Write-Host ""


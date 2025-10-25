# 完整重启脚本 - 重置数据库并重启服务
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  教育平台 - 重置数据库并重启服务" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 停止所有服务
Write-Host "🛑 正在停止所有服务..." -ForegroundColor Yellow
& ".\stop-all.ps1"
Start-Sleep -Seconds 2

# 2. 删除旧数据库
Write-Host ""
Write-Host "🗑️  正在删除旧数据库..." -ForegroundColor Yellow
if (Test-Path "backend/database/education.db") {
    Remove-Item "backend/database/education.db" -Force
    Write-Host "  ✓ 数据库文件已删除" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  数据库文件不存在" -ForegroundColor Cyan
}

# 3. 重新编译后端
Write-Host ""
Write-Host "🔨 正在重新编译后端..." -ForegroundColor Yellow
Set-Location backend
go build -o server.exe
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ 后端编译成功" -ForegroundColor Green
} else {
    Write-Host "  ✗ 后端编译失败" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# 4. 启动所有服务
Write-Host ""
Write-Host "🚀 正在启动所有服务..." -ForegroundColor Yellow
Write-Host "  启动后端服务（会自动创建数据库并填充测试数据）..." -ForegroundColor Cyan
Start-Sleep -Seconds 1

& ".\start-all.ps1"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ 重启完成！" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 测试账号信息:" -ForegroundColor Yellow
Write-Host "  学生: student / password123" -ForegroundColor White
Write-Host "  教师: instructor / password123" -ForegroundColor White
Write-Host "  管理员: admin / password123" -ForegroundColor White
Write-Host ""
Write-Host "🌐 访问地址:" -ForegroundColor Yellow
Write-Host "  前端: http://localhost:5173" -ForegroundColor White
Write-Host "  后端: http://localhost:8080" -ForegroundColor White
Write-Host ""


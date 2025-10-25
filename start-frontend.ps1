# 启动前端开发服务器
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  启动前端开发服务器" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 检查.env文件
if (-not (Test-Path "frontend\.env")) {
    Write-Host "⚠️  未找到.env文件，正在创建..." -ForegroundColor Yellow
    & .\setup-frontend.ps1
}

# 切换到frontend目录
Set-Location frontend

Write-Host "🚀 正在启动前端开发服务器..." -ForegroundColor Green
Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Yellow
Write-Host "   - 前端会在浏览器自动打开" -ForegroundColor White
Write-Host "   - 按 Ctrl+C 可停止服务器" -ForegroundColor White
Write-Host "   - 修改代码会自动热重载" -ForegroundColor White
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 启动前端
npm run dev

# 返回项目根目录
Set-Location ..


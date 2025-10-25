# 一键启动前后端
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  在线教育平台 - 一键启动" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. 配置前端环境（如果还没配置）
if (-not (Test-Path "frontend\.env")) {
    Write-Host "📝 首次运行，正在配置前端环境..." -ForegroundColor Yellow
    & .\setup-frontend.ps1
}

# 2. 检查并启动后端
Write-Host "🚀 启动后端服务器..." -ForegroundColor Green
$backendProcess = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($backendProcess) {
    Write-Host "   ⚠️  后端已在运行 (PID: $($backendProcess.Id))" -ForegroundColor Yellow
} else {
    Set-Location backend
    $currentDir = Get-Location
    Start-Process -FilePath "$currentDir\server.exe" -WorkingDirectory $currentDir -WindowStyle Hidden
    Set-Location ..
    Start-Sleep -Seconds 2
    
    $newProcess = Get-Process -Name "server" -ErrorAction SilentlyContinue
    if ($newProcess) {
        Write-Host "   ✅ 后端已启动 (PID: $($newProcess.Id))" -ForegroundColor Green
        Write-Host "   📍 后端地址: http://localhost:8080" -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ 后端启动失败" -ForegroundColor Red
    }
}

Write-Host ""

# 3. 提示用户启动前端
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  下一步操作" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "请打开新的PowerShell窗口，运行以下命令启动前端：" -ForegroundColor Yellow
Write-Host ""
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "或者运行：" -ForegroundColor Yellow
Write-Host "   .\start-frontend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 测试后端API: 运行 .\test-backend.ps1" -ForegroundColor Yellow
Write-Host "💡 停止后端: 运行 .\stop-all.ps1" -ForegroundColor Yellow
Write-Host ""


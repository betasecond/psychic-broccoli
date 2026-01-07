# 启动Go后端服务器
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  在线教育平台 - 后端服务器" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已有进程在运行
$existingProcess = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "⚠️  检测到已有server进程在运行" -ForegroundColor Yellow
    Write-Host "   PID: $($existingProcess.Id)" -ForegroundColor Yellow
    $response = Read-Host "是否要停止旧进程并启动新的？ (y/n)"
    if ($response -eq 'y') {
        Stop-Process -Name "server" -Force
        Write-Host "✓ 已停止旧进程" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } else {
        Write-Host "❌ 取消启动" -ForegroundColor Red
        exit
    }
}

# 确保database目录存在
if (-not (Test-Path "database")) {
    New-Item -ItemType Directory -Name "database" | Out-Null
    Write-Host "✓ 已创建database目录" -ForegroundColor Green
}

# 启动服务器
Write-Host ""
Write-Host "🚀 正在启动后端服务器..." -ForegroundColor Green
Write-Host "📍 监听地址: http://localhost:8080" -ForegroundColor Cyan
Write-Host "📚 API基础路径: http://localhost:8080/api/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Yellow
Write-Host "   - 按 Ctrl+C 可停止服务器" -ForegroundColor White
Write-Host "   - 或运行 stop-server.ps1 停止" -ForegroundColor White
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 运行服务器
.\server.exe


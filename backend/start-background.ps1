# 在后台启动Go后端服务器
Write-Host "🚀 正在后台启动后端服务器..." -ForegroundColor Green

# 检查是否已有进程在运行
$existingProcess = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "⚠️  检测到已有server进程在运行 (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    Write-Host "   请先运行 stop-server.ps1 停止旧进程" -ForegroundColor Yellow
    exit
}

# 确保database目录存在
if (-not (Test-Path "database")) {
    New-Item -ItemType Directory -Name "database" | Out-Null
}

# 获取当前目录
$currentDir = Get-Location

# 后台启动服务器
Start-Process -FilePath "$currentDir\server.exe" -WorkingDirectory $currentDir -WindowStyle Hidden

# 等待进程启动
Start-Sleep -Seconds 2

# 检查进程是否成功启动
$process = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "✅ 服务器已在后台启动！" -ForegroundColor Green
    Write-Host "   PID: $($process.Id)" -ForegroundColor Cyan
    Write-Host "   监听地址: http://localhost:8080" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 运行 test-api.ps1 测试API" -ForegroundColor Yellow
    Write-Host "💡 运行 stop-server.ps1 停止服务器" -ForegroundColor Yellow
} else {
    Write-Host "❌ 服务器启动失败，请查看日志" -ForegroundColor Red
}


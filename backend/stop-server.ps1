# 停止后端服务器
Write-Host "🛑 正在停止后端服务器..." -ForegroundColor Yellow

$process = Get-Process -Name "server" -ErrorAction SilentlyContinue

if ($process) {
    Stop-Process -Name "server" -Force
    Write-Host "✅ 服务器已停止 (PID: $($process.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  没有检测到运行中的server进程" -ForegroundColor Yellow
}


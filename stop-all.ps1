# 停止所有服务
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  停止所有服务" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 停止后端
Write-Host "🛑 停止后端服务器..." -ForegroundColor Yellow
$backendProcess = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($backendProcess) {
    Stop-Process -Name "server" -Force
    Write-Host "   ✅ 后端已停止 (PID: $($backendProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  没有运行中的后端进程" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ 所有服务已停止" -ForegroundColor Green
Write-Host ""
Write-Host "💡 前端开发服务器请在其终端窗口按 Ctrl+C 停止" -ForegroundColor Yellow
Write-Host ""


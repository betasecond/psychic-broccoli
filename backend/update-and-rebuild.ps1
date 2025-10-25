# 更新依赖并重新编译
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  更新后端代码" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. 停止运行中的服务器
Write-Host "🛑 停止运行中的服务器..." -ForegroundColor Yellow
$process = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Name "server" -Force
    Write-Host "   ✅ 服务器已停止" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  没有运行中的服务器" -ForegroundColor Yellow
}

Write-Host ""

# 2. 安装Excel处理库
Write-Host "📦 安装excelize库（Excel处理）..." -ForegroundColor Yellow
go get github.com/xuri/excelize/v2
Write-Host "   ✅ 依赖安装完成" -ForegroundColor Green

Write-Host ""

# 3. 重新编译
Write-Host "🔨 重新编译服务器..." -ForegroundColor Yellow
go build -o server.exe main.go

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 编译成功" -ForegroundColor Green
} else {
    Write-Host "   ❌ 编译失败" -ForegroundColor Red
    exit
}

Write-Host ""

# 4. 启动服务器
Write-Host "🚀 启动服务器..." -ForegroundColor Green
$currentDir = Get-Location
Start-Process -FilePath "$currentDir\server.exe" -WorkingDirectory $currentDir -WindowStyle Hidden
Start-Sleep -Seconds 2

$newProcess = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($newProcess) {
    Write-Host "   ✅ 服务器已启动 (PID: $($newProcess.Id))" -ForegroundColor Green
    Write-Host "   📍 后端地址: http://localhost:8081" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ 服务器启动失败" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  更新完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 新增功能:" -ForegroundColor Yellow
Write-Host "   - 作业的更新和删除 (PUT/DELETE /api/v1/assignments/:id)" -ForegroundColor White
Write-Host "   - 考试的更新和删除 (PUT/DELETE /api/v1/exams/:id)" -ForegroundColor White
Write-Host "   - 题目的更新和删除 (PUT/DELETE /api/v1/exams/:id/questions/:qid)" -ForegroundColor White
Write-Host "   - 章节的更新和删除 (PUT/DELETE /api/v1/courses/:id/chapters/:cid)" -ForegroundColor White
Write-Host "   - Excel批量导入用户 (POST /api/v1/auth/import-users)" -ForegroundColor White
Write-Host "   - 下载导入模板 (GET /api/v1/auth/user-template)" -ForegroundColor White
Write-Host ""
Write-Host "💡 运行 .\test-new-features.ps1 测试新功能" -ForegroundColor Yellow
Write-Host ""


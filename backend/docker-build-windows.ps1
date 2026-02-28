# 使用Docker编译Windows版本的后端
# 支持SQLite (CGO)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  使用Docker编译后端" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. 停止运行中的服务器
Write-Host "🛑 停止运行中的服务器..." -ForegroundColor Yellow
$process = Get-Process -Name "server" -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Name "server" -Force
    Write-Host "   ✅ 服务器已停止" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  没有运行中的服务器" -ForegroundColor Gray
}

Write-Host ""

# 2. 使用Docker编译
Write-Host "🔨 使用Docker编译Windows版本..." -ForegroundColor Yellow

# 使用golang容器，安装mingw-w64来支持CGO交叉编译到Windows
$dockerCmd = "docker run --rm -v `"${PWD}:/app`" -w /app golang:1.24-alpine sh -c `"apk add --no-cache gcc musl-dev sqlite-dev mingw-w64-gcc; export CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc; go build -ldflags='-w -s' -o server.exe main.go`""
Invoke-Expression $dockerCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 编译成功！" -ForegroundColor Green
} else {
    Write-Host "   ❌ 编译失败" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. 检查编译结果
if (Test-Path "server.exe") {
    $fileInfo = Get-Item "server.exe"
    Write-Host "📦 编译结果:" -ForegroundColor Cyan
    Write-Host "   文件: server.exe" -ForegroundColor White
    Write-Host "   大小: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor White
    Write-Host "   时间: $($fileInfo.LastWriteTime)" -ForegroundColor White
} else {
    Write-Host "   ❌ 未找到编译文件" -ForegroundColor Red
    exit 1
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
    Write-Host "   📍 后端地址: http://localhost:8080" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ 服务器启动失败" -ForegroundColor Red
    Write-Host "   💡 请手动运行: .\server.exe" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  编译完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 权限修复已应用:" -ForegroundColor Yellow
Write-Host "   - 学生只能查看自己的作业提交记录" -ForegroundColor White
Write-Host "   - 学生只能看到已发布的课程" -ForegroundColor White
Write-Host "   - 学生只能查看已选课程的作业列表" -ForegroundColor White
Write-Host ""

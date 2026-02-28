# 简单的Docker编译脚本

Write-Host "停止旧服务器..." -ForegroundColor Yellow
Get-Process -Name "server" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "使用Docker编译..." -ForegroundColor Yellow

docker run --rm `
    -v "${PWD}:/app" `
    -w /app `
    golang:1.24-alpine `
    sh -c 'apk add --no-cache gcc musl-dev sqlite-dev mingw-w64-gcc && export CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc && go build -ldflags="-w -s" -o server.exe main.go'

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 编译成功！" -ForegroundColor Green

    # 显示文件信息
    $file = Get-Item "server.exe"
    Write-Host "文件大小: $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "修改时间: $($file.LastWriteTime)" -ForegroundColor Cyan

    # 启动服务器
    Write-Host "启动服务器..." -ForegroundColor Green
    Start-Process -FilePath ".\server.exe" -WindowStyle Hidden
    Start-Sleep -Seconds 2

    $proc = Get-Process -Name "server" -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "✅ 服务器已启动 (PID: $($proc.Id))" -ForegroundColor Green
    } else {
        Write-Host "❌ 启动失败" -ForegroundColor Red
    }
} else {
    Write-Host "❌ 编译失败" -ForegroundColor Red
}

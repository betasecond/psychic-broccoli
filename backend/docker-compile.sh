#!/bin/bash
cd /e/biyesheji/psychic-broccoli/backend

echo "开始使用 Docker 编译后端..."

# 使用 PowerShell 执行 Docker 命令
powershell.exe -Command "
Set-Location 'E:\biyesheji\psychic-broccoli\backend'
Write-Host 'Compiling with Docker...' -ForegroundColor Yellow
docker run --rm -v \"`${PWD}:/app\" -w /app golang:1.24-alpine sh -c 'apk add --no-cache gcc musl-dev sqlite-dev && go build -ldflags=\"-w -s\" -o server-linux main.go'
if (`$LASTEXITCODE -eq 0) {
    Write-Host 'Compilation successful!' -ForegroundColor Green
    exit 0
} else {
    Write-Host 'Compilation failed!' -ForegroundColor Red
    exit 1
}
"

if [ $? -eq 0 ]; then
    echo "✅ 编译成功！"
    ls -lh server-linux
else
    echo "❌ 编译失败！"
    exit 1
fi

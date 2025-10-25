# 启动Go后端服务器
Write-Host "🚀 正在启动后端服务器..." -ForegroundColor Green

# 确保database目录存在
if (-not (Test-Path "database")) {
    New-Item -ItemType Directory -Name "database" | Out-Null
}

# 运行服务器
.\server.exe


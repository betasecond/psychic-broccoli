# 重置数据库脚本
Write-Host "🗑️  正在删除旧数据库..." -ForegroundColor Yellow

# 删除数据库文件
if (Test-Path "database/education.db") {
    Remove-Item "database/education.db" -Force
    Write-Host "  ✓ 数据库文件已删除" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  数据库文件不存在，跳过删除" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🔄 正在重新生成数据库..." -ForegroundColor Yellow
Write-Host ""

# 运行Go程序，会自动创建数据库并填充数据
go run main.go


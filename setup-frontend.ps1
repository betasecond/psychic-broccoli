# 配置前端环境
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  前端环境配置" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 切换到frontend目录
Set-Location frontend

# 创建.env文件
$envContent = "# 开发环境配置`nVITE_API_BASE_URL=http://localhost:8080/api/v1"

Write-Host "📝 创建.env文件..." -ForegroundColor Yellow
$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "   ✅ .env文件已创建" -ForegroundColor Green

# 创建.env.development文件
Write-Host "📝 创建.env.development文件..." -ForegroundColor Yellow
$envContent | Out-File -FilePath ".env.development" -Encoding utf8
Write-Host "   ✅ .env.development文件已创建" -ForegroundColor Green

Write-Host ""
Write-Host "✅ 前端环境配置完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📚 API地址已设置为: http://localhost:8080/api/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 下一步: 运行 npm run dev 启动前端开发服务器" -ForegroundColor Yellow
Write-Host ""

# 返回项目根目录
Set-Location ..


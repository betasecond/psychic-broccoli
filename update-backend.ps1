# 更新后端并重新编译
Write-Host "🚀 更新后端代码并重新编译..." -ForegroundColor Green
Write-Host ""

# 切换到backend目录
Set-Location backend

# 运行更新脚本
& .\update-and-rebuild.ps1

# 返回项目根目录
Set-Location ..

Write-Host ""
Write-Host "✅ 更新完成！" -ForegroundColor Green
Write-Host ""
Write-Host "💡 前端也已更新，添加了 userService.ts" -ForegroundColor Yellow
Write-Host "💡 可以在前端调用以下方法：" -ForegroundColor Yellow
Write-Host "   - userService.importUsersFromExcel(file) - 批量导入用户" -ForegroundColor White
Write-Host "   - userService.triggerDownloadTemplate() - 下载导入模板" -ForegroundColor White
Write-Host ""


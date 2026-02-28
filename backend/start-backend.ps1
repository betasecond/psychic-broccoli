# Start backend container
Set-Location "E:\biyesheji\psychic-broccoli\backend"

Write-Host "Starting backend container..." -ForegroundColor Yellow
docker run -d `
    --name psychic-backend `
    -p 8080:8080 `
    -v "${PWD}:/app" `
    -w /app `
    -e DB_PATH=/app/database/education.db `
    -e JWT_SECRET=your-secret-key-change-in-production `
    -e GIN_MODE=release `
    golang:1.24-alpine `
    sh -c "apk add --no-cache sqlite-dev && ./server-linux"

Start-Sleep -Seconds 3

# Check if running
$container = docker ps | Select-String "psychic-backend"
if ($container) {
    Write-Host "`n====================================" -ForegroundColor Green
    Write-Host "Backend is running!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "`nURL: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "`nLogs:" -ForegroundColor Yellow
    docker logs psychic-backend
} else {
    Write-Host "Failed to start container!" -ForegroundColor Red
    Write-Host "Checking logs..." -ForegroundColor Yellow
    docker logs psychic-backend
    exit 1
}

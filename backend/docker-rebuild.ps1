# Stop and remove old container
Write-Host "Stopping old container..." -ForegroundColor Yellow
docker stop psychic-backend 2>$null
docker rm psychic-backend 2>$null

# Compile
Write-Host "Compiling Go code..." -ForegroundColor Yellow
Set-Location "E:\biyesheji\psychic-broccoli\backend"
docker run --rm -v "${PWD}:/app" -w /app golang:1.24-alpine sh -c "apk add --no-cache gcc musl-dev sqlite-dev && go build -ldflags='-w -s' -o server-linux main.go"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Compilation successful!" -ForegroundColor Green

# Start container
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
} else {
    Write-Host "Failed to start container!" -ForegroundColor Red
    Write-Host "Checking logs..." -ForegroundColor Yellow
    docker logs psychic-backend
    exit 1
}

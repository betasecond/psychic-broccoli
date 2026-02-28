Set-Location "E:\biyesheji\psychic-broccoli\backend"
Write-Host "Compiling backend..." -ForegroundColor Yellow
$result = docker run --rm -v "${PWD}:/app" -w /app golang:1.24-alpine sh -c "apk add --no-cache gcc musl-dev sqlite-dev >/dev/null 2>&1 && go build -ldflags='-w -s' -o server-linux main.go && echo SUCCESS"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Compilation successful!" -ForegroundColor Green

    Write-Host "Starting backend..." -ForegroundColor Yellow
    docker run -d --name psychic-backend -p 8080:8080 -v "${PWD}:/app" -w /app -e DB_PATH=/app/database/education.db -e JWT_SECRET=your-secret-key-change-in-production -e GIN_MODE=release golang:1.24-alpine sh -c "apk add --no-cache sqlite-dev >/dev/null 2>&1 && ./server-linux"

    Start-Sleep -Seconds 3
    docker ps | Select-String "psychic-backend"
    Write-Host "`nBackend is running at http://localhost:8080" -ForegroundColor Green
} else {
    Write-Host "Compilation failed!" -ForegroundColor Red
    exit 1
}

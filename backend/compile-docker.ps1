# Docker compile script for backend
Write-Host "Compiling Go backend with Docker..." -ForegroundColor Yellow
Set-Location "E:\biyesheji\psychic-broccoli\backend"

docker run --rm -v "${PWD}:/app" -w /app golang:1.24-alpine sh -c "apk add --no-cache gcc musl-dev sqlite-dev && go build -ldflags='-w -s' -o server-linux main.go"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Compilation successful!" -ForegroundColor Green
    Get-Item server-linux | Select-Object Name, Length, LastWriteTime
    exit 0
} else {
    Write-Host "`n❌ Compilation failed!" -ForegroundColor Red
    exit 1
}

# Compile with Chinese proxy
Write-Host "Compiling Go code with GOPROXY..." -ForegroundColor Yellow
Set-Location "e:\biyesheji\psychic-broccoli\backend"

docker run --rm `
    -v "${PWD}:/app" `
    -w /app `
    -e GOPROXY=https://goproxy.cn,direct `
    golang:1.24-alpine `
    sh -c "apk add --no-cache gcc musl-dev sqlite-dev && go build -ldflags='-w -s' -o server-linux main.go"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Compilation successful!" -ForegroundColor Green

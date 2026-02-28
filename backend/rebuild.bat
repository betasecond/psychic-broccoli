@echo off
cd /d E:\biyesheji\psychic-broccoli\backend
echo Compiling...
docker run --rm -v "%CD%:/app" -w /app golang:1.24-alpine sh -c "apk add --no-cache gcc musl-dev sqlite-dev >/dev/null 2>&1 && go build -ldflags='-w -s' -o server-linux main.go"
if %ERRORLEVEL% EQU 0 (
    echo Compilation successful!
    echo Restarting backend...
    docker stop psychic-backend 2>nul
    docker rm psychic-backend 2>nul
    docker run -d --name psychic-backend -p 8080:8080 -v "%CD%:/app" -w /app -e DB_PATH=/app/database/education.db -e JWT_SECRET=your-secret-key-change-in-production -e GIN_MODE=release golang:1.24-alpine sh -c "apk add --no-cache sqlite-dev >/dev/null 2>&1 && ./server-linux"
    timeout /t 3 >nul
    echo Backend started!
) else (
    echo Compilation failed!
)

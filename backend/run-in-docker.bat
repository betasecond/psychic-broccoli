@echo off
chcp 65001 >nul
cd /d e:\biyesheji\psychic-broccoli\backend

echo Stopping old containers...
docker stop psychic-backend 2>nul
docker rm psychic-backend 2>nul

echo.
echo Compiling Go code in Docker container...
docker run --rm ^
    -v "%CD%:/app" ^
    -w /app ^
    golang:1.24-alpine ^
    sh -c "apk add --no-cache gcc musl-dev sqlite-dev && go build -ldflags='-w -s' -o server-linux main.go"

if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)

echo.
echo ✓ Compilation successful!
echo.
echo Starting backend server in Docker...

docker run -d ^
    --name psychic-backend ^
    -p 8080:8080 ^
    -v "%CD%:/app" ^
    -w /app ^
    -e DB_PATH=/app/database/education.db ^
    -e JWT_SECRET=your-secret-key-change-in-production ^
    -e GIN_MODE=release ^
    golang:1.24-alpine ^
    sh -c "apk add --no-cache sqlite-dev && ./server-linux"

timeout /t 3 >nul

docker ps | findstr psychic-backend >nul
if errorlevel 1 (
    echo Failed to start!
    echo Checking logs...
    docker logs psychic-backend
    pause
    exit /b 1
)

echo.
echo ================================
echo ✓ Backend is running!
echo ================================
echo.
echo URL: http://localhost:8080
echo.
echo Commands:
echo   docker logs psychic-backend -f       - View logs (real-time)
echo   docker stop psychic-backend          - Stop server
echo   docker restart psychic-backend       - Restart server
echo.
pause

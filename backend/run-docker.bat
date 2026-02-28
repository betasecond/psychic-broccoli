@echo off
chcp 65001 >nul
cd /d e:\biyesheji\psychic-broccoli\backend

echo Stopping any existing backend containers...
docker stop psychic-backend 2>nul
docker rm psychic-backend 2>nul

echo.
echo Building Docker image for backend...
docker build -t psychic-backend:latest .

if errorlevel 1 (
    echo Docker build failed!
    pause
    exit /b 1
)

echo.
echo Starting backend in Docker container...
docker run -d ^
    --name psychic-backend ^
    -p 8080:8080 ^
    -v "%CD%\database:/data" ^
    -e DB_PATH=/data/education.db ^
    -e JWT_SECRET=your-secret-key-change-in-production ^
    psychic-backend:latest

timeout /t 3 >nul

docker ps | findstr psychic-backend >nul
if errorlevel 1 (
    echo Failed to start backend container!
    echo Checking logs...
    docker logs psychic-backend
    pause
    exit /b 1
)

echo.
echo ================================
echo Backend is running in Docker!
echo ================================
echo Backend URL: http://localhost:8080
echo.
echo Useful commands:
echo   docker logs psychic-backend          - View logs
echo   docker stop psychic-backend          - Stop backend
echo   docker restart psychic-backend       - Restart backend
echo.
pause

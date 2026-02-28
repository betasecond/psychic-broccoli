@echo off
chcp 65001 >nul
cd /d e:\biyesheji\psychic-broccoli\backend

echo Stopping old server...
taskkill /F /IM server.exe 2>nul

echo.
echo Building with Docker...
docker run --rm -v "%CD%:/app" -w /app golang:1.24-alpine sh -c "apk add --no-cache gcc musl-dev sqlite-dev mingw-w64-gcc && export CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc && go build -ldflags='-w -s' -o server.exe main.go"

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build successful!
echo Starting server...
start /B server.exe

timeout /t 2 >nul

tasklist /FI "IMAGENAME eq server.exe" 2>NUL | find /I /N "server.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Server started successfully!
) else (
    echo Failed to start server!
)

echo.
pause

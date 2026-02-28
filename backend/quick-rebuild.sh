#!/bin/sh
cd /e/biyesheji/psychic-broccoli/backend
echo "Starting compilation..."
docker run --rm -v "$(pwd):/app" -w /app golang:1.24-alpine sh -c "apk add --no-cache gcc musl-dev sqlite-dev >/dev/null 2>&1 && echo 'Building...' && go build -ldflags='-w -s' -o server-linux main.go && echo 'Build successful!'"
if [ $? -eq 0 ]; then
    echo "Starting backend..."
    docker run -d --name psychic-backend -p 8080:8080 -v "$(pwd):/app" -w /app -e DB_PATH=/app/database/education.db -e JWT_SECRET=your-secret-key-change-in-production -e GIN_MODE=release golang:1.24-alpine sh -c "apk add --no-cache sqlite-dev >/dev/null 2>&1 && ./server-linux"
    sleep 3
    docker ps | grep psychic-backend && echo "Backend is running on http://localhost:8080"
else
    echo "Build failed!"
    exit 1
fi

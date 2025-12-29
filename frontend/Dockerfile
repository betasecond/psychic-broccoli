# ============================================================
# Frontend Dockerfile - React (Vite) + Nginx
# Multi-stage build for minimal production image
# ============================================================

# --- Stage 1: Build the frontend assets ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production assets
# Note: VITE_API_BASE_URL defaults to /api/v1 which works with nginx proxy
RUN npm run build

# --- Stage 2: Production runtime with Nginx ---
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


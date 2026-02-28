# ============================================================
# Backend Dockerfile - Go (Gin) + SQLite (cgo)
# Multi-stage build for minimal production image
# ============================================================

# --- Stage 1: Build the Go binary ---
# Pin to the exact toolchain version required by go.mod (`toolchain go1.24.9`).
# With `GOTOOLCHAIN=local`, a patch mismatch (e.g. 1.24.0 image) can cause `go build` to fail in CI/buildx.
FROM golang:1.24.9-alpine AS builder

# Avoid auto-downloading Go toolchains during docker build (go.mod has `toolchain ...`).
# This makes CI/buildx more reliable in restricted network environments.
ENV GOTOOLCHAIN=local

# Install build dependencies for CGO (SQLite requires CGO)
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

# Copy go mod files first (for better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# BuildKit/buildx will provide these automatically for multi-arch builds.
ARG TARGETOS
ARG TARGETARCH

# Build with CGO enabled for SQLite support.
# If building with buildx, TARGETOS/TARGETARCH will be set; otherwise we fall back to Go defaults.
RUN set -eu; \
    export GOOS="${TARGETOS:-linux}"; \
    if [ -n "${TARGETARCH:-}" ]; then export GOARCH="$TARGETARCH"; fi; \
    CGO_ENABLED=1 go build \
    -ldflags="-w -s" \
    -o server main.go

# --- Stage 2: Production runtime image ---
FROM alpine:3.20

# Install ca-certificates for HTTPS, timezone data, and wget for healthcheck
RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/server .

# Copy database schema (needed for InitDB to read schema.sql)
COPY --from=builder /app/database/schema.sql ./database/

# Create data directory for SQLite persistence
# Create upload directories for user-uploaded files (assignments, avatars, covers, materials)
RUN mkdir -p /data \
    /app/public/assignments \
    /app/public/avatars \
    /app/public/covers \
    /app/public/materials

# Environment variables with defaults
ENV SERVER_PORT=8080
ENV DB_PATH=/data/education.db
ENV JWT_SECRET=change-me-in-production
ENV GIN_MODE=release

# Expose the API port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the server
CMD ["./server"]


# Multi-stage build for Go backend
FROM golang:1.24.5-alpine AS builder

WORKDIR /app

# Install build deps
RUN apk add --no-cache git

# Cache modules
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download

# Copy source
COPY apps/backend/ ./

# Build static binary
ENV CGO_ENABLED=0 GOOS=linux
RUN go build -ldflags "-s -w" -o /app/main .

# Runtime image
FROM alpine:latest
WORKDIR /app

# CA certificates for outbound HTTPS from the app
RUN apk add --no-cache ca-certificates && update-ca-certificates

# Copy binary
COPY --from=builder /app/main ./main

# Expose the application port (internal only; not published by compose)
EXPOSE 8080

# Environment
ENV PORT=8080
ENV GIN_MODE=release

# Run
CMD ["./main"]

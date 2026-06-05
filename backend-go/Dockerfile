FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Download Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o backend-go ./cmd/api

# Final stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies (like tzdata for timezone, ca-certificates for https)
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/backend-go .

# Ensure storage root exists
RUN mkdir -p /app/storage

# Set execution permissions
RUN chmod +x ./backend-go

# Expose port (default 8080)
EXPOSE 8080

# Command to run the application
CMD ["./backend-go"]

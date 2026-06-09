FROM alpine:latest

WORKDIR /app

# Install runtime dependencies (like tzdata for timezone, ca-certificates for https)
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from local build
COPY backend-go .

# Ensure storage root exists
RUN mkdir -p /app/storage

# Set execution permissions
RUN chmod +x ./backend-go

# Expose port (default 8080)
EXPOSE 8080

# Command to run the application
CMD ["./backend-go"]

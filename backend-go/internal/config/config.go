package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env                        string
	Port                       string
	DatabaseURL                string
	ExportServiceURL           string
	StorageRoot                string
	MaxSourceImageSizeMB       int64
	BackendCORSAllowedOrigins  string
}

var AppConfig *Config

// LoadConfig reads configuration from environment variables.
func LoadConfig() {
	// Optionally load from .env file if it exists
	_ = godotenv.Load()

	dbUrl := getEnv("DATABASE_URL", "postgres://songslide:change-me-with-strong-production-password@localhost:5432/songslide")
	// Translate Spring's jdbc:postgresql:// to standard postgres://
	if strings.HasPrefix(dbUrl, "jdbc:") {
		dbUrl = strings.TrimPrefix(dbUrl, "jdbc:")
	}

	AppConfig = &Config{
		Env:                       getEnv("SPRING_PROFILES_ACTIVE", "dev"),
		Port:                      getEnv("BACKEND_PORT", "8080"),
		DatabaseURL:               dbUrl,
		ExportServiceURL:          getEnv("EXPORT_SERVICE_URL", "http://localhost:3001"),
		StorageRoot:               getEnv("STORAGE_ROOT", "storage"),
		MaxSourceImageSizeMB:      getEnvAsInt("MAX_SOURCE_IMAGE_SIZE_MB", 10),
		BackendCORSAllowedOrigins: getEnv("BACKEND_CORS_ALLOWED_ORIGINS", "http://localhost:3000"),
	}

	// Spring's DATABASE_URL format is often jdbc:postgresql://host:port/db
	// We need standard PostgreSQL DSN for Go (gorm).
	// But let's assume the user uses standard format in .env or we translate it.
}

func getEnv(key string, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}

func getEnvAsInt(name string, defaultVal int64) int64 {
	valueStr := getEnv(name, "")
	if value, err := strconv.ParseInt(valueStr, 10, 64); err == nil {
		return value
	}
	return defaultVal
}

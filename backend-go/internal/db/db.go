package db

import (
	"log"

	"github.com/yayanberutu/songslide/backend-go/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	var err error
	dsn := config.AppConfig.DatabaseURL

	// Adjust logger level based on Env
	logLevel := logger.Info
	if config.AppConfig.Env == "production" {
		logLevel = logger.Error
	}

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Connected to PostgreSQL database successfully.")
}

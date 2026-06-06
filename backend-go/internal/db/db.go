package db

import (
	"log"
	"os"

	"github.com/yayanberutu/songslide/backend-go/internal/config"
	"github.com/yayanberutu/songslide/backend-go/internal/user"
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

	// Auto-migrate the user table
	err = DB.AutoMigrate(&user.User{})
	if err != nil {
		log.Printf("Failed to auto-migrate User table: %v", err)
	} else {
		seedAdminUser()
	}
}

func seedAdminUser() {
	var count int64
	DB.Model(&user.User{}).Count(&count)
	if count == 0 {
		adminUsername := os.Getenv("DEFAULT_ADMIN_USERNAME")
		if adminUsername == "" {
			adminUsername = "admin"
		}
		adminPassword := os.Getenv("DEFAULT_ADMIN_PASSWORD")
		if adminPassword == "" {
			adminPassword = "password123"
		}

		hash, err := user.HashPassword(adminPassword)
		if err != nil {
			log.Fatalf("Failed to hash default admin password: %v", err)
		}

		admin := user.User{
			Username:     adminUsername,
			PasswordHash: hash,
			Role:         user.RoleAdmin,
		}

		if err := DB.Create(&admin).Error; err != nil {
			log.Printf("Failed to create default admin user: %v", err)
		} else {
			log.Printf("Successfully seeded default admin user (username: %s)", adminUsername)
		}
	}
}

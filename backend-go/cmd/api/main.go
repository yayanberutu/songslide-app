package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/yayanberutu/songslide/backend-go/internal/arrangement"
	"github.com/yayanberutu/songslide/backend-go/internal/config"
	"github.com/yayanberutu/songslide/backend-go/internal/db"
	"github.com/yayanberutu/songslide/backend-go/internal/exporting"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
	"github.com/yayanberutu/songslide/backend-go/internal/songbook"
	"github.com/yayanberutu/songslide/backend-go/internal/sourceimage"
	"github.com/yayanberutu/songslide/backend-go/internal/storage"
	"github.com/yayanberutu/songslide/backend-go/internal/auth"
	"github.com/yayanberutu/songslide/backend-go/internal/middleware"
)

func main() {
	config.LoadConfig()
	db.InitDB()

	if config.AppConfig.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	fileStorage, err := storage.NewFileSystemStorage()
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}

	exportClient := exporting.NewExportServiceClient()

	// Simple health check matching Spring Boot actuator path
	r.GET("/api/actuator/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})

	// Standard health check for local docker-compose
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})

	publicApi := r.Group("/api")
	{
		authHandler := auth.NewHandler(db.DB)
		authHandler.RegisterRoutes(publicApi)
	}

	protectedApi := r.Group("/api")
	protectedApi.Use(middleware.AuthMiddleware())
	protectedApi.Use(middleware.ReadOnlyForMultimedia())

	{
		songbookHandler := songbook.NewHandler(db.DB)
		songbookHandler.RegisterRoutes(protectedApi)

		songHandler := song.NewHandler(db.DB)
		songHandler.RegisterRoutes(protectedApi)

		arrHandler := arrangement.NewHandler(db.DB)
		arrHandler.RegisterRoutes(protectedApi)

		sourceImageHandler := sourceimage.NewHandler(db.DB, fileStorage)
		sourceImageHandler.RegisterRoutes(publicApi, protectedApi)

		exportHandler := exporting.NewHandler(db.DB, fileStorage, exportClient)
		exportHandler.RegisterRoutes(publicApi, protectedApi)
	}

	log.Printf("Starting backend-go server on port %s", config.AppConfig.Port)
	if err := r.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

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

	api := r.Group("/api")
	{
		songbookHandler := songbook.NewHandler(db.DB)
		songbookHandler.RegisterRoutes(api)

		songHandler := song.NewHandler(db.DB)
		songHandler.RegisterRoutes(api)

		arrHandler := arrangement.NewHandler(db.DB)
		arrHandler.RegisterRoutes(api)

		sourceImageHandler := sourceimage.NewHandler(db.DB, fileStorage)
		sourceImageHandler.RegisterRoutes(api)

		exportHandler := exporting.NewHandler(db.DB, fileStorage, exportClient)
		exportHandler.RegisterRoutes(api)
	}

	log.Printf("Starting backend-go server on port %s", config.AppConfig.Port)
	if err := r.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

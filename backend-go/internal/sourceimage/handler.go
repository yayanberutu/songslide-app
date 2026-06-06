package sourceimage

import (
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"github.com/yayanberutu/songslide/backend-go/internal/config"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
	"github.com/yayanberutu/songslide/backend-go/internal/storage"
	"gorm.io/gorm"
)

type Handler struct {
	db    *gorm.DB
	store *storage.FileSystemStorage
}

func NewHandler(db *gorm.DB, store *storage.FileSystemStorage) *Handler {
	return &Handler{db: db, store: store}
}

func (h *Handler) RegisterRoutes(public *gin.RouterGroup, protected *gin.RouterGroup) {
	songsGroup := protected.Group("/songs/:id/images")
	{
		songsGroup.POST("", h.UploadImage)
		songsGroup.GET("", h.ListImages)
		songsGroup.DELETE("/:imageId", h.DeleteImage)
	}

	public.GET("/source-images/*storageKey", h.DownloadImage)
}

func (h *Handler) UploadImage(c *gin.Context) {
	songIdStr := c.Param("id")
	songId, err := uuid.Parse(songIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid songId format"))
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "File is required"))
		return
	}

	maxSize := config.AppConfig.MaxSourceImageSizeMB * 1024 * 1024
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "File size exceeds limit"))
		return
	}

	var s song.Song
	if err := h.db.First(&s, "id = ?", songId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".jpg" // fallback
	}

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	// storageKey format: source-images/{songId}/{uuid}{ext}
	imageId := uuid.New()
	storageKey := fmt.Sprintf("source-images/%s/%s%s", songId.String(), imageId.String(), ext)

	// Save to storage
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Failed to read uploaded file"))
		return
	}
	defer f.Close()

	if err := h.store.SaveReader(storageKey, f); err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Failed to save file to storage: "+err.Error()))
		return
	}

	img := SongSourceImage{
		ID:               imageId,
		SongID:           songId,
		StorageKey:       storageKey,
		OriginalFilename: file.Filename,
		ContentType:      contentType,
		SizeBytes:        file.Size,
	}

	if err := h.db.Create(&img).Error; err != nil {
		_ = h.store.Delete(storageKey)
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(img.ToResponse()))
}

func (h *Handler) ListImages(c *gin.Context) {
	songIdStr := c.Param("id")
	songId, err := uuid.Parse(songIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid songId format"))
		return
	}

	var s song.Song
	if err := h.db.First(&s, "id = ?", songId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	var images []SongSourceImage
	if err := h.db.Where("song_id = ?", songId).Order("created_at asc").Find(&images).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	responses := make([]SongSourceImageResponse, len(images))
	for i, img := range images {
		responses[i] = img.ToResponse()
	}

	c.JSON(http.StatusOK, api.Success(responses))
}

func (h *Handler) DeleteImage(c *gin.Context) {
	songIdStr := c.Param("id")
	imageIdStr := c.Param("imageId")

	songId, err := uuid.Parse(songIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid songId"))
		return
	}
	imageId, err := uuid.Parse(imageIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid imageId"))
		return
	}

	var img SongSourceImage
	if err := h.db.First(&img, "id = ? AND song_id = ?", imageId, songId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Image not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	// Delete from storage
	_ = h.store.Delete(img.StorageKey)

	// Delete from DB
	if err := h.db.Delete(&img).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	// DeleteSongResponse is similar to DeleteImageResponse
	c.JSON(http.StatusOK, api.Success(map[string]bool{"success": true}))
}

func (h *Handler) DownloadImage(c *gin.Context) {
	// The path will be /api/source-images/path/to/file.ext
	// Gin's *Param includes the leading slash, e.g., "/path/to/file.ext"
	// But our storageKey requires "source-images/path/to/file.ext"
	// Actually, the route is /source-images/*storageKey, so Param("storageKey") is "/songId/imageId.jpg"
	// So storageKey is "source-images" + c.Param("storageKey")
	storageKey := "source-images" + c.Param("storageKey")

	stream, err := h.store.ReadStream(storageKey)
	if err != nil {
		c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Image not found"))
		return
	}
	defer stream.Close()

	// Content-Type could be inferred from DB if we queried it, but usually standard http fileserving works
	// For simplicity, we just serve it directly using Gin's DataFromReader, or let http.ServeContent handle it
	// if we had FileSystemStorage return an *os.File. Since it's io.ReadCloser, we can use DataFromReader
	
	// Better to use c.File() since it's a local file and handles Range requests automatically
	path, resolveErr := h.store.ResolveStorageKeyForDownload(storageKey)
	if resolveErr != nil {
		c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Image not found"))
		return
	}
	c.File(path)
}

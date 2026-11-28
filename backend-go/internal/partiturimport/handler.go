package partiturimport

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
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

type OmrResult struct {
	Status                string   `json:"status"`
	DetectedKeySignature  string   `json:"detectedKeySignature"`
	DetectedTimeSignature string   `json:"detectedTimeSignature"`
	NoteCount             int      `json:"noteCount"`
	MeasureCount          int      `json:"measureCount"`
	Lines                 []string `json:"lines"`
	RawNotation           string   `json:"rawNotation"`
	Warnings              []string `json:"warnings"`
}

type PartiturImportResponse struct {
	Status                string   `json:"status"`
	RawFileStorageKey     string   `json:"rawFileStorageKey"`
	OriginalFilename      string   `json:"originalFilename"`
	DetectedKeySignature  string   `json:"detectedKeySignature"`
	DetectedTimeSignature string   `json:"detectedTimeSignature"`
	NoteCount             int      `json:"noteCount"`
	MeasureCount          int      `json:"measureCount"`
	Lines                 []string `json:"lines"`
	RawNotation           string   `json:"rawNotation"`
	Warnings              []string `json:"warnings"`
}

type Handler struct {
	db            *gorm.DB
	store         *storage.FileSystemStorage
	ocrServiceURL string
	maxSizeBytes  int64
}

func NewHandler(db *gorm.DB, store *storage.FileSystemStorage) *Handler {
	return &Handler{
		db:            db,
		store:         store,
		ocrServiceURL: config.AppConfig.OcrServiceURL,
		maxSizeBytes:  config.AppConfig.MaxSourceImageSizeMB * 1024 * 1024,
	}
}

func (h *Handler) RegisterRoutes(protected *gin.RouterGroup) {
	protected.POST("/songs/:id/partitur-import", h.ImportPartitur)
}

func (h *Handler) ImportPartitur(c *gin.Context) {
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

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "File is required"))
		return
	}

	if file.Size > h.maxSizeBytes {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "File size exceeds limit"))
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".pdf" {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "File must be PNG, JPG, JPEG, or PDF"))
		return
	}

	// 1. Read file bytes
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Failed to read uploaded file"))
		return
	}
	defer f.Close()

	fileBytes, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Failed to read file content"))
		return
	}

	// 2. Save raw file to storage
	storageKey := fmt.Sprintf("partitur-imports/%s/%s%s", songId.String(), uuid.New().String(), ext)
	if err := h.store.SaveReader(storageKey, bytes.NewReader(fileBytes)); err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Failed to save file to storage: "+err.Error()))
		return
	}

	// 3. Call OCR service /omr/staff-notation
	omrResult, err := h.callOcrService(fileBytes, file.Filename)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, api.Failed(http.StatusUnprocessableEntity, "Gagal memproses OMR: "+err.Error()))
		return
	}

	resp := PartiturImportResponse{
		Status:                omrResult.Status,
		RawFileStorageKey:     storageKey,
		OriginalFilename:      file.Filename,
		DetectedKeySignature:  omrResult.DetectedKeySignature,
		DetectedTimeSignature: omrResult.DetectedTimeSignature,
		NoteCount:             omrResult.NoteCount,
		MeasureCount:          omrResult.MeasureCount,
		Lines:                 omrResult.Lines,
		RawNotation:           omrResult.RawNotation,
		Warnings:              omrResult.Warnings,
	}

	c.JSON(http.StatusOK, api.Success(resp))
}

func (h *Handler) callOcrService(fileBytes []byte, filename string) (*OmrResult, error) {
	url := strings.TrimRight(h.ocrServiceURL, "/") + "/omr/staff-notation"

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, fmt.Errorf("failed to create multipart form: %w", err)
	}

	if _, err := part.Write(fileBytes); err != nil {
		return nil, fmt.Errorf("failed to write multipart data: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OCR service is unavailable: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read OCR service response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp struct {
			Detail string `json:"detail"`
		}
		if json.Unmarshal(respBytes, &errResp) == nil && errResp.Detail != "" {
			return nil, errors.New(errResp.Detail)
		}
		return nil, fmt.Errorf("OCR service failed with status %d: %s", resp.StatusCode, string(respBytes))
	}

	var result OmrResult
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to parse OCR service response: %w", err)
	}

	return &result, nil
}

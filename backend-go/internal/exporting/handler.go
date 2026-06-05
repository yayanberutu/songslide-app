package exporting

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"github.com/yayanberutu/songslide/backend-go/internal/arrangement"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
	"github.com/yayanberutu/songslide/backend-go/internal/storage"
	"gorm.io/gorm"
)

type Handler struct {
	db           *gorm.DB
	store        *storage.FileSystemStorage
	exportClient *ExportServiceClient
}

func NewHandler(db *gorm.DB, store *storage.FileSystemStorage, exportClient *ExportServiceClient) *Handler {
	return &Handler{
		db:           db,
		store:        store,
		exportClient: exportClient,
	}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/songs/:id/exports", h.CreateExport)
	r.POST("/song-exports/multiple", h.CreateMultipleExport)
	r.GET("/exports/:exportId/download", h.Download)
}

func (h *Handler) CreateExport(c *gin.Context) {
	songIdStr := c.Param("id")
	songId, err := uuid.Parse(songIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid songId"))
		return
	}

	var req SingleSongExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	var s song.Song
	if err := h.db.Preload("SongBook").First(&s, "id = ?", songId).Error; err != nil {
		c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
		return
	}

	var arr arrangement.SongArrangement
	if err := h.db.First(&arr, "id = ?", req.ArrangementId).Error; err != nil {
		c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Arrangement not found"))
		return
	}

	if arr.SongID != songId {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Arrangement does not belong to song"))
		return
	}

	format := ExportFormat(strings.ToUpper(req.OutputFormat))

	buildResult, err := BuildSinglePayload(s, arr.ContentJson, req.SelectedVerses, req.RefrainMode, format, req.Layout)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	versesBytes, _ := json.Marshal(buildResult.NormalizedVerses)

	ex := SongExport{
		SongID:             songId,
		ArrangementID:      arr.ID,
		Format:             string(format),
		Status:             "PENDING",
		SelectedVersesJson: versesBytes,
		RefrainMode:        req.RefrainMode,
		OptionsJson:        buildResult.OptionsJson,
	}

	if err := h.db.Create(&ex).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	output, err := h.exportClient.Export(format, buildResult.Payload)
	if err != nil {
		errMsg := err.Error()
		ex.Status = "FAILED"
		ex.ErrorMessage = &errMsg
		h.db.Save(&ex)
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Export service failed: "+errMsg))
		return
	}

	storageKey := fmt.Sprintf("exports/%s/%s/songslide-export.%s", songId.String(), ex.ID.String(), format.FileExtension())
	if err := h.store.Save(storageKey, output); err != nil {
		errMsg := err.Error()
		ex.Status = "FAILED"
		ex.ErrorMessage = &errMsg
		h.db.Save(&ex)
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Storage failed: "+errMsg))
		return
	}

	ex.StorageKey = &storageKey
	ex.Status = "COMPLETED"
	h.db.Save(&ex)

	c.JSON(http.StatusOK, api.Success(ex.ToResponse()))
}

func (h *Handler) CreateMultipleExport(c *gin.Context) {
	var req MultipleSongExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	sort.SliceStable(req.Items, func(i, j int) bool {
		return req.Items[i].Order < req.Items[j].Order
	})

	var contexts []MultipleSongExportItemContext
	for _, item := range req.Items {
		var s song.Song
		err := h.db.Joins("JOIN song_books ON song_books.id = songs.song_book_id").
			Where("song_books.code = ? AND songs.song_number = ?", item.BookCode, item.SongNumber).
			Preload("SongBook").
			First(&s).Error
		if err != nil {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found: "+item.BookCode+" "+item.SongNumber))
			return
		}

		var arr arrangement.SongArrangement
		err = h.db.First(&arr, "song_id = ? AND is_default = ?", s.ID, true).Error
		if err != nil {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Default arrangement not found for song: "+s.SongNumber))
			return
		}

		contexts = append(contexts, MultipleSongExportItemContext{
			Song:        s,
			Arrangement: arr,
			Item:        item,
		})
	}

	if len(contexts) == 0 {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "No items provided"))
		return
	}

	format := ExportFormat(strings.ToUpper(req.OutputFormat))
	buildResult, err := BuildMultiplePayload(contexts, req.RequestedFileName, format, req.Layout)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	firstCtx := contexts[0]
	ex := SongExport{
		SongID:             firstCtx.Song.ID,
		ArrangementID:      firstCtx.Arrangement.ID,
		Format:             string(format),
		Status:             "PENDING",
		SelectedVersesJson: []byte("[]"),
		RefrainMode:        "NONE",
		OptionsJson:        buildResult.OptionsJson,
	}

	if err := h.db.Create(&ex).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	output, err := h.exportClient.Export(format, buildResult.Payload)
	if err != nil {
		errMsg := err.Error()
		ex.Status = "FAILED"
		ex.ErrorMessage = &errMsg
		h.db.Save(&ex)
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Export service failed: "+errMsg))
		return
	}

	storageKey := fmt.Sprintf("exports/%s/%s/songslide-export.%s", firstCtx.Song.ID.String(), ex.ID.String(), format.FileExtension())
	if err := h.store.Save(storageKey, output); err != nil {
		errMsg := err.Error()
		ex.Status = "FAILED"
		ex.ErrorMessage = &errMsg
		h.db.Save(&ex)
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Storage failed: "+errMsg))
		return
	}

	ex.StorageKey = &storageKey
	ex.Status = "COMPLETED"
	h.db.Save(&ex)

	c.JSON(http.StatusOK, api.Success(ex.ToResponse()))
}

func (h *Handler) Download(c *gin.Context) {
	exportIdStr := c.Param("exportId")
	exportId, err := uuid.Parse(exportIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid exportId"))
		return
	}

	var ex SongExport
	if err := h.db.Preload("Song.SongBook").First(&ex, "id = ?", exportId).Error; err != nil {
		c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Export not found"))
		return
	}

	if ex.Status != "COMPLETED" || ex.StorageKey == nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Export is not completed"))
		return
	}

	format := ExportFormat(ex.Format)
	extension := format.FileExtension()
	fileName := "songslide-export." + extension

	// Extract requestedFileName if exists
	var options map[string]interface{}
	_ = json.Unmarshal(ex.OptionsJson, &options)

	if outObj, ok := options["output"].(map[string]interface{}); ok {
		if reqName, ok := outObj["requestedFileName"].(string); ok && reqName != "" {
			if strings.HasSuffix(strings.ToLower(reqName), "."+strings.ToLower(extension)) {
				reqName = reqName[:len(reqName)-len(extension)-1]
			}
			sanitized := sanitizeFilename(reqName)
			if sanitized == "" {
				sanitized = "songslide-export"
			}
			fileName = sanitized + "." + extension
		}
	} else {
		// Single export fallback name
		var versesList []string
		_ = json.Unmarshal(ex.SelectedVersesJson, &versesList)
		sort.Slice(versesList, func(i, j int) bool {
			vi, _ := strconv.Atoi(versesList[i])
			vj, _ := strconv.Atoi(versesList[j])
			return vi < vj
		})

		bookCode := ex.Song.SongBook.Code
		songNum := ex.Song.SongNumber
		versesStr := ""
		if len(versesList) > 0 {
			versesStr = " - " + strings.Join(versesList, ",")
		}

		rawName := ""
		if bookCode != "" && songNum != "" {
			rawName = bookCode + " " + songNum + versesStr
		}

		sanitized := sanitizeFilename(rawName)
		if sanitized == "" {
			sanitized = "songslide-export"
		}
		fileName = sanitized + "." + extension
	}

	path, err := h.store.ResolveStorageKeyForDownload(*ex.StorageKey)
	if err != nil {
		c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Export file not found"))
		return
	}

	contentType := "application/octet-stream"
	if format == FormatPPTX {
		contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	} else if format == FormatPNG {
		contentType = "application/zip"
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	c.Header("Content-Type", contentType)
	c.File(path)
}

func sanitizeFilename(name string) string {
	if name == "" {
		return ""
	}
	re := regexp.MustCompile(`[^a-zA-Z0-9 \-\.,]`)
	clean := re.ReplaceAllString(name, "")
	clean = strings.ReplaceAll(clean, "..", "")
	reSpace := regexp.MustCompile(` +`)
	clean = reSpace.ReplaceAllString(clean, " ")
	clean = strings.TrimSpace(clean)
	reTrim := regexp.MustCompile(`^[ \-\.,]+|[ \-\.,]+$`)
	clean = reTrim.ReplaceAllString(clean, "")
	return clean
}

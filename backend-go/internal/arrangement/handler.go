package arrangement

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	// Nested under songs
	songsGroup := r.Group("/songs/:id/arrangements")
	{
		songsGroup.POST("/default", h.CreateDefault)
		songsGroup.GET("/default", h.GetDefault)
	}

	// Flat arrangements
	arrGroup := r.Group("/arrangements")
	{
		arrGroup.GET("/:arrangementId", h.Get)
		arrGroup.PUT("/:arrangementId/content", h.UpdateContent)
	}
}

func (h *Handler) CreateDefault(c *gin.Context) {
	songIdStr := c.Param("id")
	songId, err := uuid.Parse(songIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid songId format"))
		return
	}

	// Check if song exists
	var s song.Song
	if err := h.db.First(&s, "id = ?", songId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	var arr SongArrangement
	err = h.db.First(&arr, "song_id = ? AND is_default = ?", songId, true).Error
	if err == nil {
		// Already exists, return it
		if s.NotationSourceSongID != nil {
			var sourceArr SongArrangement
			if err := h.db.First(&sourceArr, "song_id = ? AND is_default = ?", s.NotationSourceSongID, true).Error; err == nil {
				arr.ContentJson = MergeNotation(arr.ContentJson, sourceArr.ContentJson)
			}
		}
		c.JSON(http.StatusOK, api.Success(arr.ToResponse()))
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	// Create default arrangement
	defaultContent := []byte(`{"structureVersion":"1.0","sections":[{"id":"verse","type":"VERSE","label":"Ayat","repeatable":true,"lines":[]}]}`)

	if err := ValidateContent(defaultContent); err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Invalid default content generator: "+err.Error()))
		return
	}

	arr = SongArrangement{
		SongID:      songId,
		Name:        "Default",
		IsDefault:   true,
		ContentJson: defaultContent,
		LayoutJson:  []byte(`{}`), // empty object
	}

	if err := h.db.Create(&arr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	if s.NotationSourceSongID != nil {
		var sourceArr SongArrangement
		if err := h.db.First(&sourceArr, "song_id = ? AND is_default = ?", s.NotationSourceSongID, true).Error; err == nil {
			arr.ContentJson = MergeNotation(arr.ContentJson, sourceArr.ContentJson)
		}
	}

	c.JSON(http.StatusOK, api.Success(arr.ToResponse()))
}

func (h *Handler) GetDefault(c *gin.Context) {
	songIdStr := c.Param("id")
	songId, err := uuid.Parse(songIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid songId format"))
		return
	}

	// Check if song exists
	var s song.Song
	if err := h.db.First(&s, "id = ?", songId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	var arr SongArrangement
	if err := h.db.First(&arr, "song_id = ? AND is_default = ?", songId, true).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Default arrangement not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	if s.NotationSourceSongID != nil {
		var sourceArr SongArrangement
		if err := h.db.First(&sourceArr, "song_id = ? AND is_default = ?", s.NotationSourceSongID, true).Error; err == nil {
			arr.ContentJson = MergeNotation(arr.ContentJson, sourceArr.ContentJson)
		}
	}

	c.JSON(http.StatusOK, api.Success(arr.ToResponse()))
}

func MergeNotation(targetJson []byte, sourceJson []byte) []byte {
	var target map[string]interface{}
	var source map[string]interface{}

	if err := json.Unmarshal(targetJson, &target); err != nil {
		return targetJson
	}
	if err := json.Unmarshal(sourceJson, &source); err != nil {
		return targetJson
	}

	targetSections, _ := target["sections"].([]interface{})
	sourceSections, okS := source["sections"].([]interface{})
	if !okS {
		return targetJson
	}

	for i, sSecInt := range sourceSections {
		sSec, okS2 := sSecInt.(map[string]interface{})
		if !okS2 {
			continue
		}

		var tSec map[string]interface{}
		if i < len(targetSections) {
			tSec, _ = targetSections[i].(map[string]interface{})
		}

		sLines, okS3 := sSec["lines"].([]interface{})
		if !okS3 {
			continue
		}

		var tLines []interface{}
		if tSec != nil {
			tLines, _ = tSec["lines"].([]interface{})
		}

		for j, sLineInt := range sLines {
			sLine, okS4 := sLineInt.(map[string]interface{})
			if !okS4 {
				continue
			}

			// Clear source lyrics so they don't bleed into the target song
			delete(sLine, "lyric")
			
			if sLyrics, ok := sLine["lyricsByVerse"].(map[string]interface{}); ok {
				emptyLyrics := make(map[string]interface{})
				for k := range sLyrics {
					emptyLyrics[k] = ""
				}
				sLine["lyricsByVerse"] = emptyLyrics
			} else {
				delete(sLine, "lyricsByVerse")
			}

			// Inject lyrics from target if they exist
			if j < len(tLines) {
				if tLine, okT4 := tLines[j].(map[string]interface{}); okT4 {
					if lyric, exists := tLine["lyric"]; exists {
						sLine["lyric"] = lyric
					}
					if lyricsByVerse, exists := tLine["lyricsByVerse"]; exists {
						sLine["lyricsByVerse"] = lyricsByVerse
					}
				}
			}
		}
	}

	source["sections"] = sourceSections

	mergedJson, err := json.Marshal(source)
	if err != nil {
		return targetJson
	}
	return mergedJson
}

func (h *Handler) Get(c *gin.Context) {
	arrIdStr := c.Param("arrangementId")
	arrId, err := uuid.Parse(arrIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid arrangementId format"))
		return
	}

	var arr SongArrangement
	if err := h.db.Preload("Song").First(&arr, "id = ?", arrId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Arrangement not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	if arr.Song.NotationSourceSongID != nil {
		var sourceArr SongArrangement
		if err := h.db.First(&sourceArr, "song_id = ? AND is_default = ?", arr.Song.NotationSourceSongID, true).Error; err == nil {
			arr.ContentJson = MergeNotation(arr.ContentJson, sourceArr.ContentJson)
		}
	}

	c.JSON(http.StatusOK, api.Success(arr.ToResponse()))
}

func (h *Handler) UpdateContent(c *gin.Context) {
	arrIdStr := c.Param("arrangementId")
	arrId, err := uuid.Parse(arrIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid arrangementId format"))
		return
	}

	var req ArrangementContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	if err := ValidateContent(req.ContentJson); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	var arr SongArrangement
	if err := h.db.First(&arr, "id = ?", arrId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Arrangement not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	// Compact JSON to ensure valid format
	var compacted []byte
	var jsonMap map[string]interface{}
	if err := json.Unmarshal(req.ContentJson, &jsonMap); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid JSON format"))
		return
	}
	compacted, _ = json.Marshal(jsonMap)

	arr.ContentJson = compacted

	if err := h.db.Save(&arr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(arr.ToResponse()))
}

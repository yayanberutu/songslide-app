package song

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"github.com/yayanberutu/songslide/backend-go/internal/songbook"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	group := r.Group("/songs")
	{
		group.POST("", h.Create)
		group.GET("", h.List)
		group.GET("/:id", h.Get)
		group.PUT("/:id", h.Update)
		group.DELETE("/:id", h.Delete)
	}
}

func ptrStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func (h *Handler) Create(c *gin.Context) {
	var req SongRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	var book songbook.SongBook
	if req.SongBookID != nil {
		if err := h.db.First(&book, "id = ?", req.SongBookID).Error; err != nil {
			c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "SongBook not found"))
			return
		}
	} else if req.BookCode != "" {
		if err := h.db.First(&book, "code = ?", req.BookCode).Error; err != nil {
			c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "SongBook not found"))
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "songBookId or bookCode is required"))
		return
	}

	songType := req.Type
	if songType == "" {
		songType = "LEAD_SHEET"
	}

	song := Song{
		SongBookID:    book.ID,
		SongNumber:    req.SongNumber,
		Title:         req.Title,
		KeySignature:  ptrStr(req.DefaultKey),
		TimeSignature: ptrStr(req.TimeSignature),
		TempoBpm:             req.Tempo,
		Type:                 songType,
		Author:               ptrStr(req.AuthorText),
		Notes:                ptrStr(req.SourceNote),
		NotationSourceSongID: req.NotationSourceSongID,
	}

	if err := h.db.Create(&song).Error; err != nil {
		c.JSON(http.StatusConflict, api.Failed(http.StatusConflict, "Failed to create song (possible duplicate)"))
		return
	}

	// Load relation for response
	song.SongBook = book
	c.JSON(http.StatusOK, api.Success(song.ToResponse()))
}

func (h *Handler) List(c *gin.Context) {
	bookCode := c.Query("bookCode")
	title := c.Query("title")
	songNumber := c.Query("songNumber")
	
	pageStr := c.Query("page")
	limitStr := c.Query("limit")
	
	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	
	limit := 50
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	query := h.db.Model(&Song{}).Joins("JOIN song_books ON songs.song_book_id = song_books.id")

	if bookCode != "" {
		query = query.Where("song_books.code = ?", bookCode)
	}
	if title != "" {
		query = query.Where("songs.title ILIKE ?", "%"+title+"%")
	}
	if songNumber != "" {
		query = query.Where("songs.song_number = ?", songNumber)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	var songs []Song
	offset := (page - 1) * limit
	if err := query.Preload("SongBook").Preload("NotationSourceSong").Preload("NotationSourceSong.SongBook").
		Order("song_books.code ASC").
		Order("NULLIF(regexp_replace(songs.song_number, '\\D', '', 'g'), '')::int ASC").
		Order("songs.song_number ASC").
		Offset(offset).Limit(limit).Find(&songs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	responses := make([]SongResponse, len(songs))
	for i, s := range songs {
		responses[i] = s.ToResponse()
	}

	c.JSON(http.StatusOK, api.Success(api.PaginatedData[SongResponse]{
		Items:      responses,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
	}))
}

func (h *Handler) Get(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid UUID format"))
		return
	}

	var s Song
	if err := h.db.Preload("SongBook").Preload("NotationSourceSong").Preload("NotationSourceSong.SongBook").First(&s, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(s.ToResponse()))
}

func (h *Handler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid UUID format"))
		return
	}

	var req SongRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	var s Song
	if err := h.db.First(&s, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	if req.SongBookID != nil {
		var book songbook.SongBook
		if err := h.db.First(&book, "id = ?", req.SongBookID).Error; err != nil {
			c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "SongBook not found"))
			return
		}
		s.SongBookID = book.ID
	} else if req.BookCode != "" {
		var book songbook.SongBook
		if err := h.db.First(&book, "code = ?", req.BookCode).Error; err != nil {
			c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "SongBook not found"))
			return
		}
		s.SongBookID = book.ID
	}

	if req.Type != "" {
		s.Type = req.Type
	}
	s.SongNumber = req.SongNumber
	s.Title = req.Title
	s.KeySignature = ptrStr(req.DefaultKey)
	s.TimeSignature = ptrStr(req.TimeSignature)
	s.TempoBpm = req.Tempo
	s.Author = ptrStr(req.AuthorText)
	s.Notes = ptrStr(req.SourceNote)
	s.NotationSourceSongID = req.NotationSourceSongID

	if err := h.db.Save(&s).Error; err != nil {
		c.JSON(http.StatusConflict, api.Failed(http.StatusConflict, "Failed to update song"))
		return
	}

	// Reload to get updated SongBook relation
	h.db.Preload("SongBook").Preload("NotationSourceSong").Preload("NotationSourceSong.SongBook").First(&s, "id = ?", s.ID)

	c.JSON(http.StatusOK, api.Success(s.ToResponse()))
}

func (h *Handler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid UUID format"))
		return
	}

	var s Song
	if err := h.db.First(&s, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	if err := h.db.Delete(&s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(DeleteSongResponse{Success: true}))
}

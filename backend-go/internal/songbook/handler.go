package songbook

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	group := r.Group("/song-books")
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
	var req SongBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	book := SongBook{
		Code:        req.Code,
		Name:        req.Name,
		Description: ptrStr(req.Description),
	}

	if req.DisplayOrder != nil {
		book.DisplayOrder = *req.DisplayOrder
	}
	if req.Active != nil {
		book.Active = *req.Active
	} else {
		book.Active = true // default
	}

	if err := h.db.Create(&book).Error; err != nil {
		// Basic error handling for duplicates
		c.JSON(http.StatusConflict, api.Failed(http.StatusConflict, "Failed to create song book (possible duplicate code)"))
		return
	}

	c.JSON(http.StatusOK, api.Success(book.ToResponse()))
}

func (h *Handler) List(c *gin.Context) {
	var books []SongBook
	if err := h.db.Order("display_order asc").Find(&books).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	responses := make([]SongBookResponse, len(books))
	for i, b := range books {
		responses[i] = b.ToResponse()
	}

	// Empty slices serialize to null in Go if not initialized, but make() initializes to []
	c.JSON(http.StatusOK, api.Success(responses))
}

func (h *Handler) Get(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid UUID format"))
		return
	}

	var book SongBook
	if err := h.db.First(&book, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song book not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(book.ToResponse()))
}

func (h *Handler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid UUID format"))
		return
	}

	var req SongBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	var book SongBook
	if err := h.db.First(&book, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song book not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	book.Code = req.Code
	book.Name = req.Name
	book.Description = ptrStr(req.Description)
	if req.DisplayOrder != nil {
		book.DisplayOrder = *req.DisplayOrder
	}
	if req.Active != nil {
		book.Active = *req.Active
	}

	if err := h.db.Save(&book).Error; err != nil {
		c.JSON(http.StatusConflict, api.Failed(http.StatusConflict, "Failed to update song book (possible duplicate code)"))
		return
	}

	c.JSON(http.StatusOK, api.Success(book.ToResponse()))
}

func (h *Handler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid UUID format"))
		return
	}

	var book SongBook
	if err := h.db.First(&book, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "Song book not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	if err := h.db.Delete(&book).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(DeleteSongBookResponse{Success: true}))
}

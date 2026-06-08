package analytics

import (
	"net/http"

	"github.com/gin-gonic/gin"
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
	analytics := r.Group("/analytics")
	{
		analytics.GET("", h.GetDashboardData)
	}
}

type TopSong struct {
	SongID      string `json:"songId"`
	Title       string `json:"title"`
	ExportCount int    `json:"exportCount"`
}

type DashboardResponse struct {
	TotalExports int       `json:"totalExports"`
	TotalLogins  int       `json:"totalLogins"`
	TopSongs     []TopSong `json:"topSongs"`
}

func (h *Handler) GetDashboardData(c *gin.Context) {
	var totalExports int64
	if err := h.db.Table("song_exports").Count(&totalExports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	var totalLogins int64
	if err := h.db.Table("users").Select("sum(login_count)").Row().Scan(&totalLogins); err != nil {
		// Ignore if null (no logins yet)
		totalLogins = 0
	}

	var topSongs []TopSong
	query := `
		SELECT e.song_id, s.title, COUNT(*) as export_count
		FROM song_exports e
		JOIN songs s ON e.song_id = s.id
		GROUP BY e.song_id, s.title
		ORDER BY export_count DESC
		LIMIT 5
	`
	if err := h.db.Raw(query).Scan(&topSongs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(DashboardResponse{
		TotalExports: int(totalExports),
		TotalLogins:  int(totalLogins),
		TopSongs:     topSongs,
	}))
}

package arrangement

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
	"gorm.io/gorm"
)

type SongArrangement struct {
	ID          uuid.UUID       `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SongID      uuid.UUID       `gorm:"type:uuid;not null"`
	Song        song.Song       `gorm:"foreignKey:SongID"`
	Name        string          `gorm:"type:varchar(255);not null;default:'Default'"`
	IsDefault   bool            `gorm:"not null;default:false"`
	ContentJson json.RawMessage `gorm:"type:jsonb;not null"`
	LayoutJson  json.RawMessage `gorm:"type:jsonb"`
	CreatedAt   time.Time       `gorm:"not null"`
	UpdatedAt   time.Time       `gorm:"not null"`
}

func (sa *SongArrangement) BeforeCreate(tx *gorm.DB) (err error) {
	if sa.ID == uuid.Nil {
		sa.ID = uuid.New()
	}
	return
}

type ArrangementContentRequest struct {
	ContentJson json.RawMessage `json:"contentJson" binding:"required"`
}

type SongArrangementResponse struct {
	ID          uuid.UUID       `json:"id"`
	SongID      uuid.UUID       `json:"songId"`
	Name        string          `json:"name"`
	IsDefault   bool            `json:"isDefault"`
	ContentJson json.RawMessage `json:"contentJson"`
	LayoutJson  json.RawMessage `json:"layoutJson"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

func (sa *SongArrangement) ToResponse() SongArrangementResponse {
	return SongArrangementResponse{
		ID:          sa.ID,
		SongID:      sa.SongID,
		Name:        sa.Name,
		IsDefault:   sa.IsDefault,
		ContentJson: sa.ContentJson,
		LayoutJson:  sa.LayoutJson,
		CreatedAt:   sa.CreatedAt,
		UpdatedAt:   sa.UpdatedAt,
	}
}

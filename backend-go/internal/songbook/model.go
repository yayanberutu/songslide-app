package songbook

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SongBook struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Code         string    `gorm:"type:varchar(16);unique;not null"`
	Name         string    `gorm:"type:varchar(255);not null"`
	Description  *string   `gorm:"type:text"`
	DisplayOrder int       `gorm:"not null;default:0"`
	Active       bool      `gorm:"not null;default:true"`
	CreatedAt    time.Time `gorm:"not null"`
	UpdatedAt    time.Time `gorm:"not null"`
}

// BeforeCreate will set a UUID rather than numeric ID.
func (sb *SongBook) BeforeCreate(tx *gorm.DB) (err error) {
	if sb.ID == uuid.Nil {
		sb.ID = uuid.New()
	}
	return
}

type SongBookRequest struct {
	Code         string `json:"code" binding:"required,max=16"`
	Name         string `json:"name" binding:"required,max=255"`
	Description  string `json:"description"`
	DisplayOrder *int   `json:"displayOrder" binding:"omitempty,min=0"`
	Active       *bool  `json:"active"`
}

type SongBookResponse struct {
	ID           uuid.UUID `json:"id"`
	Code         string    `json:"code"`
	Name         string    `json:"name"`
	Description  *string   `json:"description"`
	DisplayOrder int       `json:"displayOrder"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (sb *SongBook) ToResponse() SongBookResponse {
	return SongBookResponse{
		ID:           sb.ID,
		Code:         sb.Code,
		Name:         sb.Name,
		Description:  sb.Description,
		DisplayOrder: sb.DisplayOrder,
		Active:       sb.Active,
		CreatedAt:    sb.CreatedAt,
		UpdatedAt:    sb.UpdatedAt,
	}
}

type DeleteSongBookResponse struct {
	Success bool `json:"success"`
}

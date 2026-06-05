package sourceimage

import (
	"time"

	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
	"gorm.io/gorm"
)

type SongSourceImage struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SongID           uuid.UUID `gorm:"type:uuid;not null"`
	Song             song.Song `gorm:"foreignKey:SongID"`
	StorageKey       string    `gorm:"type:varchar(512);not null"`
	OriginalFilename string    `gorm:"not null"`
	ContentType      string    `gorm:"type:varchar(100);not null"`
	SizeBytes        int64     `gorm:"not null"`
	PageNumber       *int      `gorm:""`
	WidthPx          *int      `gorm:""`
	HeightPx         *int      `gorm:""`
	CreatedAt        time.Time `gorm:"not null"`
	UpdatedAt        time.Time `gorm:"not null"`
}

func (s *SongSourceImage) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

type SongSourceImageResponse struct {
	ID               uuid.UUID `json:"id"`
	SongId           uuid.UUID `json:"songId"`
	StorageKey       string    `json:"storageKey"`
	OriginalFilename string    `json:"originalFilename"`
	ContentType      string    `json:"contentType"`
	SizeBytes        int64     `json:"sizeBytes"`
	PageNumber       *int      `json:"pageNumber"`
	WidthPx          *int      `json:"widthPx"`
	HeightPx         *int      `json:"heightPx"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

func (s *SongSourceImage) ToResponse() SongSourceImageResponse {
	return SongSourceImageResponse{
		ID:               s.ID,
		SongId:           s.SongID,
		StorageKey:       s.StorageKey,
		OriginalFilename: s.OriginalFilename,
		ContentType:      s.ContentType,
		SizeBytes:        s.SizeBytes,
		PageNumber:       s.PageNumber,
		WidthPx:          s.WidthPx,
		HeightPx:         s.HeightPx,
		CreatedAt:        s.CreatedAt,
		UpdatedAt:        s.UpdatedAt,
	}
}

package song

import (
	"time"

	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/songbook"
	"gorm.io/gorm"
)

type Song struct {
	ID            uuid.UUID         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SongBookID    uuid.UUID         `gorm:"type:uuid;not null"`
	SongBook      songbook.SongBook `gorm:"foreignKey:SongBookID"`
	SongNumber    string            `gorm:"type:varchar(32);not null"`
	Title         string            `gorm:"type:varchar(255);not null"`
	KeySignature  *string           `gorm:"type:varchar(32)"`
	TimeSignature *string           `gorm:"type:varchar(32)"`
	TempoBpm      *int              `gorm:""`
	Author        *string           `gorm:"type:text"`
	Notes         *string           `gorm:"type:text"`
	CreatedAt     time.Time         `gorm:"not null"`
	UpdatedAt     time.Time         `gorm:"not null"`
}

func (s *Song) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

type SongRequest struct {
	SongBookID    *uuid.UUID `json:"songBookId"`
	BookCode      string     `json:"bookCode" binding:"omitempty,max=16"`
	SongNumber    string     `json:"songNumber" binding:"required,max=32"`
	Title         string     `json:"title" binding:"required,max=255"`
	DefaultKey    string     `json:"defaultKey" binding:"omitempty,max=32"`
	TimeSignature string     `json:"timeSignature" binding:"omitempty,max=32"`
	Tempo         *int       `json:"tempo" binding:"omitempty,min=1"`
	AuthorText    string     `json:"authorText" binding:"omitempty,max=255"`
	SourceNote    string     `json:"sourceNote"`
}

type SongBookSummaryResponse struct {
	ID   uuid.UUID `json:"id"`
	Code string    `json:"code"`
	Name string    `json:"name"`
}

type SongResponse struct {
	ID            uuid.UUID               `json:"id"`
	SongNumber    string                  `json:"songNumber"`
	Title         string                  `json:"title"`
	DefaultKey    *string                 `json:"defaultKey"`
	TimeSignature *string                 `json:"timeSignature"`
	Tempo         *int                    `json:"tempo"`
	AuthorText    *string                 `json:"authorText"`
	SourceNote    *string                 `json:"sourceNote"`
	SongBook      SongBookSummaryResponse `json:"songBook"`
	CreatedAt     time.Time               `json:"createdAt"`
	UpdatedAt     time.Time               `json:"updatedAt"`
}

func (s *Song) ToResponse() SongResponse {
	return SongResponse{
		ID:            s.ID,
		SongNumber:    s.SongNumber,
		Title:         s.Title,
		DefaultKey:    s.KeySignature,
		TimeSignature: s.TimeSignature,
		Tempo:         s.TempoBpm,
		AuthorText:    s.Author,
		SourceNote:    s.Notes,
		SongBook: SongBookSummaryResponse{
			ID:   s.SongBook.ID,
			Code: s.SongBook.Code,
			Name: s.SongBook.Name,
		},
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
	}
}

type DeleteSongResponse struct {
	Success bool `json:"success"`
}

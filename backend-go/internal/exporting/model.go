package exporting

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/arrangement"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
	"gorm.io/gorm"
)

type ExportServicePayload struct {
	Slides []Slide `json:"slides"`
	Layout Layout  `json:"layout"`
	Output Output  `json:"output"`
}

type Slide struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Metadata string `json:"metadata,omitempty"`
	Lines    []Line `json:"lines"`
}

type Line struct {
	Notation *string `json:"notation,omitempty"`
	Lyric    *string `json:"lyric,omitempty"`
}

type Layout struct {
	Theme          string `json:"theme"`
	ShowNotation   bool   `json:"showNotation"`
	SlideSize      string `json:"slideSize"`
	TextSizePreset string `json:"textSizePreset"`
}

type Output struct {
	FileName    string `json:"fileName"`
	ImageWidth  *int   `json:"imageWidth,omitempty"`
	ImageHeight *int   `json:"imageHeight,omitempty"`
}

type ExportLayoutRequest struct {
	Theme          string `json:"theme"`
	ShowNotation   *bool  `json:"showNotation"`
	SlideSize      string `json:"slideSize"`
	TextSizePreset string `json:"textSizePreset"`
	ImageWidth     *int   `json:"imageWidth"`
	ImageHeight    *int   `json:"imageHeight"`
}

type SongExport struct {
	ID                 uuid.UUID                   `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SongID             uuid.UUID                   `gorm:"type:uuid;not null"`
	Song               song.Song                   `gorm:"foreignKey:SongID"`
	ArrangementID      uuid.UUID                   `gorm:"type:uuid;not null;column:song_arrangement_id"`
	Arrangement        arrangement.SongArrangement `gorm:"foreignKey:ArrangementID"`
	Format             string                      `gorm:"type:varchar(50);not null"`
	Status             string                      `gorm:"type:varchar(50);not null"`
	ErrorMessage       *string                     `gorm:""`
	StorageKey         *string                     `gorm:"type:varchar(512)"`
	SelectedVersesJson json.RawMessage             `gorm:"type:jsonb;not null"`
	RefrainMode        string                      `gorm:"type:varchar(50);not null"`
	OptionsJson        json.RawMessage             `gorm:"type:jsonb;not null"`
	CreatedAt          time.Time                   `gorm:"not null"`
	UpdatedAt          time.Time                   `gorm:"not null"`
}

func (e *SongExport) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}

type SongExportResponse struct {
	ID                 uuid.UUID       `json:"id"`
	SongId             uuid.UUID       `json:"songId"`
	ArrangementId      uuid.UUID       `json:"arrangementId"`
	Format             string          `json:"format"`
	Status             string          `json:"status"`
	ErrorMessage       *string         `json:"errorMessage"`
	SelectedVersesJson json.RawMessage `json:"selectedVersesJson"`
	RefrainMode        string          `json:"refrainMode"`
	OptionsJson        json.RawMessage `json:"optionsJson"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt"`
}

func (e *SongExport) ToResponse() SongExportResponse {
	return SongExportResponse{
		ID:                 e.ID,
		SongId:             e.SongID,
		ArrangementId:      e.ArrangementID,
		Format:             e.Format,
		Status:             e.Status,
		ErrorMessage:       e.ErrorMessage,
		SelectedVersesJson: e.SelectedVersesJson,
		RefrainMode:        e.RefrainMode,
		OptionsJson:        e.OptionsJson,
		CreatedAt:          e.CreatedAt,
		UpdatedAt:          e.UpdatedAt,
	}
}

type ExportBuildResult struct {
	Payload          *ExportServicePayload
	NormalizedVerses []string
	OptionsJson      json.RawMessage
}

type SingleSongExportRequest struct {
	ArrangementId  uuid.UUID           `json:"arrangementId" binding:"required"`
	OutputFormat   string              `json:"outputFormat" binding:"required"`
	RefrainMode    string              `json:"refrainMode" binding:"required"`
	SelectedVerses []string            `json:"selectedVerses" binding:"required"`
	Layout         ExportLayoutRequest `json:"layout"`
}

type MultipleSongExportRequest struct {
	OutputFormat      string                   `json:"outputFormat" binding:"required"`
	RequestedFileName string                   `json:"fileName"`
	Items             []MultipleSongExportItem `json:"items" binding:"required"`
	Layout            ExportLayoutRequest      `json:"layout"`
}

type MultipleSongExportItem struct {
	Order          int      `json:"order"`
	SongId         *string  `json:"songId"`
	BookCode       string   `json:"bookCode"`
	SongNumber     string   `json:"songNumber"`
	ArrangementId  *string  `json:"arrangementId"`
	RefrainMode    string   `json:"refrainMode" binding:"required"`
	SelectedVerses []string `json:"selectedVerses" binding:"required"`
}

package exporting

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/yayanberutu/songslide/backend-go/internal/config"
)

type ExportFormat string

const (
	FormatPPTX ExportFormat = "PPTX"
	FormatPNG  ExportFormat = "PNG"
)

func (f ExportFormat) ExportPath() string {
	switch f {
	case FormatPPTX:
		return "/export/pptx"
	case FormatPNG:
		return "/export/png"
	}
	return ""
}

func (f ExportFormat) FileExtension() string {
	switch f {
	case FormatPPTX:
		return "pptx"
	case FormatPNG:
		return "zip"
	}
	return ""
}

type ExportServiceClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewExportServiceClient() *ExportServiceClient {
	return &ExportServiceClient{
		baseURL:    config.AppConfig.ExportServiceURL,
		httpClient: &http.Client{},
	}
}

func (c *ExportServiceClient) Export(format ExportFormat, payload *ExportServicePayload) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal export payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, c.baseURL+format.ExportPath(), bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create export request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/octet-stream")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("export service is unavailable: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read export response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		detail := string(respBody)
		if detail == "" {
			detail = resp.Status
		}
		return nil, fmt.Errorf("export service failed with status %d: %s", resp.StatusCode, detail)
	}

	if len(respBody) == 0 {
		return nil, fmt.Errorf("export service returned an empty response body")
	}

	return respBody, nil
}

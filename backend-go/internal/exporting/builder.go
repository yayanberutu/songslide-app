package exporting

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/yayanberutu/songslide/backend-go/internal/arrangement"
	"github.com/yayanberutu/songslide/backend-go/internal/song"
)

var verseNumberPattern = regexp.MustCompile(`^[1-9][0-9]*$`)

func BuildSinglePayload(
	s song.Song,
	contentJson []byte,
	selectedVerses []string,
	refrainMode string,
	outputFormat ExportFormat,
	layoutReq ExportLayoutRequest,
) (*ExportBuildResult, error) {
	if err := arrangement.ValidateContent(contentJson); err != nil {
		return nil, fmt.Errorf("invalid arrangement content: %w", err)
	}

	var root map[string]interface{}
	_ = json.Unmarshal(contentJson, &root)

	normalizedVerses, err := normalizeSelectedVerses(selectedVerses)
	if err != nil {
		return nil, err
	}
	if err := validateSelectedVerses(root, normalizedVerses); err != nil {
		return nil, err
	}

	layout, err := normalizeLayout(layoutReq)
	if err != nil {
		return nil, err
	}
	output, err := makeOutput(outputFormat, layoutReq, "")
	if err != nil {
		return nil, err
	}

	slides := buildSlides(s, root, normalizedVerses, refrainMode)
	if len(slides) == 0 {
		return nil, fmt.Errorf("export request did not produce any slides")
	}

	payload := &ExportServicePayload{
		Slides: slides,
		Layout: layout,
		Output: output,
	}

	options := optionsJson(layout, output, "", nil)

	return &ExportBuildResult{
		Payload:          payload,
		NormalizedVerses: normalizedVerses,
		OptionsJson:      options,
	}, nil
}

type MultipleSongExportItemContext struct {
	Song        song.Song
	Arrangement arrangement.SongArrangement
	Item        MultipleSongExportItem
}

func BuildMultiplePayload(
	contexts []MultipleSongExportItemContext,
	requestedFileName string,
	outputFormat ExportFormat,
	layoutReq ExportLayoutRequest,
) (*ExportBuildResult, error) {
	layout, err := normalizeLayout(layoutReq)
	if err != nil {
		return nil, err
	}
	output, err := makeOutput(outputFormat, layoutReq, requestedFileName)
	if err != nil {
		return nil, err
	}

	var allSlides []Slide
	var metadataItems []map[string]interface{}

	for _, ctx := range contexts {
		var root map[string]interface{}
		if err := json.Unmarshal(ctx.Arrangement.ContentJson, &root); err != nil {
			return nil, fmt.Errorf("invalid arrangement content json")
		}

		normalizedVerses, err := normalizeSelectedVerses(ctx.Item.SelectedVerses)
		if err != nil {
			return nil, err
		}
		if err := validateSelectedVerses(root, normalizedVerses); err != nil {
			return nil, err
		}

		slides := buildSlides(ctx.Song, root, normalizedVerses, ctx.Item.RefrainMode)
		if len(slides) == 0 {
			return nil, fmt.Errorf("export request for song %s did not produce any slides", ctx.Song.SongNumber)
		}

		allSlides = append(allSlides, slides...)

		metadataItems = append(metadataItems, map[string]interface{}{
			"order":          ctx.Item.Order,
			"bookCode":       ctx.Item.BookCode,
			"songNumber":     ctx.Item.SongNumber,
			"refrainMode":    ctx.Item.RefrainMode,
			"selectedVerses": normalizedVerses,
		})
	}

	if len(allSlides) == 0 {
		return nil, fmt.Errorf("export request did not produce any slides")
	}

	payload := &ExportServicePayload{
		Slides: allSlides,
		Layout: layout,
		Output: output,
	}

	options := optionsJson(layout, output, requestedFileName, metadataItems)

	return &ExportBuildResult{
		Payload:          payload,
		NormalizedVerses: []string{},
		OptionsJson:      options,
	}, nil
}

func normalizeSelectedVerses(verses []string) ([]string, error) {
	if len(verses) == 0 {
		return nil, fmt.Errorf("selectedVerses is required")
	}
	var normalized []string
	for _, v := range verses {
		v = strings.TrimSpace(v)
		if !verseNumberPattern.MatchString(v) {
			return nil, fmt.Errorf("selectedVerses values must be positive verse numbers")
		}
		normalized = append(normalized, v)
	}
	return normalized, nil
}

func validateSelectedVerses(contentJson map[string]interface{}, verses []string) error {
	available := collectAvailableVerses(contentJson)
	availableMap := make(map[string]bool)
	for _, a := range available {
		availableMap[a] = true
	}

	for _, v := range verses {
		if !availableMap[v] {
			return fmt.Errorf("selectedVerses contains unavailable verse: %s", v)
		}
	}
	return nil
}

func collectAvailableVerses(contentJson map[string]interface{}) []string {
	verses := make(map[string]bool)
	for _, section := range getSections(contentJson) {
		t := getString(section, "type")
		if t == "VERSE" {
			for _, line := range sortedLines(section["lines"]) {
				lbv, ok := line["lyricsByVerse"].(map[string]interface{})
				if ok {
					for k := range lbv {
						verses[k] = true
					}
				}
			}
		} else if t == "TEXT_ONLY_VERSES" {
			if vMap, ok := section["verses"].(map[string]interface{}); ok {
				for k := range vMap {
					verses[k] = true
				}
			}
		}
	}
	var list []string
	for k := range verses {
		list = append(list, k)
	}
	return list
}

func buildSlides(s song.Song, contentJson map[string]interface{}, verses []string, refrainMode string) []Slide {
	var slides []Slide
	title := slideTitle(s)
	metadata := slideMetadata(s)

	for _, verse := range verses {
		appendVerseSlides(&slides, contentJson, verse, title, metadata)
		appendTextOnlyVerseSlides(&slides, contentJson, verse, title, metadata)

		if refrainMode == "AFTER_EACH_VERSE" {
			appendRefrainSlides(&slides, contentJson, title, metadata)
		}
	}

	if refrainMode == "ONCE_AFTER_ALL_VERSES" {
		appendRefrainSlides(&slides, contentJson, title, metadata)
	}

	return slides
}

func appendVerseSlides(slides *[]Slide, contentJson map[string]interface{}, verseNumber string, title, metadata string) {
	for _, section := range sectionsOfType(contentJson, "VERSE") {
		if !sectionHasVerse(section, verseNumber) {
			continue
		}

		var lines []Line
		for _, line := range sortedLines(section["lines"]) {
			var lyric *string
			var notation *string

			if lbv, ok := line["lyricsByVerse"].(map[string]interface{}); ok {
				if lStr, exists := lbv[verseNumber].(string); exists && lStr != "" {
					lyric = &lStr
				}
			}
			if nStr, exists := line["notation"].(string); exists && nStr != "" {
				notation = &nStr
			}

			if lyric != nil || notation != nil {
				lines = append(lines, Line{Notation: notation, Lyric: lyric})
			}
		}

		if len(lines) > 0 {
			lbl := getLabel(section, "Ayat") + " " + verseNumber
			*slides = append(*slides, Slide{
				Title:    title,
				Subtitle: lbl,
				Metadata: metadata,
				Lines:    lines,
			})
		}
	}
}

func appendTextOnlyVerseSlides(slides *[]Slide, contentJson map[string]interface{}, verseNumber string, title, metadata string) {
	for _, section := range sectionsOfType(contentJson, "TEXT_ONLY_VERSES") {
		if vMap, ok := section["verses"].(map[string]interface{}); ok {
			if lStr, exists := vMap[verseNumber].(string); exists && lStr != "" {
				lbl := getLabel(section, "Ayat Tambahan") + " " + verseNumber
				*slides = append(*slides, Slide{
					Title:    title,
					Subtitle: lbl,
					Metadata: metadata,
					Lines:    []Line{{Lyric: &lStr}},
				})
			}
		}
	}
}

func appendRefrainSlides(slides *[]Slide, contentJson map[string]interface{}, title, metadata string) {
	for _, section := range sectionsOfType(contentJson, "REFRAIN") {
		var lines []Line
		for _, line := range sortedLines(section["lines"]) {
			var lyric *string
			var notation *string

			if lStr, exists := line["lyric"].(string); exists && lStr != "" {
				lyric = &lStr
			}
			if nStr, exists := line["notation"].(string); exists && nStr != "" {
				notation = &nStr
			}

			if lyric != nil || notation != nil {
				lines = append(lines, Line{Notation: notation, Lyric: lyric})
			}
		}

		if len(lines) > 0 {
			lbl := getLabel(section, "Refrein")
			*slides = append(*slides, Slide{
				Title:    title,
				Subtitle: lbl,
				Metadata: metadata,
				Lines:    lines,
			})
		}
	}
}

func sectionHasVerse(section map[string]interface{}, verseNumber string) bool {
	for _, line := range sortedLines(section["lines"]) {
		if lbv, ok := line["lyricsByVerse"].(map[string]interface{}); ok {
			if _, exists := lbv[verseNumber]; exists {
				return true
			}
		}
	}
	return false
}

func sectionsOfType(contentJson map[string]interface{}, t string) []map[string]interface{} {
	var res []map[string]interface{}
	for _, section := range getSections(contentJson) {
		if getString(section, "type") == t {
			res = append(res, section)
		}
	}
	return res
}

func getSections(contentJson map[string]interface{}) []map[string]interface{} {
	var res []map[string]interface{}
	if arr, ok := contentJson["sections"].([]interface{}); ok {
		for _, v := range arr {
			if m, isMap := v.(map[string]interface{}); isMap {
				res = append(res, m)
			}
		}
	}
	return res
}

func sortedLines(linesIntf interface{}) []map[string]interface{} {
	var lines []map[string]interface{}
	if arr, ok := linesIntf.([]interface{}); ok {
		for _, v := range arr {
			if m, isMap := v.(map[string]interface{}); isMap {
				lines = append(lines, m)
			}
		}
	}

	sort.SliceStable(lines, func(i, j int) bool {
		oi := getOrder(lines[i])
		oj := getOrder(lines[j])
		return oi < oj
	})
	return lines
}

func getOrder(line map[string]interface{}) int {
	if o, ok := line["lineOrder"].(float64); ok {
		return int(o)
	}
	return 999999
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getLabel(section map[string]interface{}, fallback string) string {
	lbl := getString(section, "label")
	if lbl != "" {
		return lbl
	}
	return fallback
}

func slideTitle(s song.Song) string {
	return fmt.Sprintf("%s %s - %s", s.SongBook.Code, s.SongNumber, s.Title)
}

func slideMetadata(s song.Song) string {
	var parts []string
	if s.KeySignature != nil && *s.KeySignature != "" {
		parts = append(parts, "Do = "+*s.KeySignature)
	}
	if s.TimeSignature != nil && *s.TimeSignature != "" {
		parts = append(parts, *s.TimeSignature)
	}
	if s.TempoBpm != nil {
		parts = append(parts, fmt.Sprintf("%d BPM", *s.TempoBpm))
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, " | ")
}

func normalizeLayout(req ExportLayoutRequest) (Layout, error) {
	theme := strings.ToUpper(strings.TrimSpace(req.Theme))
	if theme == "" {
		theme = "LIGHT"
	}
	if theme != "LIGHT" && theme != "DARK" {
		return Layout{}, fmt.Errorf("layout.theme must be LIGHT or DARK")
	}

	slideSize := strings.ToUpper(strings.TrimSpace(req.SlideSize))
	if slideSize == "" {
		slideSize = "LAYOUT_WIDE"
	}
	if slideSize != "LAYOUT_WIDE" && slideSize != "LAYOUT_4X3" && slideSize != "16:9" && slideSize != "4:3" {
		return Layout{}, fmt.Errorf("layout.slideSize is not supported")
	}

	showNotation := true
	if req.ShowNotation != nil {
		showNotation = *req.ShowNotation
	}

	textSizePreset := strings.ToUpper(strings.TrimSpace(req.TextSizePreset))
	if textSizePreset == "" {
		textSizePreset = "MEDIUM"
	}
	if textSizePreset != "SMALL" && textSizePreset != "MEDIUM" && textSizePreset != "LARGE" && textSizePreset != "CUSTOM" {
		return Layout{}, fmt.Errorf("layout.textSizePreset is not supported")
	}

	return Layout{
		Theme:          theme,
		ShowNotation:   showNotation,
		SlideSize:      slideSize,
		TextSizePreset: textSizePreset,
		CustomLayout:   req.CustomLayout,
	}, nil
}

func makeOutput(format ExportFormat, req ExportLayoutRequest, requestedFileName string) (Output, error) {
	if req.ImageWidth != nil && *req.ImageWidth <= 0 {
		return Output{}, fmt.Errorf("layout.imageWidth must be positive")
	}
	if req.ImageHeight != nil && *req.ImageHeight <= 0 {
		return Output{}, fmt.Errorf("layout.imageHeight must be positive")
	}

	fileName := "songslide-export." + format.FileExtension()
	if requestedFileName != "" {
		ext := format.FileExtension()
		baseName := requestedFileName
		if strings.HasSuffix(strings.ToLower(baseName), "."+strings.ToLower(ext)) {
			baseName = baseName[:len(baseName)-len(ext)-1]
		}
		fileName = baseName + "." + ext
	}

	return Output{
		FileName:    fileName,
		ImageWidth:  req.ImageWidth,
		ImageHeight: req.ImageHeight,
	}, nil
}

func optionsJson(layout Layout, output Output, requestedFileName string, items []map[string]interface{}) json.RawMessage {
	layoutOpts := map[string]interface{}{
		"theme":          layout.Theme,
		"showNotation":   layout.ShowNotation,
		"slideSize":      layout.SlideSize,
		"textSizePreset": layout.TextSizePreset,
	}
	if layout.CustomLayout != nil {
		layoutOpts["customLayout"] = layout.CustomLayout
	}

	opts := map[string]interface{}{
		"layout": layoutOpts,
		"output": map[string]interface{}{
			"fileName": output.FileName,
		},
	}

	outMap := opts["output"].(map[string]interface{})
	if output.ImageWidth != nil {
		outMap["imageWidth"] = *output.ImageWidth
	}
	if output.ImageHeight != nil {
		outMap["imageHeight"] = *output.ImageHeight
	}

	if requestedFileName != "" {
		outMap["requestedFileName"] = requestedFileName
		opts["exportType"] = "MULTIPLE"
	} else {
		opts["exportType"] = "SINGLE"
	}

	if len(items) > 0 {
		opts["items"] = items
	}

	b, _ := json.Marshal(opts)
	return b
}

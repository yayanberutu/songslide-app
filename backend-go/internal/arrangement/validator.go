package arrangement

import (
	"encoding/json"
	"fmt"
	"regexp"
)

var verseNumberPattern = regexp.MustCompile(`^[1-9][0-9]*$`)

func ValidateContent(contentJson []byte) error {
	var root map[string]interface{}
	if err := json.Unmarshal(contentJson, &root); err != nil {
		return fmt.Errorf("contentJson must be a valid JSON object")
	}

	if root == nil {
		return fmt.Errorf("contentJson is required")
	}

	version, ok := root["structureVersion"].(string)
	if !ok || version == "" {
		return fmt.Errorf("contentJson.structureVersion is required")
	}
	if version != "1.0" {
		return fmt.Errorf("contentJson.structureVersion must be 1.0")
	}

	sectionsIntf, ok := root["sections"]
	if !ok {
		return fmt.Errorf("contentJson.sections must be an array")
	}
	sections, ok := sectionsIntf.([]interface{})
	if !ok {
		return fmt.Errorf("contentJson.sections must be an array")
	}

	for i, secIntf := range sections {
		sec, ok := secIntf.(map[string]interface{})
		if !ok {
			return fmt.Errorf("contentJson.sections[%d] must be an object", i)
		}
		if err := validateSection(sec, i); err != nil {
			return err
		}
	}

	return nil
}

func validateSection(sec map[string]interface{}, idx int) error {
	secPath := fmt.Sprintf("contentJson.sections[%d]", idx)
	typeIntf, ok := sec["type"]
	if !ok {
		return fmt.Errorf("%s.type is required", secPath)
	}
	typeStr, ok := typeIntf.(string)
	if !ok || typeStr == "" {
		return fmt.Errorf("%s.type is required", secPath)
	}

	switch typeStr {
	case "VERSE":
		return validateVerseSection(sec, secPath)
	case "REFRAIN":
		return validateRefrainSection(sec, secPath)
	case "TEXT_ONLY_VERSES":
		return validateTextOnlyVersesSection(sec, secPath)
	default:
		return fmt.Errorf("%s.type '%s' is not supported", secPath, typeStr)
	}
}

func validateVerseSection(sec map[string]interface{}, secPath string) error {
	if lines, ok := sec["lines"]; ok && lines != nil {
		return validateLinesArray(lines, secPath+".lines", true)
	}
	return nil
}

func validateRefrainSection(sec map[string]interface{}, secPath string) error {
	if lines, ok := sec["lines"]; ok && lines != nil {
		return validateLinesArray(lines, secPath+".lines", false)
	}
	return nil
}

func validateTextOnlyVersesSection(sec map[string]interface{}, secPath string) error {
	versesIntf, ok := sec["verses"]
	if !ok || versesIntf == nil {
		return fmt.Errorf("%s.verses must be an object", secPath)
	}
	verses, ok := versesIntf.(map[string]interface{})
	if !ok {
		return fmt.Errorf("%s.verses must be an object", secPath)
	}
	if err := validateVerseNumberKeys(verses, secPath+".verses"); err != nil {
		return err
	}
	return validateObjectTextValues(verses, secPath+".verses")
}

func validateLinesArray(linesIntf interface{}, linesPath string, verseLines bool) error {
	lines, ok := linesIntf.([]interface{})
	if !ok {
		return fmt.Errorf("%s must be an array", linesPath)
	}

	for i, lineIntf := range lines {
		linePath := fmt.Sprintf("%s[%d]", linesPath, i)
		line, ok := lineIntf.(map[string]interface{})
		if !ok {
			return fmt.Errorf("%s must be an object", linePath)
		}

		if err := validateLineOrder(line, linePath); err != nil {
			return err
		}
		if err := validateOptionalText(line, "notation", linePath); err != nil {
			return err
		}

		if verseLines {
			if lbv, ok := line["lyricsByVerse"]; ok && lbv != nil {
				lyrics, ok := lbv.(map[string]interface{})
				if !ok {
					return fmt.Errorf("%s.lyricsByVerse must be an object", linePath)
				}
				if err := validateVerseNumberKeys(lyrics, linePath+".lyricsByVerse"); err != nil {
					return err
				}
				if err := validateObjectTextValues(lyrics, linePath+".lyricsByVerse"); err != nil {
					return err
				}
			}
		} else {
			if err := validateOptionalText(line, "lyric", linePath); err != nil {
				return err
			}
		}
	}
	return nil
}

func validateLineOrder(line map[string]interface{}, linePath string) error {
	orderIntf, ok := line["lineOrder"]
	if !ok || orderIntf == nil {
		return nil
	}
	order, ok := orderIntf.(float64) // JSON numbers parse to float64 by default
	if !ok || order <= 0 || float64(int(order)) != order {
		return fmt.Errorf("%s.lineOrder must be a positive integer", linePath)
	}
	return nil
}

func validateOptionalText(obj map[string]interface{}, fieldName string, objPath string) error {
	valIntf, ok := obj[fieldName]
	if !ok || valIntf == nil {
		return nil
	}
	_, ok = valIntf.(string)
	if !ok {
		return fmt.Errorf("%s.%s must be text", objPath, fieldName)
	}
	return nil
}

func validateVerseNumberKeys(obj map[string]interface{}, objPath string) error {
	for k := range obj {
		if !verseNumberPattern.MatchString(k) {
			return fmt.Errorf("%s keys must be positive verse numbers", objPath)
		}
	}
	return nil
}

func validateObjectTextValues(obj map[string]interface{}, objPath string) error {
	for k, v := range obj {
		if _, ok := v.(string); !ok {
			return fmt.Errorf("%s.%s must be text", objPath, k)
		}
	}
	return nil
}

package com.songslide.arrangement;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class ArrangementContentValidator {

    private static final String STRUCTURE_VERSION = "1.0";
    private static final Set<String> SUPPORTED_SECTION_TYPES = Set.of(
            "VERSE",
            "REFRAIN",
            "TEXT_ONLY_VERSES"
    );
    private static final Pattern VERSE_NUMBER_PATTERN = Pattern.compile("[1-9][0-9]*");

    public void validate(JsonNode contentJson) {
        if (contentJson == null || contentJson.isNull()) {
            throw new IllegalArgumentException("contentJson is required");
        }
        if (!contentJson.isObject()) {
            throw new IllegalArgumentException("contentJson must be an object");
        }

        JsonNode structureVersion = contentJson.get("structureVersion");
        if (structureVersion == null || !structureVersion.isTextual() || structureVersion.asText().isBlank()) {
            throw new IllegalArgumentException("contentJson.structureVersion is required");
        }
        if (!STRUCTURE_VERSION.equals(structureVersion.asText())) {
            throw new IllegalArgumentException("contentJson.structureVersion must be 1.0");
        }

        JsonNode sections = contentJson.get("sections");
        if (sections == null || !sections.isArray()) {
            throw new IllegalArgumentException("contentJson.sections must be an array");
        }

        for (int sectionIndex = 0; sectionIndex < sections.size(); sectionIndex++) {
            validateSection(sections.get(sectionIndex), sectionIndex);
        }
    }

    private void validateSection(JsonNode section, int sectionIndex) {
        String sectionPath = "contentJson.sections[" + sectionIndex + "]";
        if (section == null || !section.isObject()) {
            throw new IllegalArgumentException(sectionPath + " must be an object");
        }

        JsonNode typeNode = section.get("type");
        if (typeNode == null || !typeNode.isTextual() || typeNode.asText().isBlank()) {
            throw new IllegalArgumentException(sectionPath + ".type is required");
        }

        String type = typeNode.asText();
        if (!SUPPORTED_SECTION_TYPES.contains(type)) {
            throw new IllegalArgumentException(sectionPath + ".type '" + type + "' is not supported");
        }

        switch (type) {
            case "VERSE" -> validateVerseSection(section, sectionPath);
            case "REFRAIN" -> validateRefrainSection(section, sectionPath);
            case "TEXT_ONLY_VERSES" -> validateTextOnlyVersesSection(section, sectionPath);
            default -> throw new IllegalArgumentException(sectionPath + ".type '" + type + "' is not supported");
        }
    }

    private void validateVerseSection(JsonNode section, String sectionPath) {
        JsonNode lines = section.get("lines");
        if (lines != null) {
            validateLinesArray(lines, sectionPath + ".lines", true);
        }
    }

    private void validateRefrainSection(JsonNode section, String sectionPath) {
        JsonNode lines = section.get("lines");
        if (lines != null) {
            validateLinesArray(lines, sectionPath + ".lines", false);
        }
    }

    private void validateTextOnlyVersesSection(JsonNode section, String sectionPath) {
        JsonNode verses = section.get("verses");
        if (verses == null || !verses.isObject()) {
            throw new IllegalArgumentException(sectionPath + ".verses must be an object");
        }
        validateVerseNumberKeys(verses, sectionPath + ".verses");
        validateObjectTextValues(verses, sectionPath + ".verses");
    }

    private void validateLinesArray(JsonNode lines, String linesPath, boolean verseLines) {
        if (!lines.isArray()) {
            throw new IllegalArgumentException(linesPath + " must be an array");
        }

        for (int lineIndex = 0; lineIndex < lines.size(); lineIndex++) {
            JsonNode line = lines.get(lineIndex);
            String linePath = linesPath + "[" + lineIndex + "]";
            if (line == null || !line.isObject()) {
                throw new IllegalArgumentException(linePath + " must be an object");
            }

            validateLineOrder(line, linePath);
            validateOptionalText(line, "notation", linePath);

            if (verseLines) {
                JsonNode lyricsByVerse = line.get("lyricsByVerse");
                if (lyricsByVerse != null) {
                    if (!lyricsByVerse.isObject()) {
                        throw new IllegalArgumentException(linePath + ".lyricsByVerse must be an object");
                    }
                    validateVerseNumberKeys(lyricsByVerse, linePath + ".lyricsByVerse");
                    validateObjectTextValues(lyricsByVerse, linePath + ".lyricsByVerse");
                }
            } else {
                validateOptionalText(line, "lyric", linePath);
            }
        }
    }

    private void validateLineOrder(JsonNode line, String linePath) {
        JsonNode lineOrder = line.get("lineOrder");
        if (lineOrder == null) {
            return;
        }
        if (!lineOrder.isIntegralNumber() || lineOrder.asInt() <= 0) {
            throw new IllegalArgumentException(linePath + ".lineOrder must be a positive integer");
        }
    }

    private void validateOptionalText(JsonNode object, String fieldName, String objectPath) {
        JsonNode value = object.get(fieldName);
        if (value != null && !value.isTextual()) {
            throw new IllegalArgumentException(objectPath + "." + fieldName + " must be text");
        }
    }

    private void validateVerseNumberKeys(JsonNode object, String objectPath) {
        object.fieldNames().forEachRemaining(fieldName -> {
            if (!VERSE_NUMBER_PATTERN.matcher(fieldName).matches()) {
                throw new IllegalArgumentException(objectPath + " keys must be positive verse numbers");
            }
        });
    }

    private void validateObjectTextValues(JsonNode object, String objectPath) {
        object.fields().forEachRemaining(entry -> {
            if (!entry.getValue().isTextual()) {
                throw new IllegalArgumentException(objectPath + "." + entry.getKey() + " must be text");
            }
        });
    }
}

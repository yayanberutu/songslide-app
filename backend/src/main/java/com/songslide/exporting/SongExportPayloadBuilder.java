package com.songslide.exporting;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.songslide.arrangement.ArrangementContentValidator;
import com.songslide.song.Song;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Component;

@Component
public class SongExportPayloadBuilder {

    private static final Pattern VERSE_NUMBER_PATTERN = Pattern.compile("[1-9][0-9]*");
    private static final Set<String> THEMES = Set.of("LIGHT", "DARK");
    private static final Set<String> SLIDE_SIZES = Set.of("LAYOUT_WIDE", "LAYOUT_4X3", "16:9", "4:3");

    private final ArrangementContentValidator contentValidator;
    private final ObjectMapper objectMapper;

    public SongExportPayloadBuilder(
            ArrangementContentValidator contentValidator,
            ObjectMapper objectMapper
    ) {
        this.contentValidator = contentValidator;
        this.objectMapper = objectMapper;
    }

    ExportBuildResult build(
            Song song,
            JsonNode contentJson,
            List<String> selectedVerses,
            RefrainMode refrainMode,
            SongExportFormat outputFormat,
            ExportLayoutRequest layoutRequest
    ) {
        contentValidator.validate(contentJson);

        List<String> normalizedVerses = normalizeSelectedVerses(selectedVerses);
        validateSelectedVerses(contentJson, normalizedVerses);

        ExportServicePayload.Layout layout = normalizeLayout(layoutRequest);
        ExportServicePayload.Output output = output(outputFormat, layoutRequest);
        List<ExportServicePayload.Slide> slides = buildSlides(song, contentJson, normalizedVerses, refrainMode);
        if (slides.isEmpty()) {
            throw new IllegalArgumentException("Export request did not produce any slides");
        }

        ExportServicePayload payload = new ExportServicePayload(slides, layout, output);
        return new ExportBuildResult(payload, normalizedVerses, optionsJson(layout, output));
    }

    private List<String> normalizeSelectedVerses(List<String> selectedVerses) {
        if (selectedVerses == null || selectedVerses.isEmpty()) {
            throw new IllegalArgumentException("selectedVerses is required");
        }

        List<String> normalized = new ArrayList<>();
        for (String selectedVerse : selectedVerses) {
            if (selectedVerse == null) {
                throw new IllegalArgumentException("selectedVerses values must be positive verse numbers");
            }
            String value = selectedVerse.trim();
            if (!VERSE_NUMBER_PATTERN.matcher(value).matches()) {
                throw new IllegalArgumentException("selectedVerses values must be positive verse numbers");
            }
            normalized.add(value);
        }
        return List.copyOf(normalized);
    }

    private void validateSelectedVerses(JsonNode contentJson, List<String> selectedVerses) {
        Set<String> availableVerses = collectAvailableVerses(contentJson);
        for (String selectedVerse : selectedVerses) {
            if (!availableVerses.contains(selectedVerse)) {
                throw new IllegalArgumentException("selectedVerses contains unavailable verse: " + selectedVerse);
            }
        }
    }

    private Set<String> collectAvailableVerses(JsonNode contentJson) {
        Set<String> verses = new HashSet<>();
        for (JsonNode section : iterable(contentJson.path("sections"))) {
            String type = text(section.get("type"));
            if ("VERSE".equals(type)) {
                collectVerseSectionVerses(section, verses);
            } else if ("TEXT_ONLY_VERSES".equals(type)) {
                section.path("verses").fieldNames().forEachRemaining(verses::add);
            }
        }
        return verses;
    }

    private void collectVerseSectionVerses(JsonNode section, Set<String> verses) {
        for (JsonNode line : sortedLines(section.path("lines"))) {
            JsonNode lyricsByVerse = line.path("lyricsByVerse");
            if (lyricsByVerse.isObject()) {
                lyricsByVerse.fieldNames().forEachRemaining(verses::add);
            }
        }
    }

    private List<ExportServicePayload.Slide> buildSlides(
            Song song,
            JsonNode contentJson,
            List<String> selectedVerses,
            RefrainMode refrainMode
    ) {
        List<ExportServicePayload.Slide> slides = new ArrayList<>();
        String title = slideTitle(song);
        String metadata = slideMetadata(song);

        for (String selectedVerse : selectedVerses) {
            appendVerseSlides(slides, contentJson, selectedVerse, title, metadata);
            appendTextOnlyVerseSlides(slides, contentJson, selectedVerse, title, metadata);

            if (refrainMode == RefrainMode.AFTER_EACH_VERSE) {
                appendRefrainSlides(slides, contentJson, title, metadata);
            }
        }

        if (refrainMode == RefrainMode.ONCE_AFTER_ALL_VERSES) {
            appendRefrainSlides(slides, contentJson, title, metadata);
        }

        return List.copyOf(slides);
    }

    private void appendVerseSlides(
            List<ExportServicePayload.Slide> slides,
            JsonNode contentJson,
            String verseNumber,
            String title,
            String metadata
    ) {
        for (JsonNode section : sectionsOfType(contentJson, "VERSE")) {
            if (!sectionHasVerse(section, verseNumber)) {
                continue;
            }

            List<ExportServicePayload.Line> lines = new ArrayList<>();
            for (JsonNode line : sortedLines(section.path("lines"))) {
                String lyric = text(line.path("lyricsByVerse").get(verseNumber));
                String notation = text(line.get("notation"));
                addLine(lines, notation, lyric);
            }

            if (!lines.isEmpty()) {
                slides.add(new ExportServicePayload.Slide(
                        title,
                        label(section, "Ayat") + " " + verseNumber,
                        metadata,
                        List.copyOf(lines)
                ));
            }
        }
    }

    private void appendTextOnlyVerseSlides(
            List<ExportServicePayload.Slide> slides,
            JsonNode contentJson,
            String verseNumber,
            String title,
            String metadata
    ) {
        for (JsonNode section : sectionsOfType(contentJson, "TEXT_ONLY_VERSES")) {
            String lyric = text(section.path("verses").get(verseNumber));
            if (hasText(lyric)) {
                slides.add(new ExportServicePayload.Slide(
                        title,
                        label(section, "Ayat Tambahan") + " " + verseNumber,
                        metadata,
                        List.of(new ExportServicePayload.Line(null, lyric))
                ));
            }
        }
    }

    private void appendRefrainSlides(
            List<ExportServicePayload.Slide> slides,
            JsonNode contentJson,
            String title,
            String metadata
    ) {
        for (JsonNode section : sectionsOfType(contentJson, "REFRAIN")) {
            List<ExportServicePayload.Line> lines = new ArrayList<>();
            for (JsonNode line : sortedLines(section.path("lines"))) {
                addLine(lines, text(line.get("notation")), text(line.get("lyric")));
            }

            if (!lines.isEmpty()) {
                slides.add(new ExportServicePayload.Slide(
                        title,
                        label(section, "Refrein"),
                        metadata,
                        List.copyOf(lines)
                ));
            }
        }
    }

    private boolean sectionHasVerse(JsonNode section, String verseNumber) {
        for (JsonNode line : sortedLines(section.path("lines"))) {
            JsonNode lyricsByVerse = line.path("lyricsByVerse");
            if (lyricsByVerse.isObject() && lyricsByVerse.has(verseNumber)) {
                return true;
            }
        }
        return false;
    }

    private List<JsonNode> sectionsOfType(JsonNode contentJson, String type) {
        List<JsonNode> sections = new ArrayList<>();
        for (JsonNode section : iterable(contentJson.path("sections"))) {
            if (type.equals(text(section.get("type")))) {
                sections.add(section);
            }
        }
        return sections;
    }

    private List<JsonNode> sortedLines(JsonNode linesNode) {
        if (!linesNode.isArray()) {
            return List.of();
        }
        return StreamSupport.stream(linesNode.spliterator(), false)
                .sorted(Comparator.comparingInt(this::lineOrder))
                .toList();
    }

    private int lineOrder(JsonNode line) {
        JsonNode lineOrder = line.get("lineOrder");
        if (lineOrder == null || !lineOrder.isIntegralNumber()) {
            return Integer.MAX_VALUE;
        }
        return lineOrder.asInt();
    }

    private void addLine(List<ExportServicePayload.Line> lines, String notation, String lyric) {
        String cleanNotation = hasText(notation) ? notation : null;
        String cleanLyric = hasText(lyric) ? lyric : null;
        if (cleanNotation != null || cleanLyric != null) {
            lines.add(new ExportServicePayload.Line(cleanNotation, cleanLyric));
        }
    }

    private String slideTitle(Song song) {
        return "%s %s - %s".formatted(
                song.getSongBook().getCode(),
                song.getSongNumber(),
                song.getTitle()
        );
    }

    private String slideMetadata(Song song) {
        LinkedHashSet<String> parts = new LinkedHashSet<>();
        if (hasText(song.getKeySignature())) {
            parts.add("Do = " + song.getKeySignature());
        }
        if (hasText(song.getTimeSignature())) {
            parts.add(song.getTimeSignature());
        }
        if (song.getTempoBpm() != null) {
            parts.add(song.getTempoBpm() + " BPM");
        }
        if (parts.isEmpty()) {
            return null;
        }
        return String.join(" | ", parts);
    }

    private String label(JsonNode section, String fallback) {
        String label = text(section.get("label"));
        return hasText(label) ? label : fallback;
    }

    private ExportServicePayload.Layout normalizeLayout(ExportLayoutRequest request) {
        String theme = request == null || !hasText(request.theme())
                ? "LIGHT"
                : request.theme().trim().toUpperCase(Locale.ROOT);
        if (!THEMES.contains(theme)) {
            throw new IllegalArgumentException("layout.theme must be LIGHT or DARK");
        }

        String slideSize = request == null || !hasText(request.slideSize())
                ? "LAYOUT_WIDE"
                : request.slideSize().trim().toUpperCase(Locale.ROOT);
        if (!SLIDE_SIZES.contains(slideSize)) {
            throw new IllegalArgumentException("layout.slideSize is not supported");
        }

        boolean showNotation = request == null || request.showNotation() == null || request.showNotation();
        return new ExportServicePayload.Layout(theme, showNotation, slideSize);
    }

    private ExportServicePayload.Output output(SongExportFormat outputFormat, ExportLayoutRequest request) {
        Integer imageWidth = null;
        Integer imageHeight = null;
        if (request != null) {
            imageWidth = validatePositiveDimension(request.imageWidth(), "layout.imageWidth");
            imageHeight = validatePositiveDimension(request.imageHeight(), "layout.imageHeight");
        }
        return new ExportServicePayload.Output(
                "songslide-export." + outputFormat.fileExtension(),
                imageWidth,
                imageHeight
        );
    }

    private Integer validatePositiveDimension(Integer value, String fieldName) {
        if (value != null && value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be positive");
        }
        return value;
    }

    private JsonNode optionsJson(ExportServicePayload.Layout layout, ExportServicePayload.Output output) {
        ObjectNode options = objectMapper.createObjectNode();
        ObjectNode layoutNode = options.putObject("layout");
        layoutNode.put("theme", layout.theme());
        layoutNode.put("showNotation", layout.showNotation());
        layoutNode.put("slideSize", layout.slideSize());

        ObjectNode outputNode = options.putObject("output");
        outputNode.put("fileName", output.fileName());
        if (output.imageWidth() != null) {
            outputNode.put("imageWidth", output.imageWidth());
        }
        if (output.imageHeight() != null) {
            outputNode.put("imageHeight", output.imageHeight());
        }
        return options;
    }

    private Iterable<JsonNode> iterable(JsonNode node) {
        return () -> {
            if (node == null || !node.isArray()) {
                return List.<JsonNode>of().iterator();
            }
            return node.elements();
        };
    }

    private String text(JsonNode node) {
        if (node == null || !node.isTextual()) {
            return null;
        }
        return node.asText();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

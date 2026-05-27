package com.songslide.exporting;

import com.fasterxml.jackson.databind.JsonNode;
import com.songslide.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SongExportController {

    private final SongExportService songExportService;

    public SongExportController(SongExportService songExportService) {
        this.songExportService = songExportService;
    }

    @PostMapping("/songs/{songId}/exports")
    public ApiResponse<SongExportResponse> create(
            @PathVariable UUID songId,
            @Valid @RequestBody SongExportRequest request
    ) {
        return ApiResponse.success(songExportService.createExport(songId, request));
    }

    @GetMapping("/exports/{exportId}/download")
    public ResponseEntity<byte[]> download(@PathVariable UUID exportId) {
        SongExport songExport = songExportService.getCompletedExportWithMetadata(exportId);
        byte[] file = songExportService.readExportFile(songExport);

        String bookCode = songExport.getSong().getSongBook().getCode();
        String songNumber = songExport.getSong().getSongNumber();
        List<String> versesList = parseAndSortVerses(songExport.getSelectedVersesJson());
        String verses = versesList.isEmpty() ? "" : " - " + String.join(",", versesList);

        String rawBaseName = "";
        if (bookCode != null && !bookCode.isBlank() && songNumber != null && !songNumber.isBlank()) {
            rawBaseName = bookCode + " " + songNumber + verses;
        }

        String sanitizedBaseName = sanitizeFilename(rawBaseName);
        if (sanitizedBaseName.isBlank()) {
            sanitizedBaseName = "songslide-export";
        }

        String fileName = sanitizedBaseName + "." + songExport.getFormat().fileExtension();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(songExport.getFormat().contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(fileName)
                        .build()
                        .toString())
                .body(file);
    }

    private List<String> parseAndSortVerses(JsonNode selectedVersesJson) {
        if (selectedVersesJson == null || !selectedVersesJson.isArray()) {
            return List.of();
        }
        List<String> verses = new ArrayList<>();
        selectedVersesJson.forEach(node -> verses.add(node.asText()));
        verses.sort((a, b) -> {
            try {
                return Integer.compare(Integer.parseInt(a), Integer.parseInt(b));
            } catch (NumberFormatException e) {
                return a.compareTo(b);
            }
        });
        return verses;
    }

    private String sanitizeFilename(String baseName) {
        if (baseName == null || baseName.isBlank()) return "";
        // Remove unsafe characters, keeping alphanumeric, spaces, dash, comma, dot
        String clean = baseName.replaceAll("[^a-zA-Z0-9 \\-\\.,]", "");
        // Remove path traversal-related characters
        clean = clean.replaceAll("\\.{2,}", "");
        // Collapse multiple spaces into one and trim
        clean = clean.replaceAll(" +", " ").trim();
        // Remove leading and trailing spaces, dashes, commas, and dots
        clean = clean.replaceAll("^[ \\-\\.,]+|[ \\-\\.,]+$", "");
        // Final space collapse and trim just in case
        return clean.replaceAll(" +", " ").trim();
    }
}

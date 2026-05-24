package com.songslide.exporting;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.Locale;

public enum SongExportFormat {
    PPTX,
    PNG;

    @JsonCreator
    public static SongExportFormat from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("outputFormat is required");
        }
        return SongExportFormat.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }

    String exportPath() {
        return switch (this) {
            case PPTX -> "/export/pptx";
            case PNG -> "/export/png";
        };
    }

    String fileExtension() {
        return switch (this) {
            case PPTX -> "pptx";
            case PNG -> "zip";
        };
    }

    String contentType() {
        return switch (this) {
            case PPTX -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case PNG -> "application/zip";
        };
    }
}

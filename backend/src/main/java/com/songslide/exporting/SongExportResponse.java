package com.songslide.exporting;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SongExportResponse(
        UUID id,
        UUID songId,
        UUID arrangementId,
        SongExportFormat outputFormat,
        SongExportStatus status,
        List<String> selectedVerses,
        RefrainMode refrainMode,
        String storageKey,
        String downloadUrl,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}

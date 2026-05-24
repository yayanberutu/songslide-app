package com.songslide.sourceimage;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SongSourceImageResponse(
        UUID id,
        UUID songId,
        String storageKey,
        String originalFilename,
        String contentType,
        long sizeBytes,
        Integer pageNumber,
        Integer widthPx,
        Integer heightPx,
        String contentUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}

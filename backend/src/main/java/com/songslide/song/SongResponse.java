package com.songslide.song;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SongResponse(
        UUID id,
        String songNumber,
        String title,
        String defaultKey,
        String timeSignature,
        Integer tempo,
        String authorText,
        String sourceNote,
        SongBookSummaryResponse songBook,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}

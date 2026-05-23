package com.songslide.songbook;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SongBookResponse(
        UUID id,
        String code,
        String name,
        String description,
        Integer displayOrder,
        Boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}

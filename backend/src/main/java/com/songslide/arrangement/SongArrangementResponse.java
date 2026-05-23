package com.songslide.arrangement;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SongArrangementResponse(
        UUID id,
        UUID songId,
        String name,
        Boolean isDefault,
        JsonNode contentJson,
        JsonNode layoutJson,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}

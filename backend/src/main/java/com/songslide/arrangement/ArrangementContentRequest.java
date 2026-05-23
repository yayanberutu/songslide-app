package com.songslide.arrangement;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

public record ArrangementContentRequest(
        @NotNull(message = "contentJson is required")
        JsonNode contentJson
) {
}

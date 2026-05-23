package com.songslide.song;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record SongRequest(
        UUID songBookId,

        @Size(max = 16, message = "bookCode must be at most 16 characters")
        String bookCode,

        @NotBlank(message = "songNumber is required")
        @Size(max = 32, message = "songNumber must be at most 32 characters")
        String songNumber,

        @NotBlank(message = "title is required")
        @Size(max = 255, message = "title must be at most 255 characters")
        String title,

        @Size(max = 32, message = "defaultKey must be at most 32 characters")
        String defaultKey,

        @Size(max = 32, message = "timeSignature must be at most 32 characters")
        String timeSignature,

        @Positive(message = "tempo must be positive")
        Integer tempo,

        @Size(max = 255, message = "authorText must be at most 255 characters")
        String authorText,

        String sourceNote
) {
}

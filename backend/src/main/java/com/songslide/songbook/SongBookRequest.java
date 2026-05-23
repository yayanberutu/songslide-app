package com.songslide.songbook;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record SongBookRequest(
        @NotBlank(message = "code is required")
        @Size(max = 16, message = "code must be at most 16 characters")
        String code,

        @NotBlank(message = "name is required")
        @Size(max = 255, message = "name must be at most 255 characters")
        String name,

        String description,

        @PositiveOrZero(message = "displayOrder must be zero or positive")
        Integer displayOrder,

        Boolean active
) {
}

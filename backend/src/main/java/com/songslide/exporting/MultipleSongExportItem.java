package com.songslide.exporting;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MultipleSongExportItem(
        @NotBlank(message = "bookCode is required")
        String bookCode,

        @NotBlank(message = "songNumber is required")
        String songNumber,

        @NotEmpty(message = "selectedVerses is required")
        List<String> selectedVerses,

        @NotNull(message = "refrainMode is required")
        RefrainMode refrainMode,

        @NotNull(message = "order is required")
        Integer order
) {
}

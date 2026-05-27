package com.songslide.exporting;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MultipleSongExportRequest(
        @NotBlank(message = "fileName is required")
        String fileName,

        @NotNull(message = "outputFormat is required")
        SongExportFormat outputFormat,

        @Valid
        ExportLayoutRequest layout,

        @NotEmpty(message = "items is required")
        @Valid
        List<MultipleSongExportItem> items
) {
}

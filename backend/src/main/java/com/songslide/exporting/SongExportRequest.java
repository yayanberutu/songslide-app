package com.songslide.exporting;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record SongExportRequest(
        @NotNull(message = "arrangementId is required")
        UUID arrangementId,

        @NotEmpty(message = "selectedVerses is required")
        List<String> selectedVerses,

        @NotNull(message = "refrainMode is required")
        RefrainMode refrainMode,

        @NotNull(message = "outputFormat is required")
        SongExportFormat outputFormat,

        @Valid
        ExportLayoutRequest layout
) {
}

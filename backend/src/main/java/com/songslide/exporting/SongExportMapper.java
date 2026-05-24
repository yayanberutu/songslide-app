package com.songslide.exporting;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;

final class SongExportMapper {

    private SongExportMapper() {
    }

    static SongExportResponse toResponse(SongExport songExport) {
        return new SongExportResponse(
                songExport.getId(),
                songExport.getSong().getId(),
                songExport.getArrangement().getId(),
                songExport.getFormat(),
                songExport.getStatus(),
                selectedVerses(songExport.getSelectedVersesJson()),
                songExport.getRefrainMode(),
                songExport.getStorageKey(),
                downloadUrl(songExport),
                songExport.getErrorMessage(),
                songExport.getCreatedAt(),
                songExport.getUpdatedAt()
        );
    }

    private static List<String> selectedVerses(JsonNode selectedVersesJson) {
        if (selectedVersesJson == null || !selectedVersesJson.isArray()) {
            return List.of();
        }
        List<String> selectedVerses = new ArrayList<>();
        selectedVersesJson.elements().forEachRemaining(verse -> selectedVerses.add(verse.asText()));
        return List.copyOf(selectedVerses);
    }

    private static String downloadUrl(SongExport songExport) {
        if (songExport.getStatus() != SongExportStatus.COMPLETED || songExport.getStorageKey() == null) {
            return null;
        }
        return "/api/exports/" + songExport.getId() + "/download";
    }
}

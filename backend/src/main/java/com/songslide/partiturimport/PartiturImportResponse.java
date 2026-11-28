package com.songslide.partiturimport;

import java.util.List;

public record PartiturImportResponse(
        String status,
        String rawFileStorageKey,
        String originalFilename,
        String detectedKeySignature,
        String detectedTimeSignature,
        int noteCount,
        int measureCount,
        List<String> lines,
        String rawNotation,
        List<String> warnings
) {
}

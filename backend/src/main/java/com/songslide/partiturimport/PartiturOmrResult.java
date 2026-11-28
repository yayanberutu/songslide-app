package com.songslide.partiturimport;

import java.util.List;

public record PartiturOmrResult(
        String status,
        String detectedKeySignature,
        String detectedTimeSignature,
        int noteCount,
        int measureCount,
        List<String> lines,
        String rawNotation,
        List<String> warnings
) {
}

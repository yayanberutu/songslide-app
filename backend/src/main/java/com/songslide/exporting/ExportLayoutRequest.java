package com.songslide.exporting;

public record ExportLayoutRequest(
        String theme,
        Boolean showNotation,
        String slideSize,
        String textSizePreset,
        Integer imageWidth,
        Integer imageHeight
) {
}

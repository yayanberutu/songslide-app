package com.songslide.exporting;

public record ExportLayoutRequest(
        String theme,
        Boolean showNotation,
        String slideSize,
        Integer imageWidth,
        Integer imageHeight
) {
}

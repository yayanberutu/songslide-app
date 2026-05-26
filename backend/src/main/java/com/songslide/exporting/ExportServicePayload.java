package com.songslide.exporting;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExportServicePayload(
        List<Slide> slides,
        Layout layout,
        Output output
) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Slide(
            String title,
            String subtitle,
            String metadata,
            List<Line> lines
    ) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Line(
            String notation,
            String lyric
    ) {
    }

    public record Layout(
            String theme,
            boolean showNotation,
            String slideSize,
            String textSizePreset
    ) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Output(
            String fileName,
            Integer imageWidth,
            Integer imageHeight
    ) {
    }
}

package com.songslide.exporting;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

record ExportBuildResult(
        ExportServicePayload payload,
        List<String> selectedVerses,
        JsonNode optionsJson
) {
}

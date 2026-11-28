package com.songslide.partiturimport;

import com.songslide.common.api.ApiResponse;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class PartiturImportController {

    private final PartiturImportService importService;

    public PartiturImportController(PartiturImportService importService) {
        this.importService = importService;
    }

    @PostMapping(
            value = "/songs/{songId}/partitur-import",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResponse<PartiturImportResponse> importPartitur(
            @PathVariable UUID songId,
            @RequestPart("file") MultipartFile file
    ) {
        return ApiResponse.success(importService.importPartitur(songId, file));
    }
}

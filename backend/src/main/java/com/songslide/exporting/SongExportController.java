package com.songslide.exporting;

import com.songslide.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SongExportController {

    private final SongExportService songExportService;

    public SongExportController(SongExportService songExportService) {
        this.songExportService = songExportService;
    }

    @PostMapping("/songs/{songId}/exports")
    public ApiResponse<SongExportResponse> create(
            @PathVariable UUID songId,
            @Valid @RequestBody SongExportRequest request
    ) {
        return ApiResponse.success(songExportService.createExport(songId, request));
    }

    @GetMapping("/exports/{exportId}/download")
    public ResponseEntity<byte[]> download(@PathVariable UUID exportId) {
        SongExport songExport = songExportService.getCompletedExport(exportId);
        byte[] file = songExportService.readExportFile(songExport);
        String fileName = "songslide-export." + songExport.getFormat().fileExtension();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(songExport.getFormat().contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(fileName)
                        .build()
                        .toString())
                .body(file);
    }
}

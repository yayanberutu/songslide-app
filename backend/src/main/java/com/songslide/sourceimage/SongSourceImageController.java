package com.songslide.sourceimage;

import com.songslide.common.api.ApiResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class SongSourceImageController {

    private final SongSourceImageService sourceImageService;

    public SongSourceImageController(SongSourceImageService sourceImageService) {
        this.sourceImageService = sourceImageService;
    }

    @PostMapping(
            value = "/songs/{songId}/source-images",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResponse<SongSourceImageResponse> upload(
            @PathVariable UUID songId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) Integer pageNumber
    ) {
        return ApiResponse.success(sourceImageService.upload(songId, file, pageNumber));
    }

    @GetMapping("/songs/{songId}/source-images")
    public ApiResponse<List<SongSourceImageResponse>> list(@PathVariable UUID songId) {
        return ApiResponse.success(sourceImageService.list(songId));
    }

    @GetMapping("/source-images/{sourceImageId}/content")
    public ResponseEntity<byte[]> content(@PathVariable UUID sourceImageId) {
        SongSourceImageService.SongSourceImageFile file = sourceImageService.getFile(sourceImageId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(file.originalFilename())
                        .build()
                        .toString())
                .body(file.content());
    }
}

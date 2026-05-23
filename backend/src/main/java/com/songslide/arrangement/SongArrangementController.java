package com.songslide.arrangement;

import com.songslide.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SongArrangementController {

    private final SongArrangementService songArrangementService;

    public SongArrangementController(SongArrangementService songArrangementService) {
        this.songArrangementService = songArrangementService;
    }

    @PostMapping("/songs/{songId}/arrangements/default")
    public ApiResponse<SongArrangementResponse> createDefault(@PathVariable UUID songId) {
        return ApiResponse.success(songArrangementService.createDefault(songId));
    }

    @GetMapping("/songs/{songId}/arrangements/default")
    public ApiResponse<SongArrangementResponse> getDefault(@PathVariable UUID songId) {
        return ApiResponse.success(songArrangementService.getDefault(songId));
    }

    @GetMapping("/arrangements/{arrangementId}")
    public ApiResponse<SongArrangementResponse> get(@PathVariable UUID arrangementId) {
        return ApiResponse.success(songArrangementService.get(arrangementId));
    }

    @PutMapping("/arrangements/{arrangementId}/content")
    public ApiResponse<SongArrangementResponse> updateContent(
            @PathVariable UUID arrangementId,
            @Valid @RequestBody ArrangementContentRequest request
    ) {
        return ApiResponse.success(songArrangementService.updateContent(arrangementId, request));
    }
}

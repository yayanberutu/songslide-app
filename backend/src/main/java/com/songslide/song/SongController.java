package com.songslide.song;

import com.songslide.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/songs")
public class SongController {

    private final SongService songService;

    public SongController(SongService songService) {
        this.songService = songService;
    }

    @PostMapping
    public ApiResponse<SongResponse> create(@Valid @RequestBody SongRequest request) {
        return ApiResponse.success(songService.create(request));
    }

    @GetMapping
    public ApiResponse<List<SongResponse>> list(
            @RequestParam(required = false) String bookCode,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String songNumber
    ) {
        return ApiResponse.success(songService.list(bookCode, title, songNumber));
    }

    @GetMapping("/{id}")
    public ApiResponse<SongResponse> get(@PathVariable UUID id) {
        return ApiResponse.success(songService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<SongResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody SongRequest request
    ) {
        return ApiResponse.success(songService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<DeleteSongResponse> delete(@PathVariable UUID id) {
        songService.delete(id);
        return ApiResponse.success(new DeleteSongResponse(true));
    }
}

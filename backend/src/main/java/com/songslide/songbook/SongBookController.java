package com.songslide.songbook;

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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/song-books")
public class SongBookController {

    private final SongBookService songBookService;

    public SongBookController(SongBookService songBookService) {
        this.songBookService = songBookService;
    }

    @PostMapping
    public ApiResponse<SongBookResponse> create(@Valid @RequestBody SongBookRequest request) {
        return ApiResponse.success(songBookService.create(request));
    }

    @GetMapping
    public ApiResponse<List<SongBookResponse>> list() {
        return ApiResponse.success(songBookService.list());
    }

    @GetMapping("/{id}")
    public ApiResponse<SongBookResponse> get(@PathVariable UUID id) {
        return ApiResponse.success(songBookService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<SongBookResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody SongBookRequest request
    ) {
        return ApiResponse.success(songBookService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<DeleteSongBookResponse> delete(@PathVariable UUID id) {
        songBookService.delete(id);
        return ApiResponse.success(new DeleteSongBookResponse(true));
    }
}

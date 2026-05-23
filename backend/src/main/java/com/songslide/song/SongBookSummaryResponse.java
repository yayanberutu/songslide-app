package com.songslide.song;

import java.util.UUID;

public record SongBookSummaryResponse(
        UUID id,
        String code,
        String name
) {
}

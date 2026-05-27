package com.songslide.exporting;

import com.fasterxml.jackson.databind.JsonNode;
import com.songslide.song.Song;

public record MultipleSongExportItemContext(
        Song song,
        com.songslide.arrangement.SongArrangement arrangement,
        MultipleSongExportItem item
) {
}

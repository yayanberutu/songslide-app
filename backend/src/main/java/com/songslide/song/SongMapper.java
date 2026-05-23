package com.songslide.song;

import com.songslide.songbook.SongBook;

final class SongMapper {

    private SongMapper() {
    }

    static SongResponse toResponse(Song song) {
        SongBook songBook = song.getSongBook();
        SongBookSummaryResponse bookSummary = new SongBookSummaryResponse(
                songBook.getId(),
                songBook.getCode(),
                songBook.getName()
        );

        return new SongResponse(
                song.getId(),
                song.getSongNumber(),
                song.getTitle(),
                song.getKeySignature(),
                song.getTimeSignature(),
                song.getTempoBpm(),
                song.getAuthor(),
                song.getNotes(),
                bookSummary,
                song.getCreatedAt(),
                song.getUpdatedAt()
        );
    }
}

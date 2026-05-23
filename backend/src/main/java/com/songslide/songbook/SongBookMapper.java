package com.songslide.songbook;

final class SongBookMapper {

    private SongBookMapper() {
    }

    static SongBookResponse toResponse(SongBook songBook) {
        return new SongBookResponse(
                songBook.getId(),
                songBook.getCode(),
                songBook.getName(),
                songBook.getDescription(),
                songBook.getDisplayOrder(),
                songBook.getActive(),
                songBook.getCreatedAt(),
                songBook.getUpdatedAt()
        );
    }
}

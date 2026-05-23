package com.songslide.arrangement;

final class SongArrangementMapper {

    private SongArrangementMapper() {
    }

    static SongArrangementResponse toResponse(SongArrangement arrangement) {
        return new SongArrangementResponse(
                arrangement.getId(),
                arrangement.getSong().getId(),
                arrangement.getName(),
                arrangement.getIsDefault(),
                arrangement.getContentJson(),
                arrangement.getLayoutJson(),
                arrangement.getCreatedAt(),
                arrangement.getUpdatedAt()
        );
    }
}

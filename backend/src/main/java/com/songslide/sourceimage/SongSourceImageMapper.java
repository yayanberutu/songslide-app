package com.songslide.sourceimage;

final class SongSourceImageMapper {

    private SongSourceImageMapper() {
    }

    static SongSourceImageResponse toResponse(SongSourceImage sourceImage) {
        return new SongSourceImageResponse(
                sourceImage.getId(),
                sourceImage.getSong().getId(),
                sourceImage.getStorageKey(),
                sourceImage.getOriginalFilename(),
                sourceImage.getContentType(),
                sourceImage.getSizeBytes(),
                sourceImage.getPageNumber(),
                sourceImage.getWidthPx(),
                sourceImage.getHeightPx(),
                "/api/source-images/" + sourceImage.getId() + "/content",
                sourceImage.getCreatedAt(),
                sourceImage.getUpdatedAt()
        );
    }
}

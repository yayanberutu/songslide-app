ALTER TABLE song_source_images
    ADD COLUMN page_number INTEGER;

ALTER TABLE song_source_images
    ADD CONSTRAINT ck_song_source_images_page_number_positive
    CHECK (page_number IS NULL OR page_number > 0);

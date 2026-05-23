CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE song_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_song_books_code UNIQUE (code)
);

CREATE INDEX idx_song_books_active_display_order
    ON song_books (active, display_order);

CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_book_id UUID NOT NULL,
    song_number VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    key_signature VARCHAR(32),
    time_signature VARCHAR(32),
    tempo_bpm INTEGER,
    author VARCHAR(255),
    notes TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_songs_song_book
        FOREIGN KEY (song_book_id)
        REFERENCES song_books (id)
        ON DELETE RESTRICT,
    CONSTRAINT uk_songs_book_number UNIQUE (song_book_id, song_number),
    CONSTRAINT ck_songs_tempo_positive
        CHECK (tempo_bpm IS NULL OR tempo_bpm > 0)
);

CREATE INDEX idx_songs_book_number
    ON songs (song_book_id, song_number);

CREATE INDEX idx_songs_title_lower
    ON songs (lower(title));

CREATE INDEX idx_songs_updated_at
    ON songs (updated_at);

CREATE TABLE song_arrangements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Default',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    content_json JSONB NOT NULL,
    layout_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_song_arrangements_song
        FOREIGN KEY (song_id)
        REFERENCES songs (id)
        ON DELETE CASCADE,
    CONSTRAINT uk_song_arrangements_song_name UNIQUE (song_id, name),
    CONSTRAINT ck_song_arrangements_content_object
        CHECK (jsonb_typeof(content_json) = 'object'),
    CONSTRAINT ck_song_arrangements_layout_object
        CHECK (layout_json IS NULL OR jsonb_typeof(layout_json) = 'object')
);

CREATE INDEX idx_song_arrangements_song_id
    ON song_arrangements (song_id);

CREATE UNIQUE INDEX uk_song_arrangements_default_per_song
    ON song_arrangements (song_id)
    WHERE is_default = TRUE;

COMMENT ON TABLE song_arrangements IS
    'Song arrangement records. content_json is the canonical editable and renderable MVP song content store.';

COMMENT ON COLUMN song_arrangements.content_json IS
    'Canonical line-based song content JSONB document with VERSE, REFRAIN, and TEXT_ONLY_VERSES sections.';

CREATE TABLE song_source_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    width_px INTEGER,
    height_px INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_song_source_images_song
        FOREIGN KEY (song_id)
        REFERENCES songs (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_song_source_images_size_positive
        CHECK (size_bytes > 0),
    CONSTRAINT ck_song_source_images_width_positive
        CHECK (width_px IS NULL OR width_px > 0),
    CONSTRAINT ck_song_source_images_height_positive
        CHECK (height_px IS NULL OR height_px > 0)
);

CREATE INDEX idx_song_source_images_song_id
    ON song_source_images (song_id);

CREATE TABLE song_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL,
    song_arrangement_id UUID NOT NULL,
    format VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    selected_verses_json JSONB NOT NULL,
    refrain_mode VARCHAR(64) NOT NULL,
    options_json JSONB,
    storage_key VARCHAR(512),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_song_exports_song
        FOREIGN KEY (song_id)
        REFERENCES songs (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_song_exports_arrangement
        FOREIGN KEY (song_arrangement_id)
        REFERENCES song_arrangements (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_song_exports_format
        CHECK (format IN ('PPTX', 'PNG')),
    CONSTRAINT ck_song_exports_status
        CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    CONSTRAINT ck_song_exports_selected_verses_array
        CHECK (jsonb_typeof(selected_verses_json) = 'array'),
    CONSTRAINT ck_song_exports_refrain_mode
        CHECK (refrain_mode IN (
            'NONE',
            'ONCE_AFTER_ALL_VERSES',
            'AFTER_EACH_VERSE'
        )),
    CONSTRAINT ck_song_exports_options_object
        CHECK (options_json IS NULL OR jsonb_typeof(options_json) = 'object')
);

CREATE INDEX idx_song_exports_song_created_at
    ON song_exports (song_id, created_at);

CREATE INDEX idx_song_exports_status_created_at
    ON song_exports (status, created_at);

COMMENT ON COLUMN song_exports.selected_verses_json IS
    'Ordered JSONB array of selected verse numbers for preview/export rendering.';

COMMENT ON COLUMN song_exports.options_json IS
    'JSONB object for export layout and rendering options.';

INSERT INTO song_books (code, name, description, display_order)
VALUES
    ('BE', 'Buku Ende', 'Buku Ende song book', 1),
    ('KJ', 'Kidung Jemaat', 'Kidung Jemaat song book', 2),
    ('PKJ', 'Pelengkap Kidung Jemaat', 'Pelengkap Kidung Jemaat song book', 3),
    ('BNH', 'Buku Nyanyian HKBP', 'Buku Nyanyian HKBP song book', 4),
    ('NKB', 'Nyanyikanlah Kidung Baru', 'Nyanyikanlah Kidung Baru song book', 5);

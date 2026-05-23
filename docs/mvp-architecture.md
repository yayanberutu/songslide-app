# SongSlide MVP Architecture Plan

## Purpose

SongSlide is a local-first application for digitizing church song numbered notation and exporting selected song verses to PPTX and PNG. The MVP prioritizes reliable manual entry over OCR so it can run acceptably on a MacBook Pro 2017.

This document is the implementation blueprint for the MVP. It defines the architecture, canonical data model, API contracts, frontend page structure, export service contract, Docker Compose plan, implementation phases, acceptance criteria, and risks.

## Final Data Model Decision

The canonical editable and renderable song content structure is `song_arrangements.content_json`.

The MVP must not use `song_verses` or `notation_lines` as primary tables. Verse, refrain, text-only verse, notation line, and lyric line data all live inside `song_arrangements.content_json`.

Canonical MVP tables:

- `song_books`
- `songs`
- `song_arrangements`
- `song_source_images`
- `song_exports`

## Recommended Architecture

### Monorepo Layout

```text
/songslide-app
  /frontend
  /backend
  /export-service
  /ocr-service
  /docker
  /docs
  docker-compose.yml
  README.md
  .env.example
```

### Frontend

- Stack: Next.js, React, TypeScript, Tailwind CSS.
- Role: Operator UI for song book management, song management, source image upload, line-based arrangement editing, slide preview, and export flow.
- Runs locally during MVP development with the Next.js dev server.
- Reads and writes arrangement data through backend APIs. Operators should never edit raw JSON directly.

### Backend

- Stack: Spring Boot 3.x, Java 17 or 21.
- Role: Canonical data owner, PostgreSQL persistence, validation, local file storage, and export orchestration.
- Exposes REST APIs for books, songs, source images, arrangements, preview payloads, and exports.
- Stores uploaded source images and generated export files through a storage abstraction.

### Database

- Stack: PostgreSQL.
- Uses relational tables for catalog, file metadata, arrangement records, and export records.
- Uses JSONB for canonical arrangement content and flexible export options.

### Export Service

- Stack: Node.js, TypeScript, PptxGenJS, Playwright.
- Role: Stateless document renderer for PPTX and PNG.
- Receives fully prepared export payloads from the backend.
- Does not read PostgreSQL directly.
- Does not own business rules for song lookup or persistence.

### OCR Service

- Stack: Python FastAPI skeleton.
- OCR is optional and disabled by default.
- The MVP must run without OpenCV, PaddleOCR, model downloads, or GPU dependencies.
- Initial OCR endpoint should report disabled or not implemented status.

### Storage

- MVP storage: local filesystem.
- Future storage: Cloudflare R2 or S3-compatible storage behind the same backend storage abstraction.
- The frontend never writes files directly to storage.

### Deployment

- Local first with Docker Compose.
- Default Compose services: PostgreSQL, backend, frontend, export service.
- OCR service only starts with an explicit optional profile.
- Later VPS deployment can reuse Compose with production environment values, a reverse proxy, TLS, and volume backups.

## Database Schema

Use UUID primary keys unless implementation constraints suggest otherwise. Every table should include `created_at` and `updated_at` where useful.

### `song_books`

Stores managed song book catalogs such as BE, KJ, PKJ, BNH, and NKB.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Primary key |
| `code` | VARCHAR | Unique code, for example `BE` |
| `name` | VARCHAR | Display name |
| `description` | TEXT NULL | Optional description |
| `display_order` | INT | Stable UI ordering |
| `active` | BOOLEAN | Hide without deleting |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

Constraints and indexes:

- Unique index on `code`.
- Index on `(active, display_order)`.

### `songs`

Stores song catalog metadata.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Primary key |
| `song_book_id` | UUID FK | References `song_books.id` |
| `song_number` | VARCHAR | Book number. Use string to support suffixes if needed |
| `title` | VARCHAR | Song title |
| `key_signature` | VARCHAR NULL | Example: `C`, `G`, `F`, `1=C` |
| `time_signature` | VARCHAR NULL | Example: `4/4`, `3/4`, `6/8` |
| `tempo_bpm` | INT NULL | Optional tempo |
| `author` | VARCHAR NULL | Optional author |
| `notes` | TEXT NULL | Operator notes |
| `metadata_json` | JSONB NULL | Future-safe catalog metadata |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

Constraints and indexes:

- Foreign key from `song_book_id` to `song_books.id`.
- Unique index on `(song_book_id, song_number)`.
- Index on `(song_book_id, song_number)`.
- Index on lower or normalized `title` for basic search.

### `song_arrangements`

Stores canonical editable and renderable song content.

MVP behavior:

- Each song should have one default arrangement.
- The table can support multiple arrangements later, such as alternate keys or alternate slide layouts.
- `content_json` is the source of truth for line-based song content.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Primary key |
| `song_id` | UUID FK | References `songs.id` |
| `name` | VARCHAR | Example: `Default` |
| `is_default` | BOOLEAN | Exactly one default per song in MVP |
| `content_json` | JSONB NOT NULL | Canonical editable/renderable content |
| `layout_json` | JSONB NULL | Optional default preview/export layout preferences |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

Constraints and indexes:

- Foreign key from `song_id` to `songs.id`.
- Index on `song_id`.
- Unique partial index for one default arrangement per song, for example `(song_id) WHERE is_default = true`.
- Optional unique index on `(song_id, name)`.
- `content_json` must be valid JSON and validated by the backend service.

### `song_source_images`

Stores metadata for uploaded notation reference images.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Primary key |
| `song_id` | UUID FK | References `songs.id` |
| `storage_key` | VARCHAR | Local storage key or future object key |
| `original_filename` | VARCHAR | Uploaded filename |
| `content_type` | VARCHAR | `image/png` or `image/jpeg` |
| `size_bytes` | BIGINT | File size |
| `width_px` | INT NULL | Optional image width |
| `height_px` | INT NULL | Optional image height |
| `created_at` | TIMESTAMPTZ | Uploaded timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

Constraints and indexes:

- Foreign key from `song_id` to `songs.id`.
- Index on `song_id`.
- Backend validates content type, size, and storage path safety.

### `song_exports`

Stores export requests and generated file metadata.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | Primary key |
| `song_id` | UUID FK | References `songs.id` |
| `song_arrangement_id` | UUID FK | References `song_arrangements.id` |
| `format` | VARCHAR | `PPTX` or `PNG` |
| `status` | VARCHAR | `PENDING`, `COMPLETED`, `FAILED` |
| `selected_verses_json` | JSONB | Selected verse numbers, for example `["1", "2"]` |
| `refrain_mode` | VARCHAR | `NONE`, `ONCE_AFTER_ALL_VERSES`, `AFTER_EACH_VERSE` |
| `options_json` | JSONB NULL | Layout and export options |
| `storage_key` | VARCHAR NULL | Output file key when completed |
| `error_message` | TEXT NULL | Failure details |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

Constraints and indexes:

- Foreign key from `song_id` to `songs.id`.
- Foreign key from `song_arrangement_id` to `song_arrangements.id`.
- Index on `(song_id, created_at)`.
- Index on `(status, created_at)` if async export is added later.

## `content_json` Schema

`song_arrangements.content_json` is the MVP source of truth for entered lyrics, numbered notation, section structure, and renderable line order.

Expected shape:

```json
{
  "structureVersion": "1.0",
  "sections": [
    {
      "id": "verse",
      "type": "VERSE",
      "label": "Ayat",
      "repeatable": true,
      "lines": [
        {
          "lineOrder": 1,
          "notation": "5 .6 5 5 6 | 1 .2 1 .6",
          "lyricsByVerse": {
            "1": "Bi-la ku-re-nung do-sa-ku",
            "2": "Ra-sa ang-kuh dan som-bong-ku"
          }
        }
      ]
    },
    {
      "id": "refrain",
      "type": "REFRAIN",
      "label": "Refrein",
      "repeatable": false,
      "lines": [
        {
          "lineOrder": 1,
          "notation": "1 .2 3 3 2 | 3...0",
          "lyric": "Ka-sih sa-yang-Mu"
        }
      ]
    },
    {
      "id": "additional-verses",
      "type": "TEXT_ONLY_VERSES",
      "label": "Ayat Tambahan",
      "verses": {
        "3": "Text-only verse 3",
        "4": "Text-only verse 4"
      }
    }
  ]
}
```

### Top-Level Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `structureVersion` | string | Yes | MVP value is `1.0` |
| `sections` | array | Yes | Ordered render/edit sections |

### Section Types

Supported MVP section types:

- `VERSE`
- `REFRAIN`
- `TEXT_ONLY_VERSES`

Unknown section types should be rejected by backend validation in the MVP. Future versions can add new types by increasing `structureVersion`.

### `VERSE` Section

`VERSE` is repeatable. It stores notation once per line and lyric text per verse number.

Required fields:

- `id`: Stable section identifier.
- `type`: `VERSE`.
- `label`: UI label, for example `Ayat`.
- `repeatable`: `true`.
- `lines`: Ordered line array.

Line fields:

- `lineOrder`: Positive integer.
- `notation`: Numbered notation text for the line. Empty strings can be allowed for drafts.
- `lyricsByVerse`: Object keyed by verse number string, for example `"1"`, `"2"`.

Rendering behavior:

- For a selected verse number, the renderer uses the same notation line and selects `lyricsByVerse[selectedVerse]`.
- If the selected verse has no lyric for a line, render an empty lyric line or omit the lyric according to preview/export layout rules.

### `REFRAIN` Section

`REFRAIN` is not repeatable by verse number. It stores its own notation and lyric lines.

Required fields:

- `id`: Stable section identifier.
- `type`: `REFRAIN`.
- `label`: UI label, for example `Refrein`.
- `repeatable`: `false`.
- `lines`: Ordered line array.

Line fields:

- `lineOrder`: Positive integer.
- `notation`: Numbered notation text.
- `lyric`: Refrain lyric text.

Rendering behavior depends on `refrainMode`.

### `TEXT_ONLY_VERSES` Section

`TEXT_ONLY_VERSES` stores additional verses without notation. This supports cases where a song book has extra verse text but notation is only printed for the first one or two verses.

Required fields:

- `id`: Stable section identifier.
- `type`: `TEXT_ONLY_VERSES`.
- `label`: UI label, for example `Ayat Tambahan`.
- `verses`: Object keyed by verse number string.

Rendering behavior:

- If a selected verse number exists in `verses`, render it as text-only content.
- Text-only verses can be split into slide lines by newline or simple wrapping in preview/export rendering.

## Preview Generation

Preview must be generated from `song_arrangements.content_json`.

Inputs:

- Song metadata from `songs`.
- Arrangement content from `song_arrangements.content_json`.
- `selectedVerses`: ordered array of verse number strings.
- `refrainMode`: `NONE`, `ONCE_AFTER_ALL_VERSES`, or `AFTER_EACH_VERSE`.
- Optional layout options from `song_arrangements.layout_json` or request-level preview options.

### `selectedVerses`

`selectedVerses` controls which verse numbers are rendered and in what order.

Example:

```json
{
  "selectedVerses": ["1", "2", "4"]
}
```

Rules:

- Preserve the order provided by the user.
- A selected verse can render from `VERSE.lyricsByVerse`, `TEXT_ONLY_VERSES.verses`, or both if both are present.
- Missing selected verse content should not crash preview. It should show an empty state or validation warning.

### `refrainMode`

`refrainMode` controls how `REFRAIN` sections are inserted.

Allowed values:

- `NONE`: Do not render refrain sections.
- `ONCE_AFTER_ALL_VERSES`: Render all selected verse content first, then render refrain once.
- `AFTER_EACH_VERSE`: Render refrain after each selected verse.

### Preview Output Model

The frontend can derive a preview model from backend data, or the backend can provide a preview-normalized response. Either way, the normalized model should contain slide-ready blocks:

- Song heading metadata.
- Section label.
- Verse number when applicable.
- Ordered notation/lyric lines.
- Text-only verse blocks.

MVP preview may use a simple slide-like card layout. Pixel-perfect PowerPoint parity is not required, but line order, selected verse behavior, refrain behavior, and readability are required.

## Export Generation

Exports must be generated from `song_arrangements.content_json`.

The backend is responsible for:

- Loading `songs` metadata.
- Loading the selected `song_arrangements` row.
- Validating `content_json`.
- Applying `selectedVerses`.
- Applying `refrainMode`.
- Creating an export payload for the export service.
- Storing output metadata in `song_exports`.
- Saving output files through the storage abstraction.

The export service is responsible for:

- Rendering the provided payload to PPTX or PNG.
- Returning binary output or a generated artifact response.
- Avoiding direct database access.

The export service must not need to understand the full database schema. It should receive a render-ready payload.

## Backend REST API Contract

Base path: `/api`.

### Song Books

#### `GET /song-books`

Lists song books.

Response:

```json
[
  {
    "id": "uuid",
    "code": "BE",
    "name": "Buku Ende",
    "displayOrder": 1,
    "active": true
  }
]
```

#### `POST /song-books`

Creates a song book.

Request:

```json
{
  "code": "BE",
  "name": "Buku Ende",
  "description": "Optional",
  "displayOrder": 1,
  "active": true
}
```

#### `GET /song-books/{id}`

Gets a song book by id.

#### `PUT /song-books/{id}`

Updates a song book.

#### `DELETE /song-books/{id}`

Deletes a song book only when safe. If songs exist, return a clear conflict error.

### Songs

#### `GET /songs`

Query parameters:

- `bookId`
- `q`
- `page`
- `size`

Response includes song metadata and book summary.

#### `POST /songs`

Creates a song.

Request:

```json
{
  "songBookId": "uuid",
  "songNumber": "1",
  "title": "Song Title",
  "keySignature": "C",
  "timeSignature": "4/4",
  "tempoBpm": 80,
  "author": "Author"
}
```

#### `GET /songs/{id}`

Gets song metadata, default arrangement summary, and source image summary.

#### `PUT /songs/{id}`

Updates song metadata.

#### `DELETE /songs/{id}`

Deletes a song and dependent arrangement/image/export metadata according to the schema policy.

### Source Images

#### `POST /songs/{songId}/source-images`

Uploads a source notation image.

Request:

- Multipart form field: `file`.
- Allowed content types: `image/png`, `image/jpeg`.

Response:

```json
{
  "id": "uuid",
  "songId": "uuid",
  "originalFilename": "source.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 123456,
  "url": "/api/source-images/uuid/content"
}
```

#### `GET /songs/{songId}/source-images`

Lists source images for a song.

#### `GET /source-images/{id}/content`

Returns image binary content.

### Song Arrangements

#### `POST /songs/{songId}/arrangements/default`

Creates a default arrangement when one does not exist.

Default `content_json` should include:

- `structureVersion: "1.0"`
- A repeatable `VERSE` section with an empty `lines` array.
- Optionally a `REFRAIN` section can be added by the user later.

#### `GET /songs/{songId}/arrangements/default`

Gets the default arrangement.

Response:

```json
{
  "id": "uuid",
  "songId": "uuid",
  "name": "Default",
  "isDefault": true,
  "contentJson": {
    "structureVersion": "1.0",
    "sections": []
  },
  "layoutJson": {}
}
```

#### `PUT /song-arrangements/{arrangementId}/content`

Replaces the full `content_json` document.

Request:

```json
{
  "contentJson": {
    "structureVersion": "1.0",
    "sections": []
  }
}
```

Validation:

- `structureVersion` is required.
- `sections` must be an array.
- Section types must be supported.
- `lineOrder` values must be positive integers when present.
- `lyricsByVerse` and `verses` keys must be verse number strings.

#### `PUT /song-arrangements/{arrangementId}/layout`

Updates optional arrangement layout preferences.

### Preview

#### `POST /song-arrangements/{arrangementId}/preview`

Generates or returns a normalized preview model from `content_json`.

Request:

```json
{
  "selectedVerses": ["1", "2"],
  "refrainMode": "AFTER_EACH_VERSE",
  "layoutOptions": {
    "slideSize": "16:9"
  }
}
```

Response:

```json
{
  "song": {
    "bookCode": "BE",
    "songNumber": "1",
    "title": "Song Title"
  },
  "slides": [
    {
      "slideOrder": 1,
      "sectionType": "VERSE",
      "sectionLabel": "Ayat",
      "verseNumber": "1",
      "lines": [
        {
          "notation": "5 .6 5 5 6 | 1 .2 1 .6",
          "lyric": "Bi-la ku-re-nung do-sa-ku"
        }
      ]
    }
  ]
}
```

### Exports

#### `POST /songs/{songId}/exports`

Requests PPTX or PNG export.

Request:

```json
{
  "arrangementId": "uuid",
  "format": "PPTX",
  "selectedVerses": ["1", "2"],
  "refrainMode": "ONCE_AFTER_ALL_VERSES",
  "options": {
    "slideSize": "16:9",
    "theme": "default"
  }
}
```

Response:

```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "format": "PPTX",
  "downloadUrl": "/api/song-exports/uuid/download"
}
```

#### `GET /song-exports/{exportId}`

Gets export metadata.

#### `GET /song-exports/{exportId}/download`

Downloads the generated PPTX, PNG, or PNG ZIP artifact.

## Export Service Contract

Base path is service-local, for example `http://export-service:3002`.

### `GET /health`

Returns service health.

Response:

```json
{
  "status": "ok"
}
```

### `POST /exports/pptx`

Generates a PPTX from a render-ready payload.

Request:

```json
{
  "song": {
    "bookCode": "BE",
    "songNumber": "1",
    "title": "Song Title",
    "keySignature": "C",
    "timeSignature": "4/4",
    "tempoBpm": 80,
    "author": "Author"
  },
  "selectedVerses": ["1", "2"],
  "refrainMode": "AFTER_EACH_VERSE",
  "slides": [
    {
      "slideOrder": 1,
      "sectionType": "VERSE",
      "sectionLabel": "Ayat",
      "verseNumber": "1",
      "lines": [
        {
          "notation": "5 .6 5 5 6 | 1 .2 1 .6",
          "lyric": "Bi-la ku-re-nung do-sa-ku"
        }
      ]
    }
  ],
  "options": {
    "slideSize": "16:9",
    "theme": "default"
  }
}
```

Response options:

- Binary PPTX response with `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`.
- Or JSON metadata with a temporary artifact path if the service writes to a shared volume. The preferred MVP approach is binary response to keep the service stateless.

### `POST /exports/png`

Generates PNG slide images from the same render-ready payload.

Response options:

- ZIP binary response containing one PNG per slide.
- Or JSON metadata if the service writes to a shared volume. The preferred MVP approach is ZIP binary response.

PNG rules:

- Deterministic image dimensions, for example 1920x1080 for 16:9.
- Use Playwright with conservative browser settings.
- Avoid animation and heavyweight rendering.

## Frontend Page Structure

### `/books`

Song book list and management.

Capabilities:

- List books.
- Create, edit, and delete when safe.
- Show validation errors from backend.

### `/songs`

Song catalog list.

Capabilities:

- Filter by song book.
- Search by title or number.
- Navigate to song detail.
- Create song.

### `/songs/new`

Song creation form.

Fields:

- Book
- Number
- Title
- Key
- Time signature
- Tempo
- Author

### `/songs/[id]`

Song detail page.

Capabilities:

- Show metadata.
- Show source image summary.
- Link to editor, preview, and export.

### `/songs/[id]/editor`

Line-based arrangement editor.

Capabilities:

- Load default `song_arrangements.content_json`.
- Create default arrangement if missing.
- Add/edit/remove `VERSE`, `REFRAIN`, and `TEXT_ONLY_VERSES` sections.
- Edit notation and lyrics visually.
- Edit `lyricsByVerse` per line without exposing raw JSON.
- Save the full structured content JSON document.
- Show source image reference when screen size allows.

### `/songs/[id]/preview`

Slide preview.

Capabilities:

- Select verses.
- Choose `refrainMode`.
- Preview slides generated from `content_json`.
- Show readable slide-like cards.

### `/songs/[id]/export`

Export flow.

Capabilities:

- Select arrangement.
- Select verses.
- Choose `refrainMode`.
- Choose output format: PPTX or PNG.
- Trigger export.
- Show download link and error state.

## Docker Compose Plan

Default services:

- `postgres`: PostgreSQL database.
- `backend`: Spring Boot API.
- `frontend`: Next.js app.
- `export-service`: Node renderer.

Optional profile:

- `ocr-service`: FastAPI OCR skeleton, started only with `--profile ocr`.

Volumes:

- PostgreSQL data volume.
- Local file storage volume for uploads and generated exports.

Environment:

- Root `.env.example` should define database URL, credentials, service ports, storage root, export service URL, and OCR enabled flag.
- OCR should default to disabled, for example `OCR_ENABLED=false`.

MacBook Pro 2017 constraints:

- Keep OCR off by default.
- Avoid automatic model downloads.
- Avoid running unnecessary containers.
- Keep Playwright rendering simple and single-purpose.
- Document how to start only backend dependencies when developing one service.

## Implementation Phases

### Phase 1: Planning and Repository Foundation

Scope:

- Add this architecture document.
- Add monorepo directories and root configuration in the next issue.

Acceptance criteria:

- MVP architecture is documented.
- Canonical data model is clear.
- OCR is documented as optional and disabled by default.
- No runtime implementation code is added.

### Phase 2: Backend Foundation

Scope:

- Spring Boot project setup.
- PostgreSQL connectivity.
- Migration tooling.
- Health endpoint.

Acceptance criteria:

- Backend starts locally.
- Health endpoint returns OK.
- Test context starts.

### Phase 3: Database and Storage

Scope:

- Migrations for `song_books`, `songs`, `song_arrangements`, `song_source_images`, and `song_exports`.
- Local storage abstraction.

Acceptance criteria:

- Migrations apply to an empty database.
- `song_arrangements.content_json JSONB NOT NULL` exists.
- `song_verses` and `notation_lines` are not created as MVP tables.
- Local storage adapter prevents unsafe paths.

### Phase 4: Backend Catalog APIs

Scope:

- Song book CRUD.
- Song CRUD.
- Source image upload.

Acceptance criteria:

- Books can be managed.
- Songs can be managed by book and number.
- Source images can be uploaded and retrieved.

### Phase 5: Backend Arrangement APIs

Scope:

- Create default arrangement.
- Get arrangement.
- Update full `content_json`.
- Validate `VERSE`, `REFRAIN`, and `TEXT_ONLY_VERSES`.

Acceptance criteria:

- Frontend can save and load the full arrangement document.
- Invalid structure produces clear validation errors.
- Draft line content can be saved when structurally valid.

### Phase 6: Frontend Catalog and Editor

Scope:

- App shell.
- Book and song management UI.
- Source image reference viewer.
- Visual line-based arrangement editor.

Acceptance criteria:

- Operator can manage books and songs.
- Operator can upload a source notation image.
- Operator can enter notation and lyrics through visual controls.
- Editor round-trips through `song_arrangements.content_json`.

### Phase 7: Preview

Scope:

- Preview selected verses.
- Preview refrain behavior.
- Preview text-only verses.

Acceptance criteria:

- Preview is generated from `content_json`.
- `selectedVerses` order is respected.
- `refrainMode` values work: `NONE`, `ONCE_AFTER_ALL_VERSES`, `AFTER_EACH_VERSE`.
- Long text does not overlap in normal sample data.

### Phase 8: Export Service

Scope:

- Node service scaffold.
- PPTX export.
- PNG export with Playwright.

Acceptance criteria:

- Export service validates payloads.
- PPTX files open in PowerPoint, Keynote, or LibreOffice.
- PNG export produces deterministic slide images.

### Phase 9: Backend Export Orchestration

Scope:

- Backend export endpoint.
- Load content from `song_arrangements.content_json`.
- Transform content into render-ready payload.
- Persist `song_exports`.
- Provide download endpoint.

Acceptance criteria:

- PPTX and PNG exports work from backend.
- Export respects `selectedVerses`.
- Export respects `refrainMode`.
- Export does not depend on `song_verses` or `notation_lines`.

### Phase 10: Optional OCR Skeleton and Docker Compose

Scope:

- FastAPI OCR skeleton.
- Docker Compose for local runtime.
- Optional OCR profile.

Acceptance criteria:

- Core services run without OCR.
- OCR service starts only when explicitly requested.
- No heavy OCR packages are mandatory.

### Phase 11: README and Operator Documentation

Scope:

- Local setup instructions.
- Environment variables.
- Operator workflow.
- Troubleshooting for older local machines.

Acceptance criteria:

- A new developer can start the MVP locally.
- Operator workflow is documented.
- MacBook Pro 2017 constraints are documented.

## Risks and Mitigations

### MacBook Pro 2017 Performance

Risk:

- Running frontend, backend, PostgreSQL, export service, browser rendering, and OCR together may be too heavy.

Mitigations:

- OCR disabled by default.
- Docker Compose OCR profile opt-in only.
- Keep Playwright export rendering simple.
- Avoid background workers in MVP unless needed.
- Document service-by-service startup for development.

### OCR Dependency Weight

Risk:

- PaddleOCR and OpenCV can require large downloads and CPU-heavy execution.

Mitigations:

- FastAPI skeleton only in MVP.
- Do not install heavy OCR dependencies by default.
- Use explicit extras or separate requirements file later.
- Keep manual entry as the primary workflow.

### JSONB Structure Drift

Risk:

- Flexible JSONB content can become inconsistent without validation.

Mitigations:

- Backend validates `structureVersion`, `sections`, supported section types, line shape, and verse key shape.
- Frontend owns a typed editor model.
- Add representative sample fixtures for arrangement validation.

### Preview and Export Mismatch

Risk:

- Frontend preview and export service output could diverge.

Mitigations:

- Backend creates a normalized render-ready model from `content_json`.
- Preview and export should use the same selected verse and refrain rules.
- Keep initial layout simple.

### File Storage Migration

Risk:

- Local filesystem assumptions could make future R2 or S3 migration harder.

Mitigations:

- Backend storage abstraction from the start.
- Store storage keys, not absolute paths, in PostgreSQL.
- Keep binary access behind backend APIs.

### Slide Layout Complexity

Risk:

- Numbered notation and lyrics can overflow slides.

Mitigations:

- MVP uses conservative font sizes and wrapping.
- Reject or warn on extremely long lines where needed.
- Add sample songs with long lines to preview/export tests.

## Out of Scope for MVP

- Authentication and multi-user permissions.
- Full OCR implementation.
- Cloud storage implementation.
- Production VPS hardening, TLS, and backup automation.
- Full music engraving or notation parsing engine.
- Collaborative editing.
- Bulk import from existing hymn datasets.

## Definition of Done for Issue #1

- A single MVP planning document exists in the repository.
- The document covers architecture, schema, API, frontend, export, Docker, phases, acceptance criteria, and risks.
- The document explicitly defines the canonical tables: `song_books`, `songs`, `song_arrangements`, `song_source_images`, and `song_exports`.
- The document explicitly defines `song_arrangements.content_json` and the expected section structure.
- The document explains preview and export generation from `content_json`.
- The document explains `selectedVerses`, `refrainMode`, and `TEXT_ONLY_VERSES` handling.
- OCR is explicitly optional and disabled by default.
- MacBook Pro 2017 constraints are documented.
- No runtime implementation code is introduced.

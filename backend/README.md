# Backend

This directory will contain the Spring Boot 3.x backend service.

Planned responsibilities:

- Own canonical SongSlide data and REST APIs.
- Persist data in PostgreSQL.
- Validate and store `song_arrangements.content_json` as the canonical editable/renderable song content.
- Store uploaded source image metadata.
- Orchestrate PPTX and PNG export requests through the export service.
- Use local filesystem storage for the MVP through a storage abstraction.

Runtime implementation is intentionally not included in this scaffold phase.

# SongSlide

SongSlide is a local-first MVP for digitizing church song numbered notation and exporting selected verses to PPTX and PNG.

The architecture source of truth is [docs/mvp-architecture.md](docs/mvp-architecture.md).

## Monorepo Layout

- `frontend/`: Next.js, React, TypeScript, and Tailwind CSS operator UI. Full app scaffolding belongs to a later issue.
- `backend/`: Spring Boot 3.x API and PostgreSQL persistence. Full service scaffolding belongs to a later issue.
- `export-service/`: Node.js export renderer for PPTX and PNG. Full service scaffolding belongs to a later issue.
- `ocr-service/`: Optional FastAPI OCR skeleton. OCR is disabled by default.
- `docker/`: Docker Compose support files. Compose implementation belongs to a later issue.
- `docs/`: Project planning and architecture documentation.

## MVP Data Model

The canonical editable and renderable song content structure is `song_arrangements.content_json` JSONB.

The MVP does not use `song_verses` or `notation_lines` as primary tables.

## Current Status

This repository currently contains the shared monorepo structure and configuration placeholders only. Runtime service implementations are intentionally out of scope for this scaffold phase.

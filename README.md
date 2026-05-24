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

All core services (frontend, backend, export-service) and the optional ocr-service skeleton are implemented and can be run locally using Docker Compose.

## Docker Compose Runtime

You can run the SongSlide services locally using Docker Compose.

### Core Services

Start all core services (PostgreSQL, Backend, Frontend, and Export Service):

```bash
docker compose up --build -d
```

Expected local URLs:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8080 (Health check: `curl http://localhost:8080/api/actuator/health`)
- **Export Service**: http://localhost:3001 (Health check: `curl http://localhost:3001/health`)
- **Postgres Database**: `localhost:5432`

> [!NOTE]
> The first build may take a few minutes as it installs Node dependencies and downloads/configures the Playwright Chromium browser inside the `export-service` image. Playwright is cached inside the image so subsequent builds or runs are instant.

### Optional OCR Service

The OCR service is disabled by default for lightweight local development on older hardware (e.g., MacBook Pro 2017). To start it:

```bash
docker compose --profile ocr up --build -d ocr-service
```

Expected OCR URL:
- **OCR Service**: http://localhost:8001 (Health check: `curl http://localhost:8001/health`)

### Stop Services

To stop and remove containers and networks:

```bash
docker compose down
```

To also remove persistent database data and storage volumes:

```bash
docker compose down -v
```

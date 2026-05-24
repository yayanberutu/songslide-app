# SongSlide

SongSlide is a local-first MVP for digitizing church song numbered notation and exporting selected verses as PowerPoint (`.pptx`) files or PNG ZIP archives. The MVP is built for a manual operator workflow first, with OCR kept optional so the app remains practical on older local machines such as a MacBook Pro 2017.

The detailed architecture source of truth is [docs/mvp-architecture.md](docs/mvp-architecture.md). The canonical editable and renderable content model is `song_arrangements.content_json`; the MVP does not introduce `song_verses` or `notation_lines` as primary content tables.

## MVP Scope

In scope for the MVP:

- Manage song books and song metadata.
- Upload notation source images for manual reference.
- Enter `VERSE`, `REFRAIN`, and `TEXT_ONLY_VERSES` content through the editor.
- Preview selected verses with refrain placement options.
- Export selected preview content to PPTX or PNG ZIP.
- Run locally with native tooling or Docker Compose.

Out of scope for the MVP:

- Production deployment automation.
- User authentication and authorization.
- Full OCR implementation or OCR model setup.
- New product features outside the documented operator workflow.

## Architecture

SongSlide is a monorepo with a browser frontend, Spring Boot backend, PostgreSQL database, stateless export renderer, and optional OCR skeleton.

- `frontend/`: Next.js, React, TypeScript, and Tailwind CSS operator UI.
- `backend/`: Spring Boot API, PostgreSQL persistence, validation, local file storage, and export orchestration.
- `export-service/`: Node.js renderer for PPTX and PNG ZIP output using PptxGenJS and Playwright.
- `ocr-service/`: FastAPI OCR skeleton. OCR is optional and disabled by default.
- `docker/`: Docker support notes.
- `docs/`: Architecture and planning documents.

The backend owns song catalog data, uploaded source image metadata, arrangement validation, and export records. The export service only receives render-ready payloads from the backend and does not read PostgreSQL directly.

## Prerequisites

For Docker Compose setup:

- Docker Desktop or Colima with Docker Compose v2.
- Git.

For native development:

- Node.js 20 or newer for the frontend and export service.
- Java 17 and Maven 3.9 or newer for the backend.
- PostgreSQL 15 or a local Docker PostgreSQL container.
- Python 3.11 only if you want to run the optional OCR skeleton.

On a MacBook Pro 2017, keep OCR disabled, expect the first Docker build to take several minutes, and start only the services you need while developing one area.

## Environment

Copy the example when you need local overrides:

```bash
cp .env.example .env
```

`.env.example` contains local placeholders only. Do not commit real secrets in `.env`.

Key variables:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `BACKEND_INTERNAL_URL` | Server-side Next.js rewrite target. Docker Compose uses the backend service hostname | Unset or `http://localhost:8080` for native, `http://backend:8080` in Docker Compose |
| `NEXT_PUBLIC_API_BASE_URL` | Browser-facing backend URL for the frontend | `http://localhost:8080` |
| `BACKEND_PORT` | Spring Boot port | `8080` |
| `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_DB` | PostgreSQL connection target | `localhost` / `5432` / `songslide` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Local database credentials | Placeholder local values |
| `DATABASE_URL` | JDBC URL used by the backend | `jdbc:postgresql://localhost:5432/songslide` |
| `STORAGE_ROOT` | Local upload/export storage root for native backend runs | `./.local-storage` |
| `MAX_SOURCE_IMAGE_SIZE_MB` | Source image upload limit | `10` |
| `EXPORT_SERVICE_URL` | Backend-to-export-service URL for native runs | `http://localhost:3002` |
| `EXPORT_SERVICE_PORT` | Native export-service port | `3002` |
| `OCR_ENABLED` | OCR feature flag | `false` |
| `OCR_SERVICE_PORT` | Optional OCR service port | `8001` |

Docker Compose overrides some container values directly. In Compose, the export service listens on `3001` and the backend reaches it at `http://export-service:3001`.

For the frontend, browser-side API calls go through `/backend-api/*`. The Next.js server-side rewrite uses `BACKEND_INTERNAL_URL=http://backend:8080` in Docker Compose so the frontend container reaches the backend service over the Docker network. `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` remains the browser-facing/native local value. If `BACKEND_INTERNAL_URL` changes, rebuild the frontend image because production Next.js rewrites are compiled during `next build`.

## Docker Compose Setup

Start the core MVP stack:

```bash
docker compose up --build -d
```

Core services:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend health | `http://localhost:8080/api/actuator/health` |
| Export service health | `http://localhost:3001/health` |
| PostgreSQL | `localhost:5432` |

Check the services:

```bash
curl http://localhost:8080/api/actuator/health
curl http://localhost:3001/health
```

Stop containers:

```bash
docker compose down
```

Reset local database and storage volumes:

```bash
docker compose down -v
```

The first Docker build can take time because Node dependencies are installed and Playwright Chromium is installed inside the export-service image. Subsequent builds are faster when Docker can reuse cached layers.

The frontend image also compiles the `/backend-api/*` rewrite during `next build`. Docker Compose passes `BACKEND_INTERNAL_URL=http://backend:8080` at build time and runtime so the frontend container proxies API requests to the backend container instead of container-local `localhost`.

### Optional OCR Profile

OCR is disabled by default and is not required for the MVP workflow. Start the OCR skeleton only when you need to test its disabled response:

```bash
docker compose --profile ocr up --build -d ocr-service
curl http://localhost:8001/health
```

With `OCR_ENABLED=false`, `POST /ocr/extract` returns an empty result with an `OCR is disabled` warning. If `OCR_ENABLED=true`, the skeleton currently returns `501 Not Implemented`.

### Start Only Required Services

For frontend-only work against an existing API:

```bash
docker compose up -d postgres export-service backend
cd frontend
npm install
npm run dev
```

For backend work without the Docker frontend:

```bash
docker compose up -d postgres export-service
cd backend
SPRING_PROFILES_ACTIVE=local \
DATABASE_URL=jdbc:postgresql://localhost:5432/songslide \
POSTGRES_USER=songslide \
POSTGRES_PASSWORD=change-me-local-only \
EXPORT_SERVICE_URL=http://localhost:3001 \
mvn spring-boot:run
```

For export-service work without the rest of the app:

```bash
cd export-service
npm install
npm run browsers:install
npm run dev
curl http://localhost:3002/health
```

## Native Development Setup

Native development runs each service from its own directory. You can still use Docker Compose for PostgreSQL.

1. Start PostgreSQL:

```bash
docker compose up -d postgres
```

2. Start the export service:

```bash
cd export-service
npm install
npm run browsers:install
npm run dev
```

The native export service defaults to `http://localhost:3002`.

3. Start the backend:

```bash
cd backend
SPRING_PROFILES_ACTIVE=local \
DATABASE_URL=jdbc:postgresql://localhost:5432/songslide \
POSTGRES_USER=songslide \
POSTGRES_PASSWORD=change-me-local-only \
EXPORT_SERVICE_URL=http://localhost:3002 \
mvn spring-boot:run
```

4. Start the frontend:

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev
```

Open `http://localhost:3000`.

For native local development, leaving `BACKEND_INTERNAL_URL` unset lets the rewrite fall back to `NEXT_PUBLIC_API_BASE_URL`, then `http://localhost:8080`.

5. Optional OCR skeleton:

```bash
cd ocr-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
pytest
OCR_ENABLED=false uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Operator Workflow

1. Start services with Docker Compose or native commands.
2. Open the frontend at `http://localhost:3000`.
3. Open Song Books and create a song book such as `BE`, `KJ`, `PKJ`, `BNH`, or `NKB`.
4. Open Songs and create a song with book code, song number, title, and optional music metadata.
5. Open the song editor and upload a PNG or JPEG notation source image.
6. Add and enter `VERSE`, `REFRAIN`, and `TEXT_ONLY_VERSES` sections. This saves into `song_arrangements.content_json`.
7. Save the arrangement, open Preview, select verses, and choose the refrain mode.
8. Choose `PPTX` in the preview export panel, export, and download the PowerPoint file.
9. Choose `PNG ZIP`, export again, and download the ZIP archive of PNG slides.

## Troubleshooting

Port conflicts on `3000`, `3001`, `5432`, `8080`, or `8001`:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
lsof -nP -iTCP:5432 -sTCP:LISTEN
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8001 -sTCP:LISTEN
```

Stop the conflicting process or change the relevant local port before starting SongSlide.

Docker or Colima is not running:

```bash
docker info
docker compose version
```

Start Docker Desktop or run `colima start`, then retry the Compose command.

PostgreSQL volume reset:

```bash
docker compose down -v
docker compose up -d postgres
```

This deletes local database and storage volume data.

Export service unreachable:

- Docker Compose: check `docker compose ps export-service` and `curl http://localhost:3001/health`.
- Native backend with Docker export service: set `EXPORT_SERVICE_URL=http://localhost:3001`.
- Native backend with native export service: set `EXPORT_SERVICE_URL=http://localhost:3002`.

Frontend cannot reach backend:

- Confirm backend health at `http://localhost:8080/api/actuator/health`.
- Confirm the frontend uses `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` for browser access.
- In Docker Compose, confirm the frontend has `BACKEND_INTERNAL_URL=http://backend:8080` and browser calls use `/backend-api/*`.
- If you changed `BACKEND_INTERNAL_URL`, rebuild the frontend image so the compiled Next.js rewrite uses the new internal URL.
- If you changed `NEXT_PUBLIC_API_BASE_URL`, restart or rebuild the frontend so Next.js picks up the value.

OCR disabled response:

- OCR is optional and disabled by default with `OCR_ENABLED=false`.
- A disabled extraction response with empty `blocks` and an `OCR is disabled` warning is expected.
- Do not install OCR model dependencies for the default MVP setup.

Slow local machine notes:

- Keep OCR off.
- Start only required services instead of the full stack.
- Expect the first export-service Docker build to spend time installing Playwright Chromium.
- If native export rendering fails after dependency installation, rerun `npm run browsers:install` in `export-service/`.

## Known Limitations

- OCR is a disabled skeleton and does not extract notation or lyrics.
- The app is local-first and does not include production deployment, TLS, backups, or auth.
- Preview and export layouts are MVP-quality and prioritize readable selected verses over pixel-perfect hymnal reproduction.
- Source image storage and generated exports use local filesystem storage.
- `song_arrangements.content_json` is the canonical content store. Do not add `song_verses` or `notation_lines` tables for MVP content.

## Roadmap

- Harden preview/export layout options.
- Add production deployment guidance, backup policy, and reverse proxy setup.
- Add optional OCR dependencies behind an explicit profile or separate install path.
- Add authentication and multi-operator workflow when the app moves beyond local MVP usage.

## Validation Commands

Use these after documentation or setup changes:

```bash
docker compose config
git diff --check
```

Service-specific checks:

```bash
cd frontend && npm run lint && npm run typecheck && npm run build
cd backend && mvn test
cd export-service && npm run typecheck && npm test && npm run build
cd ocr-service && pytest
```

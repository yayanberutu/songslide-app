# Docker

Docker Compose support is defined at the repository root in [docker-compose.yml](../docker-compose.yml).

Default services:

- `postgres`: local PostgreSQL database.
- `backend`: Spring Boot API on host port `8080`.
- `frontend`: Next.js frontend on host port `3000`.
- `export-service`: Node export renderer on host port `3001`.

Optional profile:

- `ocr-service`: FastAPI OCR skeleton on host port `8001`, started only with `--profile ocr`.

OCR is disabled by default so local development stays practical on a MacBook Pro 2017. The first build can take several minutes because the export-service image installs Playwright Chromium.

Frontend proxy behavior:

- Browser-side API calls should use `/backend-api/*`.
- Docker Compose sets `BACKEND_INTERNAL_URL=http://backend:8080` for the Next.js server-side rewrite.
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` remains the browser-facing/native local backend URL.
- Rebuild the frontend image if `BACKEND_INTERNAL_URL` changes because production Next.js rewrites are compiled during `next build`.

Useful commands:

```bash
docker compose up --build -d
docker compose --profile ocr up --build -d ocr-service
docker compose down
docker compose down -v
docker compose config
```

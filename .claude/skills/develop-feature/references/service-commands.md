# Per-service commands

Songslide is a monorepo. Figure out which service(s) your changed files live under, then use only the commands for those services — running every service's full suite on an unrelated change wastes time and can fail for reasons unrelated to your change.

| Service | Path | Lint / typecheck | Test |
|---|---|---|---|
| Frontend (Next.js/TS) | `frontend/` | `npm run lint`, `npm run typecheck` (run inside `frontend/`) | `npm run test:notation` (notation parser only — there may be no broader suite; check `frontend/package.json` for new scripts before assuming) |
| Export service (Node/TS) | `export-service/` | `npm run typecheck` (inside `export-service/`) | `npm run test` (inside `export-service/`) |
| Backend (Java/Spring) | `backend/` | — | `mvn test` (inside `backend/`), or `mvn -q test` for less noise |
| Backend Go | `backend-go/` | `gofmt -l .` (inside `backend-go/`, should print nothing) | `go test ./...` (inside `backend-go/`) |
| OCR service (Python) | `ocr-service/` | — | `pytest` (inside `ocr-service/`, check `requirements.txt`/README for how deps are installed first) |

If a change spans multiple services (e.g. a new API field touched in both `backend-go` and `frontend`), run both services' checks.

These scripts can change — if a command here doesn't exist, re-check the service's `package.json` / `pom.xml` / README rather than skipping verification entirely.

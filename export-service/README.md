# Export Service

Node.js and TypeScript HTTP service for SongSlide export rendering.

This service is stateless. It accepts render-ready payloads prepared by the Spring Boot backend from `song_arrangements.content_json`; it does not read PostgreSQL and does not own song business rules.

The PPTX endpoint renders binary PowerPoint files with PptxGenJS. PNG generation with Playwright is intentionally not implemented yet.

## Local Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Default port: `3002`.

## Endpoints

### `GET /health`

Returns service status.

```json
{
  "status": "ok",
  "service": "songslide-export-service"
}
```

### `POST /export/pptx`

Validates a PPTX export payload and returns a binary `.pptx` response.

Successful responses use:

```text
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="songslide-export.pptx"
```

### `POST /export/png`

Validates a PNG export payload. PNG rendering is not implemented yet.

## Valid Sample Payload

```json
{
  "slides": [
    {
      "title": "KJ 37 - Bila Kurenung Dosaku",
      "subtitle": "Ayat 1",
      "metadata": "Do = G | 4 ketuk",
      "lines": [
        {
          "notation": "5 .6 5 5 6 | 1 .2 1 .6",
          "lyric": "Bi-la ku-re-nung do-sa-ku"
        }
      ]
    }
  ],
  "layout": {
    "theme": "LIGHT",
    "showNotation": true,
    "slideSize": "LAYOUT_WIDE"
  }
}
```

Invalid requests return `400` with validation issues:

```json
{
  "status": "FAILED",
  "code": "VALIDATION_ERROR",
  "message": "Invalid export payload",
  "issues": [
    {
      "path": "slides",
      "message": "Required"
    }
  ]
}
```

## Smoke Test

```bash
npm run dev
curl http://localhost:3002/health
curl -X POST http://localhost:3002/export/pptx \
  -H 'Content-Type: application/json' \
  -d @docs/sample-export-payload.json \
  --output /tmp/songslide-sample.pptx
```

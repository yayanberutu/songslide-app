# OCR Service

This is the optional SongSlide OCR service skeleton. OCR is disabled by default so local development remains lightweight on a MacBook Pro 2017.

## Endpoints

- `GET /health`
- `POST /ocr/extract`

With the default `OCR_ENABLED=false`, extraction returns:

```json
{
  "blocks": [],
  "warnings": ["OCR is disabled"]
}
```

If `OCR_ENABLED=true`, the endpoint currently returns `501 Not Implemented`. Actual OCR is intentionally out of scope for the MVP skeleton.

## Local Development

```bash
cd ocr-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
pytest
OCR_ENABLED=false uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Smoke test:

```bash
curl http://localhost:8001/health
curl -X POST http://localhost:8001/ocr/extract \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Optional Future OCR Dependencies

Do not add heavy OCR packages to `requirements.txt` by default. Future OCR work can use a separate optional dependency file or Docker profile for packages such as:

- OpenCV
- PaddleOCR
- OCR model downloads

Those dependencies should remain opt-in and should not be required for normal frontend/backend/export development.

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_reports_ocr_disabled_by_default(monkeypatch):
    monkeypatch.delenv("OCR_ENABLED", raising=False)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "OK", "ocrEnabled": False}


def test_extract_returns_disabled_response_by_default(monkeypatch):
    monkeypatch.delenv("OCR_ENABLED", raising=False)

    response = client.post("/ocr/extract", json={})

    assert response.status_code == 200
    assert response.json() == {"blocks": [], "warnings": ["OCR is disabled"]}


def test_extract_returns_not_implemented_when_explicitly_enabled(monkeypatch):
    monkeypatch.setenv("OCR_ENABLED", "true")

    response = client.post("/ocr/extract", json={})

    assert response.status_code == 501
    assert response.json()["detail"] == "OCR dependencies and extraction are not implemented in the MVP skeleton."

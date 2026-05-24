import os
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


def is_ocr_enabled() -> bool:
    return os.getenv("OCR_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}


class HealthResponse(BaseModel):
    status: str
    ocrEnabled: bool


class OcrExtractRequest(BaseModel):
    imageUrl: str | None = Field(default=None, description="Optional future image URL input.")
    storageKey: str | None = Field(default=None, description="Optional future storage object key input.")
    options: dict[str, Any] = Field(default_factory=dict)


class OcrBlock(BaseModel):
    text: str
    confidence: float | None = None
    boundingBox: list[float] | None = None


class OcrExtractResponse(BaseModel):
    blocks: list[OcrBlock]
    warnings: list[str]


app = FastAPI(
    title="SongSlide OCR Service",
    version="0.1.0",
    description="Optional OCR skeleton. OCR is disabled by default for lightweight local development.",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="OK", ocrEnabled=is_ocr_enabled())


@app.post("/ocr/extract", response_model=OcrExtractResponse)
def extract(_: OcrExtractRequest) -> OcrExtractResponse:
    if not is_ocr_enabled():
        return OcrExtractResponse(blocks=[], warnings=["OCR is disabled"])

    raise HTTPException(
        status_code=501,
        detail="OCR dependencies and extraction are not implemented in the MVP skeleton.",
    )

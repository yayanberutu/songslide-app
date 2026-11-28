import os
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.omr.engine import is_oemer_available, process_staff_notation


def is_ocr_enabled() -> bool:
    return os.getenv("OCR_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}


class HealthResponse(BaseModel):
    status: str
    ocrEnabled: bool
    omrAvailable: bool = False


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


class StaffNotationOmrResponse(BaseModel):
    status: str
    detectedKeySignature: str
    detectedTimeSignature: str
    noteCount: int
    measureCount: int
    lines: list[str]
    rawNotation: str
    warnings: list[str]


app = FastAPI(
    title="SongSlide OCR & OMR Service",
    version="0.2.0",
    description="OCR & OMR Service for SongSlide, converting staff notation partiturs into notasi angka.",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="OK",
        ocrEnabled=is_ocr_enabled(),
        omrAvailable=is_oemer_available(),
    )


@app.post("/ocr/extract", response_model=OcrExtractResponse)
def extract(_: OcrExtractRequest) -> OcrExtractResponse:
    if not is_ocr_enabled():
        return OcrExtractResponse(blocks=[], warnings=["OCR is disabled"])

    raise HTTPException(
        status_code=501,
        detail="OCR dependencies and extraction are not implemented in the MVP skeleton.",
    )


@app.post("/omr/staff-notation", response_model=StaffNotationOmrResponse)
async def omr_staff_notation(file: UploadFile = File(...)) -> StaffNotationOmrResponse:
    """Extracts 1-voice staff notation from an uploaded image (PNG/JPEG) or 1-page PDF,
    converting it into SongSlide notasi angka syntax."""
    file_bytes = await file.read()
    filename = file.filename or "partitur.png"
    content_type = file.content_type

    result = process_staff_notation(
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
    )

    return StaffNotationOmrResponse(**result)

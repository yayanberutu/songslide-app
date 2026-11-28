from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.omr.converter import musicxml_to_jianpu
from app.omr.pdf_utils import is_pdf, render_pdf_first_page_to_image, validate_image_bytes


def is_oemer_available() -> bool:
    """Checks whether the Oemer OMR engine CLI or module is installed."""
    if shutil.which("oemer") is not None:
        return True
    try:
        import oemer  # noqa: F401
        return True
    except ImportError:
        return False


def run_oemer_omr(image_bytes: bytes, original_filename: str) -> str:
    """Executes Oemer on image bytes and returns the resulting MusicXML string."""
    # Check for test / mock environment variable
    mock_xml_path = os.getenv("MOCK_OMR_XML_FILE")
    if mock_xml_path and os.path.exists(mock_xml_path):
        with open(mock_xml_path, "r", encoding="utf-8") as f:
            return f.read()

    mock_xml_content = os.getenv("MOCK_OMR_XML_CONTENT")
    if mock_xml_content:
        return mock_xml_content

    if not is_oemer_available():
        raise HTTPException(
            status_code=503,
            detail=(
                "Engine OMR (Oemer) belum terpasang di ocr-service. "
                "Silakan pasang dependensi Oemer dan model deep-learning di server."
            ),
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_image_path = temp_path / "partitur_input.png"
        input_image_path.write_bytes(image_bytes)

        # Run Oemer CLI
        try:
            cmd = ["oemer", str(input_image_path), "--output-path", str(temp_path)]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            if proc.returncode != 0:
                raise HTTPException(
                    status_code=422,
                    detail=f"Oemer OMR gagal mengekstrak partitur: {proc.stderr[:300]}",
                )
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(
                status_code=504,
                detail="Proses OMR Oemer melebihi batas waktu (timeout).",
            ) from exc
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise
            raise HTTPException(
                status_code=500,
                detail=f"Terjadi kesalahan saat menjalankan engine OMR: {exc}",
            ) from exc

        # Find generated .musicxml or .xml file
        musicxml_files = list(temp_path.glob("*.musicxml")) + list(temp_path.glob("*.xml"))
        if not musicxml_files:
            raise HTTPException(
                status_code=422,
                detail=(
                    "OMR tidak menemukan simbol musik yang valid pada gambar. "
                    "Pastikan gambar berupa partitur notasi balok tercetak 1 suara yang jelas dan kontras."
                ),
            )

        output_file = musicxml_files[0]
        return output_file.read_text(encoding="utf-8")


def process_staff_notation(
    file_bytes: bytes,
    filename: str,
    content_type: str | None = None,
) -> dict[str, Any]:
    """Full pipeline: PDF/image validation, OMR execution, and MusicXML -> Jianpu conversion."""
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="File partitur yang diunggah kosong (0 bytes).",
        )

    # 1. Render PDF to image if needed
    if is_pdf(filename, content_type):
        try:
            image_bytes = render_pdf_first_page_to_image(file_bytes)
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Gagal memproses file PDF: {exc}",
            ) from exc
    else:
        # Validate that bytes are a valid image
        try:
            validate_image_bytes(file_bytes)
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"File gambar tidak valid: {exc}",
            ) from exc
        image_bytes = file_bytes

    # 2. Run OMR to produce MusicXML
    musicxml_str = run_oemer_omr(image_bytes, filename)

    # 3. Convert MusicXML to Jianpu notasi angka
    try:
        result = musicxml_to_jianpu(musicxml_str)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengonversi hasil OMR ke notasi angka: {exc}",
        ) from exc

    return result

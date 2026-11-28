from __future__ import annotations

import io
import pypdfium2 as pdfium
from PIL import Image


def is_pdf(filename: str, content_type: str | None = None) -> bool:
    if filename.lower().endswith(".pdf"):
        return True
    if content_type and "pdf" in content_type.lower():
        return True
    return False


def render_pdf_first_page_to_image(pdf_bytes: bytes) -> bytes:
    """Renders the first page of a PDF document into PNG image bytes at 300 DPI."""
    try:
        doc = pdfium.PdfDocument(pdf_bytes)
    except Exception as exc:
        raise ValueError(f"Gagal membaca file PDF: {exc}") from exc

    if len(doc) == 0:
        raise ValueError("File PDF kosong (0 halaman).")

    page = doc[0]
    # Scale 3.0 gives ~216 DPI from standard 72 DPI points, ideal balance of quality & speed
    bitmap = page.render(scale=3.0)
    pil_image = bitmap.to_pil()

    output = io.BytesIO()
    pil_image.save(output, format="PNG")
    return output.getvalue()


def validate_image_bytes(image_bytes: bytes) -> None:
    """Validates that bytes can be decoded as an image."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img.verify()
    except Exception as exc:
        raise ValueError(f"File gambar tidak valid atau rusak: {exc}") from exc

import io
import music21
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.omr.converter import musicxml_to_jianpu
from app.omr.engine import process_staff_notation


client = TestClient(app)


def create_sample_musicxml(
    key_fifths: int = 0,
    time_sig: str = "4/4",
    notes: list[tuple[str, float]] | None = None,
) -> str:
    """Generates a synthetic MusicXML string for testing."""
    s = music21.stream.Score()
    p = music21.stream.Part()
    m = music21.stream.Measure(number=1)
    m.timeSignature = music21.meter.TimeSignature(time_sig)
    m.keySignature = music21.key.KeySignature(key_fifths)

    if notes is None:
        notes = [("C4", 1.0), ("D4", 1.0), ("E4", 1.0), ("F4", 1.0)]

    for pitch_name, duration in notes:
        if pitch_name == "REST":
            m.append(music21.note.Rest(quarterLength=duration))
        else:
            m.append(music21.note.Note(pitch_name, quarterLength=duration))

    p.append(m)
    s.append(p)

    gex = music21.musicxml.m21ToXml.GeneralObjectExporter(s)
    return gex.parse().decode("utf-8")


def create_valid_test_png() -> bytes:
    img = Image.new("RGB", (100, 100), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_converter_c_major_scale():
    xml = create_sample_musicxml(
        key_fifths=0,
        notes=[("C4", 1.0), ("D4", 1.0), ("E4", 1.0), ("F4", 1.0)],
    )
    res = musicxml_to_jianpu(xml)
    assert res["detectedKeySignature"] == "C major"
    assert res["detectedTimeSignature"] == "4/4"
    assert res["lines"] == ["| 1 2 3 4 ||"]
    assert res["noteCount"] == 4


def test_converter_g_major_octave_markers():
    # In G major (1 sharp): D4 is 5, (low), G4 is 1, B4 is 3, D5 is 5
    xml = create_sample_musicxml(
        key_fifths=1,
        notes=[("D4", 1.0), ("G4", 1.0), ("B4", 1.0), ("D5", 1.0)],
    )
    res = musicxml_to_jianpu(xml)
    assert res["detectedKeySignature"] == "G major"
    assert res["lines"] == ["| 5, 1 3 5 ||"]


def test_converter_durations_and_rests():
    # C4 half note (2.0), rest quarter (1.0), C4 quarter (1.0)
    xml = create_sample_musicxml(
        key_fifths=0,
        notes=[("C4", 2.0), ("REST", 1.0), ("C4", 1.0)],
    )
    res = musicxml_to_jianpu(xml)
    assert res["lines"] == ["| 1 . 0 1 ||"]


def test_converter_eighth_notes_beaming():
    # C4 eighth (0.5), D4 eighth (0.5), E4 quarter (1.0), F4 half (2.0)
    xml = create_sample_musicxml(
        key_fifths=0,
        notes=[("C4", 0.5), ("D4", 0.5), ("E4", 1.0), ("F4", 2.0)],
    )
    res = musicxml_to_jianpu(xml)
    assert res["lines"] == ["| [1 2] 3 4 . ||"]


def test_converter_empty_score_raises_value_error():
    s = music21.stream.Score()
    p = music21.stream.Part()
    s.append(p)
    gex = music21.musicxml.m21ToXml.GeneralObjectExporter(s)
    xml = gex.parse().decode("utf-8")

    with pytest.raises(ValueError, match="Tidak ada simbol notasi musik"):
        musicxml_to_jianpu(xml)


def test_endpoint_invalid_image_returns_400():
    response = client.post(
        "/omr/staff-notation",
        files={"file": ("corrupt.png", b"not-an-image", "image/png")},
    )
    assert response.status_code == 400
    assert "tidak valid" in response.json()["detail"].lower()


def test_endpoint_empty_file_returns_400():
    response = client.post(
        "/omr/staff-notation",
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert response.status_code == 400
    assert "kosong" in response.json()["detail"].lower()


def test_endpoint_with_mock_xml_returns_valid_jianpu(monkeypatch):
    mock_xml = create_sample_musicxml(
        key_fifths=0,
        notes=[("C4", 1.0), ("E4", 1.0), ("G4", 1.0), ("C5", 1.0)],
    )
    monkeypatch.setenv("MOCK_OMR_XML_CONTENT", mock_xml)

    png_bytes = create_valid_test_png()
    response = client.post(
        "/omr/staff-notation",
        files={"file": ("score.png", png_bytes, "image/png")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["detectedKeySignature"] == "C major"
    assert data["lines"] == ["| 1 3 5 1' ||"]
    assert len(data["warnings"]) >= 2
    assert "perlu dicek manual" in data["warnings"][0]

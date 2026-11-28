from __future__ import annotations

import io
import math
from typing import Any

from music21 import converter, expressions, key, meter, note, stream


# Mapping of key signature fifths to (tonic_name, pitch_class, tonic_midi_octave_4)
FIFTHS_TO_TONIC: dict[int, tuple[str, int, int]] = {
    0: ("C", 0, 60),    # C4 = 60
    1: ("G", 7, 67),    # G4 = 67
    2: ("D", 2, 62),    # D4 = 62
    3: ("A", 9, 69),    # A4 = 69
    4: ("E", 4, 64),    # E4 = 64
    5: ("B", 11, 71),   # B4 = 71
    6: ("F#", 6, 66),   # F#4 = 66
    7: ("C#", 1, 61),   # C#4 = 61
    -1: ("F", 5, 65),   # F4 = 65
    -2: ("Bb", 10, 70), # Bb4 = 70
    -3: ("Eb", 3, 63),  # Eb4 = 63
    -4: ("Ab", 8, 68),  # Ab4 = 68
    -5: ("Db", 1, 61),  # Db4 = 61
    -6: ("Gb", 6, 66),  # Gb4 = 66
    -7: ("Cb", 11, 71), # Cb4 = 71
}

SEMITONE_TO_DEGREE: dict[int, str] = {
    0: "1",
    1: "#1",
    2: "2",
    3: "b3",
    4: "3",
    5: "4",
    6: "#4",
    7: "5",
    8: "#5",
    9: "6",
    10: "b7",
    11: "7",
}


def pitch_to_jianpu(midi_number: int, tonic_midi: int) -> str:
    """Converts a MIDI pitch number to a Jianpu degree string with octave markers.
    
    Tonic (Do) at tonic_midi has degree '1' with 0 octave offset.
    Higher octaves get "'" suffix per octave; lower octaves get "," suffix per octave.
    """
    diff = midi_number - tonic_midi
    octave_offset = math.floor(diff / 12)
    semitone = diff % 12

    degree = SEMITONE_TO_DEGREE.get(semitone, "1")

    if octave_offset > 0:
        degree += "'" * octave_offset
    elif octave_offset < 0:
        degree += "," * abs(octave_offset)

    return degree


def element_has_fermata(element: Any) -> bool:
    if hasattr(element, "expressions") and element.expressions:
        for expr in element.expressions:
            if isinstance(expr, expressions.Fermata):
                return True
    return False


def convert_measure_tokens(elements: list[Any], tonic_midi: int) -> list[str]:
    """Converts notes and rests in a measure to a list of notasi-angka tokens."""
    tokens: list[str] = []
    i = 0
    n = len(elements)

    while i < n:
        el = elements[i]
        fermata = "^" if element_has_fermata(el) else ""
        ql = float(el.quarterLength)

        if isinstance(el, note.Note):
            degree = pitch_to_jianpu(el.pitch.midi, tonic_midi)

            # Check if this note is an eighth note (ql == 0.5) that can be beamed with next eighth note
            if abs(ql - 0.5) < 0.01:
                # Lookahead to see if next element is also an eighth note
                if i + 1 < n and isinstance(elements[i + 1], note.Note) and abs(float(elements[i + 1].quarterLength) - 0.5) < 0.01:
                    next_el = elements[i + 1]
                    next_fermata = "^" if element_has_fermata(next_el) else ""
                    next_degree = pitch_to_jianpu(next_el.pitch.midi, tonic_midi)
                    tokens.append(f"[{degree}{fermata} {next_degree}{next_fermata}]")
                    i += 2
                    continue
                else:
                    # Single eighth note
                    tokens.append(f"[{degree}{fermata}]")
                    i += 1
                    continue

            # Standard duration mappings
            if abs(ql - 1.0) < 0.01:
                tokens.append(f"{degree}{fermata}")
            elif abs(ql - 1.5) < 0.01:
                # Dotted quarter note (1 beat + half beat extension)
                tokens.append(f"{degree}{fermata} .")
            elif abs(ql - 2.0) < 0.01:
                # Half note: note + 1 hold dot
                tokens.append(f"{degree}{fermata} .")
            elif abs(ql - 3.0) < 0.01:
                # Dotted half note: note + 2 hold dots
                tokens.append(f"{degree}{fermata} . .")
            elif abs(ql - 4.0) < 0.01:
                # Whole note: note + 3 hold dots
                tokens.append(f"{degree}{fermata} . . .")
            else:
                # Fallback for unexpected durations
                beats = max(1, round(ql))
                tokens.append(f"{degree}{fermata}")
                for _ in range(beats - 1):
                    tokens.append(".")
            i += 1

        elif isinstance(el, note.Rest):
            if abs(ql - 0.5) < 0.01:
                tokens.append(f"0{fermata}")
            elif abs(ql - 1.0) < 0.01:
                tokens.append(f"0{fermata}")
            elif abs(ql - 2.0) < 0.01:
                tokens.append("0 0")
            elif abs(ql - 3.0) < 0.01:
                tokens.append("0 0 0")
            elif abs(ql - 4.0) < 0.01:
                tokens.append("0 0 0 0")
            else:
                beats = max(1, round(ql))
                tokens.append(" ".join(["0"] * beats))
            i += 1
        else:
            # Skip unhandled elements (e.g. chord, text annotations, etc.)
            i += 1

    return tokens


def musicxml_to_jianpu(musicxml_content: str | bytes) -> dict[str, Any]:
    """Parses MusicXML content and converts it into SongSlide notasi angka syntax."""
    if isinstance(musicxml_content, bytes):
        musicxml_str = musicxml_content.decode("utf-8", errors="replace")
    else:
        musicxml_str = musicxml_content

    score = converter.parse(musicxml_str, format="musicxml")

    # Detect Key Signature
    key_signatures = list(score.recurse().getElementsByClass(key.KeySignature))
    if key_signatures:
        ks = key_signatures[0]
        fifths = ks.sharps
        k_obj = ks.asKey()
        detected_key = f"{k_obj.tonic.name} {k_obj.mode}"
    else:
        # Fallback to analyzing key or defaulting to C major
        try:
            analyzed = score.analyze("key")
            detected_key = f"{analyzed.tonic.name} {analyzed.mode}"
            fifths = analyzed.sharps
        except Exception:
            fifths = 0
            detected_key = "C major"

    tonic_info = FIFTHS_TO_TONIC.get(fifths, ("C", 0, 60))
    tonic_midi = tonic_info[2]

    # Detect Time Signature
    time_signatures = list(score.recurse().getElementsByClass(meter.TimeSignature))
    if time_signatures:
        ts = time_signatures[0]
        detected_time = f"{ts.numerator}/{ts.denominator}"
    else:
        detected_time = "4/4"

    # Select the primary voice / part
    if hasattr(score, "parts") and len(score.parts) > 0:
        primary_part = score.parts[0]
    else:
        primary_part = score

    measures = list(primary_part.getElementsByClass(stream.Measure))
    if not measures:
        # Score might not be partitioned into measures
        measures = [primary_part]

    measure_strings: list[str] = []
    total_notes = 0

    for m in measures:
        elements = [el for el in m.notesAndRests]
        note_count = sum(1 for el in elements if isinstance(el, note.Note))
        total_notes += note_count

        tokens = convert_measure_tokens(elements, tonic_midi)
        if tokens:
            measure_str = " ".join(tokens)
            measure_strings.append(measure_str)

    if total_notes == 0:
        raise ValueError("Tidak ada simbol notasi musik yang terdeteksi dalam MusicXML.")

    # Group measures into lines (default: 4 measures per line)
    lines: list[str] = []
    measures_per_line = 4
    total_m = len(measure_strings)

    for idx in range(0, total_m, measures_per_line):
        chunk = measure_strings[idx : idx + measures_per_line]
        is_last_line = (idx + measures_per_line >= total_m)
        line_content = " | ".join(chunk)
        if is_last_line:
            line_str = f"| {line_content} ||"
        else:
            line_str = f"| {line_content} |"
        lines.append(line_str)

    raw_notation = "\n".join(lines)
    warnings = [
        "Hasil konversi otomatis dari OMR perlu dicek manual sebelum disimpan.",
        f"Key signature terdeteksi: {detected_key}. Jika tidak sesuai dengan partitur asli, mapping digit nada akan bergeser."
    ]

    return {
        "status": "SUCCESS",
        "detectedKeySignature": detected_key,
        "detectedTimeSignature": detected_time,
        "noteCount": total_notes,
        "measureCount": total_m,
        "lines": lines,
        "rawNotation": raw_notation,
        "warnings": warnings,
    }

import { useState } from "react";
import { type ArrangementSection, type PartiturLine, type PartiturSection } from "@/lib/arrangement-api";
import { AlignmentStatus } from "@/components/notation/AlignmentStatus";
import { Button, EmptyState, Field, TextInput } from "@/components/ui";

const ALL_VOICES = [
  { id: "sopran", label: "Sopran" },
  { id: "alto", label: "Alto" },
  { id: "tenor", label: "Tenor" },
  { id: "bass", label: "Bass" }
];

export function PartiturSectionEditor({
  section,
  onChange,
  isNotationReadOnly
}: {
  section: PartiturSection;
  onChange: (section: ArrangementSection) => void;
  isNotationReadOnly?: boolean;
}) {
  const enabledVoices = section.enabledVoices ?? ["sopran", "alto", "tenor", "bass"];
  const [newVerseNumber, setNewVerseNumber] = useState("");

  const verseNumbers = collectPartiturVerseNumbers(section);

  function updateLines(lines: PartiturLine[]) {
    onChange({
      ...section,
      lines: renumberLines(lines)
    });
  }

  function toggleVoice(voiceId: string) {
    let nextVoices = [...enabledVoices];
    if (nextVoices.includes(voiceId)) {
      nextVoices = nextVoices.filter((v) => v !== voiceId);
    } else {
      nextVoices.push(voiceId);
    }
    // Sort to maintain SATB order
    nextVoices.sort((a, b) => ALL_VOICES.findIndex((v) => v.id === a) - ALL_VOICES.findIndex((v) => v.id === b));
    
    onChange({
      ...section,
      enabledVoices: nextVoices
    });
  }

  function addLine() {
    // Populate lyricsByVerse with empty strings for all known verses
    const lyricsByVerse = Object.fromEntries(verseNumbers.map((v) => [v, ""]));
    const voicesData: Record<string, { notation: string; lyric: string; lyricsByVerse: Record<string, string> }> = {};
    enabledVoices.forEach((voiceId) => {
      voicesData[voiceId] = { notation: "", lyric: "", lyricsByVerse };
    });

    updateLines([
      ...section.lines,
      {
        lineOrder: section.lines.length + 1,
        voices: voicesData
      }
    ]);
  }

  function updateLine(index: number, line: PartiturLine) {
    updateLines(section.lines.map((current, lineIndex) => (lineIndex === index ? line : current)));
  }

  function addVerseNumber() {
    const nextVerse = newVerseNumber.trim();
    if (!isPositiveVerseNumber(nextVerse) || verseNumbers.includes(nextVerse)) {
      return;
    }
    
    updateLines(section.lines.map((line) => {
      const nextVoices = { ...line.voices };
      enabledVoices.forEach((voiceId) => {
        const voiceData = nextVoices[voiceId] ?? { notation: "", lyric: "" };
        const lyricsByVerse = { ...(voiceData.lyricsByVerse ?? {}) };
        
        // Migrate legacy single lyric to lyricsByVerse["1"] if needed
        if (voiceData.lyric && !lyricsByVerse["1"]) {
          lyricsByVerse["1"] = voiceData.lyric;
        }

        nextVoices[voiceId] = {
          ...voiceData,
          lyricsByVerse: {
            ...lyricsByVerse,
            [nextVerse]: ""
          }
        };
      });
      return {
        ...line,
        voices: nextVoices
      };
    }));
    setNewVerseNumber("");
  }

  function deleteVerseNumber(verseNumber: string) {
    updateLines(section.lines.map((line) => {
      const nextVoices = { ...line.voices };
      Object.keys(nextVoices).forEach((voiceId) => {
        const voiceData = nextVoices[voiceId];
        if (voiceData) {
          const lyricsByVerse = { ...(voiceData.lyricsByVerse ?? {}) };
          delete lyricsByVerse[verseNumber];
          nextVoices[voiceId] = {
            ...voiceData,
            lyricsByVerse
          };
        }
      });
      return {
        ...line,
        voices: nextVoices
      };
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-md bg-zinc-50 p-4 border border-zinc-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-zinc-200 pb-3">
          <div>
            <p className="text-sm font-semibold text-ink-950">Pengaturan Suara</p>
            <p className="mt-1 text-sm text-ink-500">
              Pilih suara yang aktif pada bagian ini.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {ALL_VOICES.map((voice) => {
              const isEnabled = enabledVoices.includes(voice.id);
              return (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => toggleVoice(voice.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isEnabled
                      ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {voice.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950">Verse lyric columns</p>
            <p className="mt-1 text-sm text-ink-500">
              Current verses: {verseNumbers.length ? verseNumbers.join(", ") : "none"}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-ink-700">Verse number</span>
              <TextInput
                inputMode="numeric"
                value={newVerseNumber}
                onChange={(event) => setNewVerseNumber(event.target.value)}
                placeholder="1"
              />
            </label>
            <Button type="button" onClick={addVerseNumber}>Add verse column</Button>
          </div>
        </div>
      </div>

      <NotationSyntaxHint />

      {section.lines.length === 0 ? (
        <EmptyState title="Belum ada baris partitur" description="Tambahkan baris untuk memasukkan notasi dan lirik." />
      ) : (
        <div className="space-y-3">
          {section.lines.map((line, index) => (
            <div key={`${section.id}-line-${index}`} className="rounded-md border border-zinc-200 p-3 bg-white">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <p className="text-sm font-semibold text-ink-950">Baris {index + 1}</p>
                <LineActions
                  index={index}
                  total={section.lines.length}
                  onMove={(direction) => updateLines(moveItem(section.lines, index, direction))}
                  onDelete={() => updateLines(section.lines.filter((_line, lineIndex) => lineIndex !== index))}
                />
              </div>
              <div className="space-y-6">
                {enabledVoices.map((voiceId) => {
                  const voiceDef = ALL_VOICES.find((v) => v.id === voiceId);
                  const notation = line.voices[voiceId]?.notation ?? "";
                  const lyric = line.voices[voiceId]?.lyric ?? "";
                  
                  // Setup lyricsByVerse and handle legacy lyric migration on the fly
                  const lyricsByVerse = { ...(line.voices[voiceId]?.lyricsByVerse ?? {}) };
                  if (lyric && !lyricsByVerse["1"]) {
                    lyricsByVerse["1"] = lyric;
                  }

                  return (
                    <div key={voiceId} className="space-y-3 border-l-2 border-indigo-200 pl-3">
                      <p className="text-sm font-bold text-indigo-900">{voiceDef?.label}</p>
                      
                      <div className="space-y-3">
                        <Field label="Not Angka">
                          <TextInput
                            value={notation}
                            onChange={(event) => updateLine(index, {
                              ...line,
                              voices: {
                                ...line.voices,
                                [voiceId]: {
                                  notation: event.target.value,
                                  lyric,
                                  lyricsByVerse
                                }
                              }
                            })}
                            placeholder="5 .6 5 5 6 | 1 .2 1 .6"
                            disabled={isNotationReadOnly}
                          />
                        </Field>

                        <div className="grid gap-3 md:grid-cols-2">
                          {verseNumbers.map((verseNumber) => {
                            const verseLyric = lyricsByVerse[verseNumber] ?? "";
                            return (
                              <div key={verseNumber} className="space-y-1">
                                <Field label={`Ayat ${verseNumber} Lirik`}>
                                  <TextInput
                                    value={verseLyric}
                                    onChange={(event) => {
                                      const nextLyricsByVerse = {
                                        ...lyricsByVerse,
                                        [verseNumber]: event.target.value
                                      };
                                      // Sync legacy field if editing Ayat 1
                                      const nextLegacyLyric = verseNumber === "1" ? event.target.value : lyric;
                                      
                                      updateLine(index, {
                                        ...line,
                                        voices: {
                                          ...line.voices,
                                          [voiceId]: {
                                            notation,
                                            lyric: nextLegacyLyric,
                                            lyricsByVerse: nextLyricsByVerse
                                          }
                                        }
                                      });
                                    }}
                                    placeholder={`Lirik Ayat ${verseNumber} untuk ${voiceDef?.label}`}
                                  />
                                </Field>
                                <AlignmentStatus notation={notation} lyric={verseLyric} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={addLine}>Tambah baris</Button>
        {verseNumbers.map((verseNumber) => (
          <Button key={verseNumber} type="button" variant="danger" onClick={() => deleteVerseNumber(verseNumber)}>
            Hapus Ayat {verseNumber}
          </Button>
        ))}
      </div>
    </div>
  );
}

function collectPartiturVerseNumbers(section: PartiturSection): string[] {
  const verseNumbers = new Set<string>();
  section.lines.forEach((line) => {
    Object.values(line.voices).forEach((voiceData) => {
      Object.keys(voiceData.lyricsByVerse ?? {}).forEach((verseNumber) => {
        verseNumbers.add(verseNumber);
      });
      if (voiceData.lyric && (!voiceData.lyricsByVerse || Object.keys(voiceData.lyricsByVerse).length === 0)) {
        verseNumbers.add("1");
      }
    });
  });
  if (verseNumbers.size === 0) {
    verseNumbers.add("1");
  }
  return [...verseNumbers].sort((a, b) => Number(a) - Number(b));
}

function isPositiveVerseNumber(value: string) {
  return /^[1-9][0-9]*$/.test(value);
}

function NotationSyntaxHint() {
  return (
    <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs leading-5 text-ink-500">
      Petunjuk: `1&apos;` tinggi, `1,` rendah, `[4 5]` bendera, `(4 5)` garis lengkung (slur), `([4 5 6])` bendera + lengkung. Gunakan `|` untuk batas birama.
    </p>
  );
}

function LineActions({
  index,
  total,
  onMove,
  onDelete
}: {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => onMove(-1)} disabled={index === 0}>Naik</Button>
      <Button type="button" onClick={() => onMove(1)} disabled={index === total - 1}>Turun</Button>
      <Button type="button" variant="danger" onClick={onDelete}>Hapus baris</Button>
    </div>
  );
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
  return nextItems;
}

function renumberLines<T extends { lineOrder: number }>(lines: T[]) {
  return lines.map((line, index) => ({
    ...line,
    lineOrder: index + 1
  }));
}

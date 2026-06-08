"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import {
  createDefaultArrangement,
  type ArrangementContentJson,
  type ArrangementSection,
  type ArrangementSectionType,
  type RefrainLine,
  type RefrainSection,
  type SongArrangement,
  type TextOnlyVersesSection,
  updateArrangementContent,
  type VerseLine,
  type VerseSection
} from "@/lib/arrangement-api";
import { getSong, type Song } from "@/lib/song-api";
import { AlignmentStatus } from "@/components/notation/AlignmentStatus";
import { SourceImageReference } from "@/components/source-images/source-image-reference";
import { Button, EmptyState, Field, InlineError, LoadingState, TextArea, TextInput } from "@/components/ui";

type ArrangementEditorProps = {
  songId: string;
};

const sectionDefaults = {
  VERSE: { id: "verse", label: "Ayat" },
  REFRAIN: { id: "refrain", label: "Refrein" },
  TEXT_ONLY_VERSES: { id: "additional-verses", label: "Ayat Tambahan" }
} satisfies Record<ArrangementSectionType, { id: string; label: string }>;

export function ArrangementEditor({ songId }: ArrangementEditorProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [arrangement, setArrangement] = useState<SongArrangement | null>(null);
  const [content, setContent] = useState<ArrangementContentJson>(emptyContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadEditor() {
      setLoading(true);
      setPageError(null);
      try {
        const [loadedSong, loadedArrangement] = await Promise.all([
          getSong(songId),
          createDefaultArrangement(songId)
        ]);
        setSong(loadedSong);
        setArrangement(loadedArrangement);
        setContent(normalizeContent(loadedArrangement.contentJson));
      } catch (error) {
        setPageError(errorMessage(error, "Unable to load arrangement editor"));
      } finally {
        setLoading(false);
      }
    }

    void loadEditor();
  }, [songId]);

  const sectionCounts = useMemo(() => ({
    verse: content.sections.filter((section) => section.type === "VERSE").length,
    refrain: content.sections.filter((section) => section.type === "REFRAIN").length,
    textOnly: content.sections.filter((section) => section.type === "TEXT_ONLY_VERSES").length
  }), [content.sections]);

  async function saveContent() {
    if (!arrangement) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      const normalized = normalizeContent(content);
      const savedArrangement = await updateArrangementContent(arrangement.id, normalized);
      setArrangement(savedArrangement);
      setContent(normalizeContent(savedArrangement.contentJson));
      setSavedMessage("Arrangement saved.");
    } catch (error) {
      setSaveError(errorMessage(error, "Unable to save arrangement"));
    } finally {
      setSaving(false);
    }
  }

  function updateSection(index: number, nextSection: ArrangementSection) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => (
        sectionIndex === index ? nextSection : section
      ))
    }));
    setSavedMessage(null);
  }

  function deleteSection(index: number) {
    setContent((current) => ({
      ...current,
      sections: current.sections.filter((_section, sectionIndex) => sectionIndex !== index)
    }));
    setSavedMessage(null);
  }

  function addSection(type: ArrangementSectionType) {
    setContent((current) => ({
      ...current,
      sections: [
        ...current.sections,
        createSection(type, current.sections)
      ]
    }));
    setSavedMessage(null);
  }

  function moveSection(index: number, direction: -1 | 1) {
    setContent((current) => ({
      ...current,
      sections: moveItem(current.sections, index, direction)
    }));
    setSavedMessage(null);
  }

  if (loading) {
    return <LoadingState label="Loading arrangement editor..." />;
  }

  if (pageError) {
    return (
      <section className="space-y-4">
        <InlineError message={pageError} />
        <Link className="text-sm font-medium text-ink-700 underline" href="/songs">
          Back to songs
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Editor</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-ink-950">
              {song ? `${song.songBook.code} ${song.songNumber} - ${song.title}` : "Editor Not Angka"}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
              Ketik not angka, lirik bait, lirik reff, atau teks tambahan menggunakan kontrol visual yang mudah digunakan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/songs`}
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100"
            >
              Kembali
            </Link>
            <Link
              href={`/songs/${songId}/preview`}
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100"
            >
              Pratinjau
            </Link>
            <Button variant="primary" type="button" disabled={saving} onClick={() => void saveContent()}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink-950">Bagian Lagu (Sections)</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {sectionCounts.verse} bait, {sectionCounts.refrain} reff, {sectionCounts.textOnly} bait teks.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => addSection("VERSE")}>Tambah Bait (Not Angka)</Button>
                <Button type="button" onClick={() => addSection("REFRAIN")}>Tambah Reff (Not Angka)</Button>
                <Button type="button" onClick={() => addSection("TEXT_ONLY_VERSES")}>Tambah Bait (Hanya Teks)</Button>
              </div>
            </div>
          </div>

          <InlineError message={saveError} />
          {savedMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {savedMessage}
            </div>
          ) : null}

          {content.sections.length === 0 ? (
            <EmptyState title="No sections yet" description="Add a verse, refrain, or text-only verse section." />
          ) : (
            content.sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={index}
                totalSections={content.sections.length}
                onChange={(nextSection) => updateSection(index, nextSection)}
                onDelete={() => deleteSection(index)}
                onMove={(direction) => moveSection(index, direction)}
              />
            ))
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold text-ink-950">Save behavior</h2>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Changes stay local until Save arrangement is pressed. The full structured content document is sent to the backend.
            </p>
          </div>
          <SourceImageReference songId={songId} />
        </aside>
      </div>
    </section>
  );
}

type SectionEditorProps = {
  section: ArrangementSection;
  index: number;
  totalSections: number;
  onChange: (section: ArrangementSection) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
};

function SectionEditor({ section, index, totalSections, onChange, onDelete, onMove }: SectionEditorProps) {
  return (
    <article className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-ink-700">
            {section.type}
          </span>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-700">Label</span>
            <input
              className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-ink-950 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              value={section.label}
              onChange={(event) => onChange({ ...section, label: event.target.value })}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onMove(-1)} disabled={index === 0}>Move section up</Button>
          <Button type="button" onClick={() => onMove(1)} disabled={index === totalSections - 1}>Move section down</Button>
          <Button type="button" variant="danger" onClick={onDelete}>Delete section</Button>
        </div>
      </div>

      {section.type === "VERSE" ? (
        <VerseSectionEditor section={section} onChange={onChange} />
      ) : null}
      {section.type === "REFRAIN" ? (
        <RefrainSectionEditor section={section} onChange={onChange} />
      ) : null}
      {section.type === "TEXT_ONLY_VERSES" ? (
        <TextOnlyVersesEditor section={section} onChange={onChange} />
      ) : null}
    </article>
  );
}

function VerseSectionEditor({
  section,
  onChange
}: {
  section: VerseSection;
  onChange: (section: ArrangementSection) => void;
}) {
  const verseNumbers = collectVerseNumbers(section);
  const [newVerseNumber, setNewVerseNumber] = useState("");

  function updateLines(lines: VerseLine[]) {
    onChange({
      ...section,
      lines: renumberLines(lines)
    });
  }

  function addLine() {
    const lyricsByVerse = Object.fromEntries((verseNumbers.length ? verseNumbers : ["1"]).map((verse) => [verse, ""]));
    updateLines([
      ...section.lines,
      {
        lineOrder: section.lines.length + 1,
        notation: "",
        lyricsByVerse
      }
    ]);
  }

  function updateLine(index: number, line: VerseLine) {
    updateLines(section.lines.map((current, lineIndex) => (lineIndex === index ? line : current)));
  }

  function addVerseNumber() {
    const nextVerse = newVerseNumber.trim();
    if (!isPositiveVerseNumber(nextVerse) || verseNumbers.includes(nextVerse)) {
      return;
    }
    updateLines(section.lines.map((line) => ({
      ...line,
      lyricsByVerse: {
        ...(line.lyricsByVerse ?? {}),
        [nextVerse]: ""
      }
    })));
    setNewVerseNumber("");
  }

  function deleteVerseNumber(verseNumber: string) {
    updateLines(section.lines.map((line) => {
      const nextLyrics = { ...(line.lyricsByVerse ?? {}) };
      delete nextLyrics[verseNumber];
      return {
        ...line,
        lyricsByVerse: nextLyrics
      };
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md bg-zinc-50 p-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-950">Verse lyric columns</p>
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

      <NotationSyntaxHint />

      {section.lines.length === 0 ? (
        <EmptyState title="No verse lines" description="Add a line to enter notation and verse lyrics." />
      ) : (
        <div className="space-y-3">
          {section.lines.map((line, index) => (
            <div key={`${section.id}-line-${index}`} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-950">Line {index + 1}</p>
                <LineActions
                  index={index}
                  total={section.lines.length}
                  onMove={(direction) => updateLines(moveItem(section.lines, index, direction))}
                  onDelete={() => updateLines(section.lines.filter((_line, lineIndex) => lineIndex !== index))}
                />
              </div>
              <div className="grid gap-3">
                <Field label="Numbered notation">
                  <TextInput
                    value={line.notation ?? ""}
                    onChange={(event) => updateLine(index, { ...line, notation: event.target.value })}
                    placeholder="5 .6 5 5 6 | 1 .2 1 .6"
                  />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  {verseNumbers.map((verseNumber) => (
                    <div key={verseNumber} className="space-y-2">
                      <Field label={`Verse ${verseNumber} lyric`}>
                        <TextInput
                          value={line.lyricsByVerse?.[verseNumber] ?? ""}
                          onChange={(event) => updateLine(index, {
                            ...line,
                            lyricsByVerse: {
                              ...(line.lyricsByVerse ?? {}),
                              [verseNumber]: event.target.value
                            }
                          })}
                          placeholder={`Lyric for verse ${verseNumber}`}
                        />
                      </Field>
                      <AlignmentStatus
                        notation={line.notation}
                        lyric={line.lyricsByVerse?.[verseNumber] ?? ""}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={addLine}>Add line</Button>
        {verseNumbers.map((verseNumber) => (
          <Button key={verseNumber} type="button" variant="danger" onClick={() => deleteVerseNumber(verseNumber)}>
            Remove verse {verseNumber}
          </Button>
        ))}
      </div>
    </div>
  );
}

function RefrainSectionEditor({
  section,
  onChange
}: {
  section: RefrainSection;
  onChange: (section: ArrangementSection) => void;
}) {
  function updateLines(lines: RefrainLine[]) {
    onChange({
      ...section,
      lines: renumberLines(lines)
    });
  }

  function updateLine(index: number, line: RefrainLine) {
    updateLines(section.lines.map((current, lineIndex) => (lineIndex === index ? line : current)));
  }

  return (
    <div className="space-y-4">
      <NotationSyntaxHint />

      {section.lines.length === 0 ? (
        <EmptyState title="No refrain lines" description="Add a refrain line to enter notation and lyric text." />
      ) : (
        <div className="space-y-3">
          {section.lines.map((line, index) => (
            <div key={`${section.id}-line-${index}`} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-950">Line {index + 1}</p>
                <LineActions
                  index={index}
                  total={section.lines.length}
                  onMove={(direction) => updateLines(moveItem(section.lines, index, direction))}
                  onDelete={() => updateLines(section.lines.filter((_line, lineIndex) => lineIndex !== index))}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Numbered notation">
                  <TextInput
                    value={line.notation ?? ""}
                    onChange={(event) => updateLine(index, { ...line, notation: event.target.value })}
                    placeholder="1 .2 3 3 2 | 3...0"
                  />
                </Field>
                <Field label="Refrain lyric">
                  <TextInput
                    value={line.lyric ?? ""}
                    onChange={(event) => updateLine(index, { ...line, lyric: event.target.value })}
                    placeholder="Ka-sih sa-yang-Mu"
                  />
                </Field>
              </div>
              <AlignmentStatus notation={line.notation} lyric={line.lyric} />
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        onClick={() => updateLines([
          ...section.lines,
          { lineOrder: section.lines.length + 1, notation: "", lyric: "" }
        ])}
      >
        Add line
      </Button>
    </div>
  );
}

function TextOnlyVersesEditor({
  section,
  onChange
}: {
  section: TextOnlyVersesSection;
  onChange: (section: ArrangementSection) => void;
}) {
  const [newVerseNumber, setNewVerseNumber] = useState("");
  const verseNumbers = Object.keys(section.verses).sort(compareVerseNumbers);

  function updateVerses(verses: Record<string, string>) {
    onChange({
      ...section,
      verses
    });
  }

  function addVerse() {
    const nextVerse = newVerseNumber.trim();
    if (!isPositiveVerseNumber(nextVerse) || section.verses[nextVerse] !== undefined) {
      return;
    }
    updateVerses({
      ...section.verses,
      [nextVerse]: ""
    });
    setNewVerseNumber("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-md bg-zinc-50 p-3">
        <label className="space-y-1">
          <span className="text-sm font-medium text-ink-700">Verse number</span>
          <TextInput
            inputMode="numeric"
            value={newVerseNumber}
            onChange={(event) => setNewVerseNumber(event.target.value)}
            placeholder="3"
          />
        </label>
        <Button type="button" onClick={addVerse}>Add text-only verse</Button>
      </div>

      {verseNumbers.length === 0 ? (
        <EmptyState title="No text-only verses" description="Add a verse number and text block." />
      ) : (
        <div className="space-y-3">
          {verseNumbers.map((verseNumber) => (
            <div key={verseNumber} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-950">Verse {verseNumber}</p>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    const nextVerses = { ...section.verses };
                    delete nextVerses[verseNumber];
                    updateVerses(nextVerses);
                  }}
                >
                  Delete
                </Button>
              </div>
              <Field label={`Verse ${verseNumber} text`}>
                <TextArea
                  value={section.verses[verseNumber] ?? ""}
                  onChange={(event) => updateVerses({
                    ...section.verses,
                    [verseNumber]: event.target.value
                  })}
                  placeholder={`Text-only verse ${verseNumber}`}
                />
              </Field>
            </div>
          ))}
        </div>
      )}
    </div>
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
      <Button type="button" onClick={() => onMove(-1)} disabled={index === 0}>Move line up</Button>
      <Button type="button" onClick={() => onMove(1)} disabled={index === total - 1}>Move line down</Button>
      <Button type="button" variant="danger" onClick={onDelete}>Delete line</Button>
    </div>
  );
}

function NotationSyntaxHint() {
  return (
    <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs leading-5 text-ink-500">
      Examples: `1&apos;` high, `1,` low, `[4 5]` beam, `(4 5)` slur, `([4 5 6])` beam + slur, `[(4 5) 6]` partial slur.
    </p>
  );
}

function emptyContent(): ArrangementContentJson {
  return {
    structureVersion: "1.0",
    sections: []
  };
}

function normalizeContent(contentJson: ArrangementContentJson): ArrangementContentJson {
  return {
    structureVersion: "1.0",
    sections: (contentJson.sections ?? []).map((section, index) => normalizeSection(section, index))
  };
}

function normalizeSection(section: ArrangementSection, index: number): ArrangementSection {
  const fallbackId = `${section.type.toLowerCase()}-${index + 1}`;
  if (section.type === "VERSE") {
    return {
      id: section.id || fallbackId,
      type: "VERSE",
      label: section.label || "Ayat",
      repeatable: true,
      lines: renumberLines((section.lines ?? []).map((line) => ({
        lineOrder: line.lineOrder,
        notation: line.notation ?? "",
        lyricsByVerse: line.lyricsByVerse ?? {}
      })))
    };
  }

  if (section.type === "REFRAIN") {
    return {
      id: section.id || fallbackId,
      type: "REFRAIN",
      label: section.label || "Refrein",
      repeatable: false,
      lines: renumberLines((section.lines ?? []).map((line) => ({
        lineOrder: line.lineOrder,
        notation: line.notation ?? "",
        lyric: line.lyric ?? ""
      })))
    };
  }

  return {
    id: section.id || fallbackId,
    type: "TEXT_ONLY_VERSES",
    label: section.label || "Ayat Tambahan",
    verses: section.verses ?? {}
  };
}

function createSection(type: ArrangementSectionType, existingSections: ArrangementSection[]): ArrangementSection {
  const defaults = sectionDefaults[type];
  const id = uniqueSectionId(defaults.id, existingSections);

  if (type === "VERSE") {
    return {
      id,
      type,
      label: defaults.label,
      repeatable: true,
      lines: [
        {
          lineOrder: 1,
          notation: "",
          lyricsByVerse: {
            "1": ""
          }
        }
      ]
    };
  }

  if (type === "REFRAIN") {
    return {
      id,
      type,
      label: defaults.label,
      repeatable: false,
      lines: [
        {
          lineOrder: 1,
          notation: "",
          lyric: ""
        }
      ]
    };
  }

  return {
    id,
    type,
    label: defaults.label,
    verses: {}
  };
}

function uniqueSectionId(baseId: string, sections: ArrangementSection[]) {
  const existingIds = new Set(sections.map((section) => section.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let index = 2;
  while (existingIds.has(`${baseId}-${index}`)) {
    index += 1;
  }
  return `${baseId}-${index}`;
}

function collectVerseNumbers(section: VerseSection) {
  const verseNumbers = new Set<string>();
  section.lines.forEach((line) => {
    Object.keys(line.lyricsByVerse ?? {}).forEach((verseNumber) => verseNumbers.add(verseNumber));
  });
  return [...verseNumbers].sort(compareVerseNumbers);
}

function compareVerseNumbers(left: string, right: string) {
  return Number(left) - Number(right);
}

function isPositiveVerseNumber(value: string) {
  return /^[1-9][0-9]*$/.test(value);
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

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

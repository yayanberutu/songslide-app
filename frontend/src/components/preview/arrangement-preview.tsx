"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import {
  createDefaultArrangement,
  getDefaultArrangement,
  type ArrangementContentJson,
  type RefrainLine,
  type RefrainSection,
  type SongArrangement,
  type TextOnlyVersesSection,
  type VerseLine,
  type VerseSection
} from "@/lib/arrangement-api";
import {
  createSongExport,
  exportDownloadHref,
  type ExportOutputFormat,
  type ExportRefrainMode,
  type ExportTheme,
  type SongExportResponse
} from "@/lib/export-api";
import { getSong, type Song } from "@/lib/song-api";
import { Button, EmptyState, Field, InlineError, LoadingState, SelectInput } from "@/components/ui";

type ArrangementPreviewProps = {
  songId: string;
};

type RefrainMode = ExportRefrainMode;
type PreviewTheme = ExportTheme;

type PreviewLine = {
  notation: string | null;
  lyric: string | null;
};

type PreviewSlide = {
  key: string;
  title: string;
  subtitle: string;
  metadata: string | null;
  lines: PreviewLine[];
};

const refrainModes: Array<{ value: RefrainMode; label: string }> = [
  { value: "NONE", label: "None" },
  { value: "ONCE_AFTER_ALL_VERSES", label: "Once after all verses" },
  { value: "AFTER_EACH_VERSE", label: "After each verse" }
];

export function ArrangementPreview({ songId }: ArrangementPreviewProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [arrangement, setArrangement] = useState<SongArrangement | null>(null);
  const [content, setContent] = useState<ArrangementContentJson>({ structureVersion: "1.0", sections: [] });
  const [selectedVerses, setSelectedVerses] = useState<string[]>([]);
  const [refrainMode, setRefrainMode] = useState<RefrainMode>("AFTER_EACH_VERSE");
  const [theme, setTheme] = useState<PreviewTheme>("LIGHT");
  const [showNotation, setShowNotation] = useState(true);
  const [outputFormat, setOutputFormat] = useState<ExportOutputFormat>("PPTX");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<SongExportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      setLoading(true);
      setPageError(null);
      try {
        const [loadedSong, arrangement] = await Promise.all([
          getSong(songId),
          loadOrCreateDefaultArrangement(songId)
        ]);
        setSong(loadedSong);
        setArrangement(arrangement);
        setContent(normalizeContent(arrangement.contentJson));
      } catch (error) {
        setPageError(errorMessage(error, "Unable to load slide preview"));
      } finally {
        setLoading(false);
      }
    }

    void loadPreview();
  }, [songId]);

  const availableVerses = useMemo(() => collectAvailableVerses(content), [content]);

  useEffect(() => {
    setSelectedVerses((current) => {
      const available = new Set(availableVerses);
      const retained = current.filter((verseNumber) => available.has(verseNumber));
      const next = retained.length > 0 ? retained : availableVerses.slice(0, 1);
      return arraysEqual(current, next) ? current : next;
    });
  }, [availableVerses]);

  const slides = useMemo(() => {
    if (!song) {
      return [];
    }

    return buildPreviewSlides(song, content, selectedVerses, refrainMode);
  }, [content, refrainMode, selectedVerses, song]);

  useEffect(() => {
    setExportError(null);
    setExportResult(null);
  }, [outputFormat, refrainMode, selectedVerses, showNotation, theme]);

  function toggleVerse(verseNumber: string) {
    setSelectedVerses((current) => {
      if (current.includes(verseNumber)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((selectedVerse) => selectedVerse !== verseNumber);
      }

      const selected = new Set([...current, verseNumber]);
      return availableVerses.filter((availableVerse) => selected.has(availableVerse));
    });
  }

  async function handleExport() {
    if (!arrangement) {
      setExportError("Arrangement is not loaded.");
      return;
    }
    if (selectedVerses.length === 0) {
      setExportError("Select at least one verse before exporting.");
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportResult(null);
    try {
      const result = await createSongExport(songId, {
        arrangementId: arrangement.id,
        selectedVerses,
        refrainMode,
        outputFormat,
        layout: {
          theme,
          showNotation,
          slideSize: "LAYOUT_WIDE"
        }
      });

      if (result.status !== "COMPLETED" || !result.downloadUrl) {
        setExportError(result.errorMessage ?? "Export did not complete.");
        return;
      }

      setExportResult(result);
    } catch (error) {
      setExportError(errorMessage(error, "Unable to export song"));
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading slide preview..." />;
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
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Preview</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-ink-950">
              {song ? slideTitle(song) : "Slide preview"}
            </h1>
            {song ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
                {slideMetadata(song) ?? "No music metadata"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/songs/${songId}`}
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100"
            >
              Song detail
            </Link>
            <Link
              href={`/songs/${songId}/editor`}
              className="inline-flex items-center justify-center rounded-md bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-700"
            >
              Open editor
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold text-ink-950">Verses</h2>
            {availableVerses.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-ink-500">No verse content is available.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {availableVerses.map((verseNumber) => (
                  <label key={verseNumber} className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-ink-950"
                      checked={selectedVerses.includes(verseNumber)}
                      onChange={() => toggleVerse(verseNumber)}
                    />
                    Ayat {verseNumber}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
            <Field label="Refrain mode">
              <SelectInput
                value={refrainMode}
                onChange={(event) => setRefrainMode(event.target.value as RefrainMode)}
              >
                {refrainModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Theme">
              <SelectInput value={theme} onChange={(event) => setTheme(event.target.value as PreviewTheme)}>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
              </SelectInput>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-ink-950"
                checked={showNotation}
                onChange={(event) => setShowNotation(event.target.checked)}
              />
              Show notation
            </label>
          </div>

          <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
            <div>
              <h2 className="text-base font-semibold text-ink-950">Export</h2>
              <p className="mt-1 text-sm leading-6 text-ink-500">
                Generate the selected preview as a PowerPoint file or PNG ZIP.
              </p>
            </div>
            <Field label="Output format">
              <SelectInput
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as ExportOutputFormat)}
              >
                <option value="PPTX">PPTX</option>
                <option value="PNG">PNG ZIP</option>
              </SelectInput>
            </Field>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={exporting || selectedVerses.length === 0}
              onClick={() => void handleExport()}
            >
              {exporting ? "Exporting..." : `Export ${outputFormat === "PPTX" ? "PPTX" : "PNG ZIP"}`}
            </Button>
            <InlineError message={exportError} />
            {exportResult?.downloadUrl ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-semibold">Export completed.</p>
                <a
                  href={exportDownloadHref(exportResult.downloadUrl)}
                  download
                  className="mt-2 inline-flex items-center justify-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Download {exportResult.outputFormat === "PPTX" ? "PPTX" : "PNG ZIP"}
                </a>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="space-y-4">
          {slides.length === 0 ? (
            <EmptyState
              title="No preview slides"
              description="Select a verse with saved verse, refrain, or text-only content."
            />
          ) : (
            slides.map((slide, index) => (
              <PreviewSlideCard
                key={slide.key}
                slide={slide}
                slideNumber={index + 1}
                totalSlides={slides.length}
                theme={theme}
                showNotation={showNotation}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

async function loadOrCreateDefaultArrangement(songId: string) {
  try {
    return await getDefaultArrangement(songId);
  } catch (error) {
    if (error instanceof ApiError && error.code === 404) {
      return createDefaultArrangement(songId);
    }
    throw error;
  }
}

function PreviewSlideCard({
  slide,
  slideNumber,
  totalSlides,
  theme,
  showNotation
}: {
  slide: PreviewSlide;
  slideNumber: number;
  totalSlides: number;
  theme: PreviewTheme;
  showNotation: boolean;
}) {
  const isDark = theme === "DARK";
  const visibleLines = slide.lines.filter((line) => (showNotation && hasText(line.notation)) || hasText(line.lyric));

  return (
    <article
      className={[
        "aspect-video min-h-[320px] overflow-hidden rounded-md border p-5 shadow-sm",
        isDark ? "border-zinc-700 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-ink-950"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4 border-b border-current/15 pb-3">
        <div className="min-w-0">
          <p className={["truncate text-sm font-semibold", isDark ? "text-zinc-100" : "text-ink-950"].join(" ")}>
            {slide.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">{slide.subtitle}</h2>
          {slide.metadata ? (
            <p className={["mt-1 text-sm", isDark ? "text-zinc-300" : "text-ink-500"].join(" ")}>
              {slide.metadata}
            </p>
          ) : null}
        </div>
        <p className={["shrink-0 text-xs font-medium", isDark ? "text-zinc-400" : "text-ink-500"].join(" ")}>
          {slideNumber}/{totalSlides}
        </p>
      </div>

      <div className="mt-5 max-h-[calc(100%-5.5rem)] space-y-4 overflow-y-auto pr-2">
        {visibleLines.length === 0 ? (
          <p className={["text-sm", isDark ? "text-zinc-400" : "text-ink-500"].join(" ")}>No visible lines.</p>
        ) : (
          visibleLines.map((line, index) => (
            <div key={`${slide.key}-line-${index}`} className="space-y-1">
              {showNotation && hasText(line.notation) ? (
                <p className={["break-all font-mono text-lg leading-7", isDark ? "text-cyan-100" : "text-ink-950"].join(" ")}>
                  {line.notation}
                </p>
              ) : null}
              {hasText(line.lyric) ? (
                <p className={["whitespace-pre-wrap break-words text-lg leading-7 [overflow-wrap:anywhere]", isDark ? "text-zinc-50" : "text-ink-800"].join(" ")}>
                  {line.lyric}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function normalizeContent(contentJson: ArrangementContentJson): ArrangementContentJson {
  return {
    structureVersion: "1.0",
    sections: contentJson.sections ?? []
  };
}

function buildPreviewSlides(
  song: Song,
  content: ArrangementContentJson,
  selectedVerses: string[],
  refrainMode: RefrainMode
) {
  const slides: PreviewSlide[] = [];
  const title = slideTitle(song);
  const metadata = slideMetadata(song);

  selectedVerses.forEach((verseNumber) => {
    appendVerseSlides(slides, content, verseNumber, title, metadata);
    appendTextOnlyVerseSlides(slides, content, verseNumber, title, metadata);

    if (refrainMode === "AFTER_EACH_VERSE") {
      appendRefrainSlides(slides, content, title, metadata);
    }
  });

  if (refrainMode === "ONCE_AFTER_ALL_VERSES") {
    appendRefrainSlides(slides, content, title, metadata);
  }

  return slides;
}

function appendVerseSlides(
  slides: PreviewSlide[],
  content: ArrangementContentJson,
  verseNumber: string,
  title: string,
  metadata: string | null
) {
  sectionsOfType<VerseSection>(content, "VERSE").forEach((section, sectionIndex) => {
    if (!sectionHasVerse(section, verseNumber)) {
      return;
    }

    const lines = sortedLines(section.lines).reduce<PreviewLine[]>((currentLines, line) => {
      return addPreviewLine(currentLines, line.notation, line.lyricsByVerse?.[verseNumber]);
    }, []);

    if (lines.length > 0) {
      slides.push({
        key: `${section.id}-${verseNumber}-${sectionIndex}`,
        title,
        subtitle: `${section.label || "Ayat"} ${verseNumber}`,
        metadata,
        lines
      });
    }
  });
}

function appendTextOnlyVerseSlides(
  slides: PreviewSlide[],
  content: ArrangementContentJson,
  verseNumber: string,
  title: string,
  metadata: string | null
) {
  sectionsOfType<TextOnlyVersesSection>(content, "TEXT_ONLY_VERSES").forEach((section, sectionIndex) => {
    const lyric = section.verses?.[verseNumber];
    if (!hasText(lyric)) {
      return;
    }

    const lines = lyric.split(/\r?\n/).reduce<PreviewLine[]>((currentLines, line) => {
      return addPreviewLine(currentLines, null, line);
    }, []);

    if (lines.length > 0) {
      slides.push({
        key: `${section.id}-${verseNumber}-${sectionIndex}`,
        title,
        subtitle: `${section.label || "Ayat Tambahan"} ${verseNumber}`,
        metadata,
        lines
      });
    }
  });
}

function appendRefrainSlides(
  slides: PreviewSlide[],
  content: ArrangementContentJson,
  title: string,
  metadata: string | null
) {
  sectionsOfType<RefrainSection>(content, "REFRAIN").forEach((section, sectionIndex) => {
    const lines = sortedLines(section.lines).reduce<PreviewLine[]>((currentLines, line) => {
      return addPreviewLine(currentLines, line.notation, line.lyric);
    }, []);

    if (lines.length > 0) {
      slides.push({
        key: `${section.id}-refrain-${slides.length}-${sectionIndex}`,
        title,
        subtitle: section.label || "Refrein",
        metadata,
        lines
      });
    }
  });
}

function addPreviewLine(lines: PreviewLine[], notation: string | null | undefined, lyric: string | null | undefined) {
  const cleanNotation = notation?.trim() || null;
  const cleanLyric = lyric?.trim() || null;
  if (cleanNotation || cleanLyric) {
    return [...lines, { notation: cleanNotation, lyric: cleanLyric }];
  }
  return lines;
}

function collectAvailableVerses(content: ArrangementContentJson) {
  const verses = new Set<string>();
  sectionsOfType<VerseSection>(content, "VERSE").forEach((section) => {
    section.lines.forEach((line) => {
      Object.keys(line.lyricsByVerse ?? {}).forEach((verseNumber) => {
        if (isPositiveVerseNumber(verseNumber)) {
          verses.add(verseNumber);
        }
      });
    });
  });
  sectionsOfType<TextOnlyVersesSection>(content, "TEXT_ONLY_VERSES").forEach((section) => {
    Object.keys(section.verses ?? {}).forEach((verseNumber) => {
      if (isPositiveVerseNumber(verseNumber)) {
        verses.add(verseNumber);
      }
    });
  });
  return [...verses].sort(compareVerseNumbers);
}

function sectionHasVerse(section: VerseSection, verseNumber: string) {
  return section.lines.some((line) => Boolean(line.lyricsByVerse && Object.hasOwn(line.lyricsByVerse, verseNumber)));
}

function sectionsOfType<T>(content: ArrangementContentJson, type: T extends VerseSection
  ? "VERSE"
  : T extends RefrainSection
    ? "REFRAIN"
    : "TEXT_ONLY_VERSES"
) {
  return content.sections.filter((section) => section.type === type) as T[];
}

function sortedLines<T extends VerseLine | RefrainLine>(lines: T[] = []) {
  return [...lines].sort((left, right) => left.lineOrder - right.lineOrder);
}

function slideTitle(song: Song) {
  return `${song.songBook.code} ${song.songNumber} - ${song.title}`;
}

function slideMetadata(song: Song) {
  const parts = [
    hasText(song.defaultKey) ? `Do = ${song.defaultKey}` : null,
    hasText(song.timeSignature) ? song.timeSignature : null,
    song.tempo ? `${song.tempo} BPM` : null
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : null;
}

function compareVerseNumbers(left: string, right: string) {
  return Number(left) - Number(right);
}

function isPositiveVerseNumber(value: string) {
  return /^[1-9][0-9]*$/.test(value);
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim().length > 0;
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
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

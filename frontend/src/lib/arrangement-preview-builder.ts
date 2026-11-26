import type {
  ArrangementContentJson,
  RefrainLine,
  RefrainSection,
  TextOnlyVersesSection,
  VerseLine,
  VerseSection,
  PartiturSection
} from "./arrangement-api";
import {
  sectionHasVerse,
  sectionsOfType,
  compareVerseNumbers
} from "./arrangement-helpers";
import type { ExportRefrainMode } from "./export-api";
import {
  parseNotationLine,
  type NotationToken as NotationTokenValue
} from "./notation-parser";
import type { Song } from "./song-api";

export type RefrainMode = ExportRefrainMode;

export type PreviewLine = {
  notation: string | null;
  lyric: string | null;
  startNoteIndex: number;
  tokens: NotationTokenValue[];
};

export type PreviewSlide = {
  key: string;
  title: string;
  subtitle: string;
  metadata: string | null;
  lines: PreviewLine[];
};

export type DocumentOrderPreviewItem =
  | { kind: "SLIDE"; slide: PreviewSlide }
  | { kind: "PARTITUR"; section: PartiturSection };

export function hasText(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

export function slideTitle(song: Song | null): string {
  if (!song) return "Untitled";
  return `${song.songBook.code} ${song.songNumber} - ${song.title}`;
}

export function slideMetadata(song: Song | null): string | null {
  if (!song) return null;
  const parts = [
    hasText(song.defaultKey) ? `Do = ${song.defaultKey}` : null,
    hasText(song.timeSignature) ? song.timeSignature : null,
    song.tempo ? `${song.tempo} BPM` : null
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : null;
}

export function sortedLines<T extends VerseLine | RefrainLine>(lines: T[] = []): T[] {
  return [...lines].sort((left, right) => left.lineOrder - right.lineOrder);
}

export function addPreviewLine(
  lines: PreviewLine[],
  notation: string | null | undefined,
  lyric: string | null | undefined,
  buildContext: { nextStartNoteIndex: number; advanceGlobalNoteIndex: (tokens: NotationTokenValue[]) => void }
): PreviewLine[] {
  const cleanNotation = notation?.trim() || null;
  const cleanLyric = lyric?.trim() || null;
  if (cleanNotation || cleanLyric) {
    let tokens: NotationTokenValue[] = [];
    const startNoteIndex = buildContext.nextStartNoteIndex;

    if (cleanNotation) {
      const parsed = parseNotationLine(cleanNotation);
      tokens = parsed.tokens;
      buildContext.advanceGlobalNoteIndex(tokens);
    }

    return [...lines, { notation: cleanNotation, lyric: cleanLyric, startNoteIndex, tokens }];
  }
  return lines;
}

export function appendVerseSlides(
  slides: PreviewSlide[],
  content: ArrangementContentJson,
  verseNumber: string,
  title: string,
  metadata: string | null,
  buildContext: { nextStartNoteIndex: number; advanceGlobalNoteIndex: (tokens: NotationTokenValue[]) => void }
): void {
  sectionsOfType<VerseSection>(content, "VERSE").forEach((section, sectionIndex) => {
    if (!sectionHasVerse(section, verseNumber)) {
      return;
    }

    const lines = sortedLines(section.lines).reduce<PreviewLine[]>((currentLines, line) => {
      return addPreviewLine(currentLines, line.notation, line.lyricsByVerse?.[verseNumber], buildContext);
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

export function appendTextOnlyVerseSlides(
  slides: PreviewSlide[],
  content: ArrangementContentJson,
  verseNumber: string,
  title: string,
  metadata: string | null,
  buildContext: { nextStartNoteIndex: number; advanceGlobalNoteIndex: (tokens: NotationTokenValue[]) => void }
): void {
  sectionsOfType<TextOnlyVersesSection>(content, "TEXT_ONLY_VERSES").forEach((section, sectionIndex) => {
    const lyric = section.verses?.[verseNumber];
    if (!hasText(lyric)) {
      return;
    }

    const lines = lyric.split(/\r?\n/).reduce<PreviewLine[]>((currentLines, line) => {
      return addPreviewLine(currentLines, null, line, buildContext);
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

export function appendRefrainSlides(
  slides: PreviewSlide[],
  content: ArrangementContentJson,
  title: string,
  metadata: string | null,
  buildContext: { nextStartNoteIndex: number; advanceGlobalNoteIndex: (tokens: NotationTokenValue[]) => void }
): void {
  sectionsOfType<RefrainSection>(content, "REFRAIN").forEach((section, sectionIndex) => {
    const lines = sortedLines(section.lines).reduce<PreviewLine[]>((currentLines, line) => {
      return addPreviewLine(currentLines, line.notation, line.lyric, buildContext);
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

export function buildPreviewSlides(
  song: Song,
  content: ArrangementContentJson,
  selectedVerses: string[],
  refrainMode: ExportRefrainMode
): PreviewSlide[] {
  const slides: PreviewSlide[] = [];
  const title = slideTitle(song);
  const metadata = slideMetadata(song);

  let globalNoteIndex = 0;

  const buildContext = {
    get nextStartNoteIndex() {
      return globalNoteIndex;
    },
    advanceGlobalNoteIndex(tokens: NotationTokenValue[]) {
      const countNotes = (tks: NotationTokenValue[]) => {
        for (const token of tks) {
          if (token.type === "NOTE" || token.type === "REST" || token.type === "EXTENSION") {
            globalNoteIndex++;
          } else if (token.type === "SLUR" || token.type === "BEAM") {
            countNotes(token.children);
          }
        }
      };
      countNotes(tokens);
    }
  };

  selectedVerses.forEach((verseNumber) => {
    appendVerseSlides(slides, content, verseNumber, title, metadata, buildContext);
    appendTextOnlyVerseSlides(slides, content, verseNumber, title, metadata, buildContext);

    if (refrainMode === "AFTER_EACH_VERSE") {
      appendRefrainSlides(slides, content, title, metadata, buildContext);
    }
  });

  if (refrainMode === "ONCE_AFTER_ALL_VERSES") {
    appendRefrainSlides(slides, content, title, metadata, buildContext);
  }

  return slides;
}

export function buildDocumentOrderPreview(
  song: Song | null,
  content: ArrangementContentJson
): DocumentOrderPreviewItem[] {
  const items: DocumentOrderPreviewItem[] = [];
  const title = slideTitle(song);
  const metadata = slideMetadata(song);

  let globalNoteIndex = 0;

  const buildContext = {
    get nextStartNoteIndex() {
      return globalNoteIndex;
    },
    advanceGlobalNoteIndex(tokens: NotationTokenValue[]) {
      const countNotes = (tks: NotationTokenValue[]) => {
        for (const token of tks) {
          if (token.type === "NOTE" || token.type === "REST" || token.type === "EXTENSION") {
            globalNoteIndex++;
          } else if (token.type === "SLUR" || token.type === "BEAM") {
            countNotes(token.children);
          }
        }
      };
      countNotes(tokens);
    }
  };

  (content.sections ?? []).forEach((section, sectionIndex) => {
    if (section.type === "PARTITUR") {
      items.push({ kind: "PARTITUR", section });
    } else if (section.type === "VERSE") {
      const verseNumbers = new Set<string>();
      section.lines.forEach((line) => {
        Object.keys(line.lyricsByVerse ?? {}).forEach((v) => {
          if (/^[1-9][0-9]*$/.test(v)) verseNumbers.add(v);
        });
      });
      const sortedVerses = [...verseNumbers].sort(compareVerseNumbers);
      const versesToRender = sortedVerses.length > 0 ? sortedVerses : ["1"];

      versesToRender.forEach((verseNumber) => {
        const lines = sortedLines(section.lines).reduce<PreviewLine[]>((currentLines, line) => {
          return addPreviewLine(currentLines, line.notation, line.lyricsByVerse?.[verseNumber], buildContext);
        }, []);

        if (lines.length > 0) {
          items.push({
            kind: "SLIDE",
            slide: {
              key: `${section.id}-${verseNumber}-${sectionIndex}`,
              title,
              subtitle: `${section.label || "Ayat"} ${verseNumber}`,
              metadata,
              lines
            }
          });
        }
      });
    } else if (section.type === "REFRAIN") {
      const lines = sortedLines(section.lines).reduce<PreviewLine[]>((currentLines, line) => {
        return addPreviewLine(currentLines, line.notation, line.lyric, buildContext);
      }, []);

      if (lines.length > 0) {
        items.push({
          kind: "SLIDE",
          slide: {
            key: `${section.id}-refrain-${items.length}-${sectionIndex}`,
            title,
            subtitle: section.label || "Refrein",
            metadata,
            lines
          }
        });
      }
    } else if (section.type === "TEXT_ONLY_VERSES") {
      const verseNumbers = Object.keys(section.verses ?? {})
        .filter((v) => /^[1-9][0-9]*$/.test(v))
        .sort(compareVerseNumbers);

      verseNumbers.forEach((verseNumber) => {
        const lyric = section.verses?.[verseNumber];
        if (!hasText(lyric)) return;

        const lines = lyric.split(/\r?\n/).reduce<PreviewLine[]>((currentLines, line) => {
          return addPreviewLine(currentLines, null, line, buildContext);
        }, []);

        if (lines.length > 0) {
          items.push({
            kind: "SLIDE",
            slide: {
              key: `${section.id}-${verseNumber}-${sectionIndex}`,
              title,
              subtitle: `${section.label || "Ayat Tambahan"} ${verseNumber}`,
              metadata,
              lines
            }
          });
        }
      });
    }
  });

  return items;
}

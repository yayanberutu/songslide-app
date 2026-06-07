import { parseNotationLine, parseLyricSyllables, type NotationToken } from "./notation-renderer";
import type { ExportPayload } from "./schemas";

type SlideLinePayload = ExportPayload["slides"][number]["lines"][number];

type StreamItem = {
  token: NotationToken;
  syllables: string[];
  sourceRaw: string;
};

export function reflowLines(lines: SlideLinePayload[], beatsPerLine: number): SlideLinePayload[] {
  const stream: StreamItem[] = [];

  for (const line of lines) {
    if (!line.notation) {
      continue;
    }

    const parsed = parseNotationLine(line.notation);
    const syllables = parseLyricSyllables(line.lyric);
    let syllableIndex = 0;

    for (const token of parsed.tokens) {
      const slots = token.lyricSlots;
      const tokenSyllables = syllables.slice(syllableIndex, syllableIndex + slots);
      syllableIndex += slots;

      stream.push({
        token,
        syllables: tokenSyllables,
        sourceRaw: token.raw
      });
    }
  }

  const reflowedLines: SlideLinePayload[] = [];
  let currentNotation: string[] = [];
  let currentLyric: string[] = [];
  let currentBeats = 0;

  for (let i = 0; i < stream.length; i++) {
    const item = stream[i];
    const isBeat = item.token.type !== "BAR" && item.token.type !== "DOUBLE_BAR";
    const isExtension = item.token.type === "EXTENSION";
    const isBarLine = !isBeat;

    // We break BEFORE adding the current item if we've reached the limit
    // AND the current item is NOT an extension or bar line that should stick to the previous beat.
    if (currentBeats >= beatsPerLine && !isExtension && !isBarLine) {
      reflowedLines.push({
        notation: currentNotation.join(" "),
        lyric: currentLyric.length > 0 ? currentLyric.join(" ") : undefined
      });
      currentNotation = [];
      currentLyric = [];
      currentBeats = 0;
    }

    currentNotation.push(item.sourceRaw);
    if (item.syllables.length > 0) {
      currentLyric.push(item.syllables.join("-"));
    }

    if (isBeat) {
      currentBeats++;
    }
  }

  if (currentNotation.length > 0) {
    reflowedLines.push({
      notation: currentNotation.join(" "),
      lyric: currentLyric.length > 0 ? currentLyric.join(" ") : undefined
    });
  }

  return reflowedLines;
}

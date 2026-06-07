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

    if (isBeat && currentBeats >= beatsPerLine) {
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
      // Ensure we preserve multi-syllable spacing within a single token if necessary
      currentLyric.push(item.syllables.join("-"));
    } else if (item.token.lyricSlots > 0) {
      // Pad missing syllables with empty string to maintain alignment? 
      // Actually, notation-renderer handles missing syllables gracefully.
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

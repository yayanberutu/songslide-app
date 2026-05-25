import {
  collectLyricSlotTokens,
  countNotationLyricSlots,
  parseNotationLine,
  type NotationLyricSlotToken,
  type NotationParseResult
} from "./notation-parser";
import { parseLyricSyllables, type LyricSyllable } from "./lyric-parser";

export type AlignmentStatus = "MATCH" | "TOO_MANY_LYRICS" | "TOO_FEW_LYRICS" | "PARSER_ERROR";

export type AlignmentCell = {
  notationToken: NotationLyricSlotToken | null;
  lyric: LyricSyllable | null;
};

export type AlignmentResult = {
  status: AlignmentStatus;
  notation: NotationParseResult;
  lyricSyllables: LyricSyllable[];
  notationSlotCount: number;
  lyricCount: number;
  cells: AlignmentCell[];
};

export function alignNotationAndLyric(notationText: string | null | undefined, lyricText: string | null | undefined): AlignmentResult {
  const notation = parseNotationLine(notationText);
  const lyricSyllables = parseLyricSyllables(lyricText);
  const notationTokens = collectLyricSlotTokens(notation.tokens);
  const notationSlotCount = countNotationLyricSlots(notation.tokens);
  const lyricCount = lyricSyllables.length;
  const cells: AlignmentCell[] = [];

  const slotCount = Math.max(notationTokens.length, lyricSyllables.length);
  for (let index = 0; index < slotCount; index += 1) {
    const notationToken = notationTokens[index];
    const lyric = lyricSyllables[index];
    cells.push({
      notationToken: notationToken ?? null,
      lyric: lyric ?? null
    });
  }

  if (notation.issues.length > 0) {
    return {
      status: "PARSER_ERROR",
      notation,
      lyricSyllables,
      notationSlotCount,
      lyricCount,
      cells
    };
  }

  if (lyricCount > notationSlotCount) {
    return {
      status: "TOO_MANY_LYRICS",
      notation,
      lyricSyllables,
      notationSlotCount,
      lyricCount,
      cells
    };
  }

  if (lyricCount < notationSlotCount) {
    return {
      status: "TOO_FEW_LYRICS",
      notation,
      lyricSyllables,
      notationSlotCount,
      lyricCount,
      cells
    };
  }

  return {
    status: "MATCH",
    notation,
    lyricSyllables,
    notationSlotCount,
    lyricCount,
    cells
  };
}

import {
  collectLyricSlotTokens,
  countNotationLyricSlots,
  parseNotationLine,
  type NotationNoteToken,
  type NotationLyricSlotToken,
  type NotationParseResult
} from "./notation-parser";
import { parseLyricSyllables, type LyricSyllable } from "./lyric-parser";

export type AlignmentStatus = "MATCH" | "TOO_MANY_LYRICS" | "TOO_FEW_LYRICS" | "PARSER_ERROR";

export type AlignmentCell = {
  notationToken: NotationLyricSlotToken | null;
  anchorToken: NotationNoteToken | null;
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
  // Build cells with null lyric by default
  const cells: AlignmentCell[] = notationTokens.map((tok) => ({
    notationToken: tok,
    anchorToken: resolveAnchorToken(tok),
    lyric: null,
  }));

  if (lyricSyllables.length === 0 || notationTokens.length === 0) {
    if (notation.issues.length > 0) {
      return { status: "PARSER_ERROR", notation, lyricSyllables, notationSlotCount, lyricCount, cells };
    }
    return {
      status: lyricCount > notationSlotCount ? "TOO_MANY_LYRICS" : lyricCount < notationSlotCount ? "TOO_FEW_LYRICS" : "MATCH",
      notation, lyricSyllables, notationSlotCount, lyricCount, cells
    };
  }

  // --- Spatial nearest-neighbour assignment ---
  // For each syllable, find the closest slot (by char index distance).
  // A slot can only be claimed once; we keep the closest claim.
  type Candidate = { syllable: LyricSyllable; distance: number };
  const slotClaims = new Map<number, Candidate>(); // slotIndex → best candidate

  for (const syllable of lyricSyllables) {
    let bestSlot = -1;
    let bestDist = Infinity;

    for (let i = 0; i < notationTokens.length; i++) {
      const dist = Math.abs(notationTokens[i].index - syllable.startIndex);
      if (dist < bestDist) {
        bestDist = dist;
        bestSlot = i;
      }
    }

    if (bestSlot === -1) continue;

    const existing = slotClaims.get(bestSlot);
    if (!existing || bestDist < existing.distance) {
      slotClaims.set(bestSlot, { syllable, distance: bestDist });
    }
  }

  // Apply claims to cells
  for (const [slotIndex, { syllable }] of slotClaims) {
    cells[slotIndex].lyric = syllable;
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

function resolveAnchorToken(token: NotationLyricSlotToken): NotationNoteToken | null {
  if (token.type === "NOTE") {
    return token;
  }

  return findFirstRenderableNote(token.children);
}

function findFirstRenderableNote(tokens: readonly NotationParseResult["tokens"][number][]): NotationNoteToken | null {
  for (const token of tokens) {
    if (token.type === "NOTE") {
      return token;
    }

    if (token.type === "SLUR" || token.type === "BEAM") {
      const nested = findFirstRenderableNote(token.children);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

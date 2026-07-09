import {
  collectLyricSlotTokens,
  parseNotationLine,
  type NotationNoteToken,
  type NotationLyricSlotToken,
  type NotationParseResult,
} from "@/lib/notation-parser";
import {
  parsePlaygroundLyricSyllables,
  type PlaygroundLyricSyllable,
} from "./playground-lyric-parser";

export type PlaygroundAlignmentCell = {
  notationToken: NotationLyricSlotToken | null;
  anchorToken: NotationNoteToken | null;
  lyric: PlaygroundLyricSyllable | null;
};

export type PlaygroundAlignmentResult = {
  notation: NotationParseResult;
  lyricSyllables: PlaygroundLyricSyllable[];
  cells: PlaygroundAlignmentCell[];
};

/**
 * Spatial alignment:
 * Each notation slot token has a character `index` in the raw line.
 * Each lyric syllable has a `startIndex` in the raw lyric line.
 *
 * We assign each lyric syllable to the notation slot whose `index` is the
 * closest — using a greedy nearest-neighbour pass. Syllables that don't
 * match any slot are dropped; slots without a matching syllable get null.
 *
 * This correctly handles:
 *   - Sparse lyrics (large gaps between syllables → skip slots)
 *   - Extra lyrics (ignored)
 *   - Missing lyrics (slots get no lyric)
 */
export function alignPlaygroundNotationAndLyric(
  notationText: string | null | undefined,
  lyricText: string | null | undefined
): PlaygroundAlignmentResult {
  const notation = parseNotationLine(notationText);
  const lyricSyllables = parsePlaygroundLyricSyllables(lyricText);
  const notationTokens = collectLyricSlotTokens(notation.tokens);

  // Build cells with null lyric by default
  const cells: PlaygroundAlignmentCell[] = notationTokens.map((tok) => ({
    notationToken: tok,
    anchorToken: resolveAnchorToken(tok),
    lyric: null,
  }));

  if (lyricSyllables.length === 0 || notationTokens.length === 0) {
    return { notation, lyricSyllables, cells };
  }

  // --- Spatial nearest-neighbour assignment ---
  // For each syllable, find the closest slot (by char index distance).
  // A slot can only be claimed once; we keep the closest claim.
  type Candidate = { syllable: PlaygroundLyricSyllable; distance: number };
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

  return { notation, lyricSyllables, cells };
}

function resolveAnchorToken(
  token: NotationLyricSlotToken
): NotationNoteToken | null {
  if (token.type === "NOTE") return token;
  return findFirstRenderableNote(token.children);
}

function findFirstRenderableNote(
  tokens: readonly NotationParseResult["tokens"][number][]
): NotationNoteToken | null {
  for (const token of tokens) {
    if (token.type === "NOTE") return token;
    if (token.type === "SLUR" || token.type === "BEAM") {
      const nested = findFirstRenderableNote(token.children);
      if (nested) return nested;
    }
  }
  return null;
}

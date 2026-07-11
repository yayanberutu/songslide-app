export type PlaygroundLyricSyllable = {
  text: string;
  /** Sequential index (0-based) */
  index: number;
  /** Character position where this syllable starts in the original string (before trimming) */
  startIndex: number;
};

/**
 * Parses a lyric string into syllables, preserving the original character
 * start-index of each syllable so that spatial alignment can be done against
 * the notation token's character index.
 *
 * Splitting strategy:
 *   - Syllables are separated by whitespace or hyphens.
 *   - The startIndex is the position of the FIRST non-whitespace character
 *     of each syllable in the *untrimmed* source string, so that intentional
 *     large gaps (e.g. "si   on.") correctly push a syllable far to the right.
 */
export function parsePlaygroundLyricSyllables(
  input: string | null | undefined
): PlaygroundLyricSyllable[] {
  const source = input ?? "";
  if (source.trim().length === 0) return [];

  const result: PlaygroundLyricSyllable[] = [];
  // Match runs of non-whitespace, non-hyphen characters (the actual syllable text)
  const regex = /[^\s-]+/g;
  let match: RegExpExecArray | null;
  let seqIndex = 0;

  while ((match = regex.exec(source)) !== null) {
    result.push({
      text: match[0],
      index: seqIndex++,
      startIndex: match.index,
    });
  }

  return result;
}

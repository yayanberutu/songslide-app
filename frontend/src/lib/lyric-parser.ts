export type LyricSyllable = {
  text: string;
  index: number;
  startIndex: number;
};

export function parseLyricSyllables(input: string | null | undefined): LyricSyllable[] {
  const source = input ?? "";
  if (source.trim().length === 0) return [];

  const result: LyricSyllable[] = [];
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

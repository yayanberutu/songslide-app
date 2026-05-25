export type LyricSyllable = {
  text: string;
  index: number;
};

export function parseLyricSyllables(input: string | null | undefined) {
  const source = input?.trim() ?? "";
  if (source.length === 0) {
    return [];
  }

  return source
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((text, index) => ({ text, index })) satisfies LyricSyllable[];
}

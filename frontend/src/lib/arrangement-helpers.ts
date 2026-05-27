import type {
  ArrangementContentJson,
  RefrainSection,
  TextOnlyVersesSection,
  VerseSection
} from "./arrangement-api";

export function collectAvailableVerses(content: ArrangementContentJson): string[] {
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

export function sectionHasVerse(section: VerseSection, verseNumber: string): boolean {
  return section.lines.some((line) => Boolean(line.lyricsByVerse && Object.hasOwn(line.lyricsByVerse, verseNumber)));
}

export function sectionsOfType<T>(
  content: ArrangementContentJson,
  type: T extends VerseSection ? "VERSE" : T extends RefrainSection ? "REFRAIN" : "TEXT_ONLY_VERSES"
): T[] {
  return content.sections.filter((section) => section.type === type) as T[];
}

export function compareVerseNumbers(left: string, right: string): number {
  return Number(left) - Number(right);
}

export function isPositiveVerseNumber(value: string): boolean {
  return /^[1-9][0-9]*$/.test(value);
}

export function normalizeSelectedVerses(selectedVerses: string[]): string[] {
  return [...selectedVerses].sort(compareVerseNumbers);
}

import { apiRequest } from "@/lib/api-client";

export type ArrangementSectionType = "VERSE" | "REFRAIN" | "TEXT_ONLY_VERSES" | "PARTITUR";

export type VerseLine = {
  lineOrder: number;
  notation?: string;
  notationsByVoice?: Record<string, string>;
  lyricsByVerse?: Record<string, string>;
  lyricsByVoiceAndVerse?: Record<string, Record<string, string>>;
};

export type RefrainLine = {
  lineOrder: number;
  notation?: string;
  notationsByVoice?: Record<string, string>;
  lyric?: string;
  lyricsByVoice?: Record<string, string>;
};

export type VerseSection = {
  id: string;
  type: "VERSE";
  label: string;
  repeatable: true;
  lines: VerseLine[];
};

export type RefrainSection = {
  id: string;
  type: "REFRAIN";
  label: string;
  repeatable: false;
  lines: RefrainLine[];
};

export type TextOnlyVersesSection = {
  id: string;
  type: "TEXT_ONLY_VERSES";
  label: string;
  verses: Record<string, string>;
};

export type PartiturLine = {
  lineOrder: number;
  voices: Record<string, {
    notation: string;
    lyric: string;
    lyricsByVerse?: Record<string, string>;
  }>;
};

export type PartiturSection = {
  id: string;
  type: "PARTITUR";
  label: string;
  enabledVoices: string[];
  lines: PartiturLine[];
};

export type ArrangementSection = VerseSection | RefrainSection | TextOnlyVersesSection | PartiturSection;

export type ArrangementContentJson = {
  structureVersion: "1.0";
  sections: ArrangementSection[];
};

export type SongArrangement = {
  id: string;
  songId: string;
  name: string;
  isDefault: boolean;
  contentJson: ArrangementContentJson;
  layoutJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export function createDefaultArrangement(songId: string) {
  return apiRequest<SongArrangement>(`/api/songs/${songId}/arrangements/default`, {
    method: "POST"
  });
}

export function getDefaultArrangement(songId: string) {
  return apiRequest<SongArrangement>(`/api/songs/${songId}/arrangements/default`);
}

export function updateArrangementContent(arrangementId: string, contentJson: ArrangementContentJson) {
  return apiRequest<SongArrangement>(`/api/arrangements/${arrangementId}/content`, {
    method: "PUT",
    body: JSON.stringify({ contentJson })
  });
}

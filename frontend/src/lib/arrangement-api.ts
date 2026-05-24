import { apiRequest } from "@/lib/api-client";

export type ArrangementSectionType = "VERSE" | "REFRAIN" | "TEXT_ONLY_VERSES";

export type VerseLine = {
  lineOrder: number;
  notation?: string;
  lyricsByVerse?: Record<string, string>;
};

export type RefrainLine = {
  lineOrder: number;
  notation?: string;
  lyric?: string;
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

export type ArrangementSection = VerseSection | RefrainSection | TextOnlyVersesSection;

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

export function updateArrangementContent(arrangementId: string, contentJson: ArrangementContentJson) {
  return apiRequest<SongArrangement>(`/api/arrangements/${arrangementId}/content`, {
    method: "PUT",
    body: JSON.stringify({ contentJson })
  });
}

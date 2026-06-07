import { apiRequest, apiUrl } from "@/lib/api-client";

export type ExportOutputFormat = "PPTX" | "PNG";
export type ExportRefrainMode = "NONE" | "ONCE_AFTER_ALL_VERSES" | "AFTER_EACH_VERSE";
export type ExportTheme = "LIGHT" | "DARK";
export type ExportTextSizePreset = "SMALL" | "MEDIUM" | "LARGE";

export type SongExportRequest = {
  arrangementId: string;
  selectedVerses: string[];
  refrainMode: ExportRefrainMode;
  outputFormat: ExportOutputFormat;
  layout: {
    theme: ExportTheme;
    showNotation: boolean;
    slideSize: "LAYOUT_WIDE";
    textSizePreset: ExportTextSizePreset;
    customLayout?: {
      beatsPerLine: number;
      linesPerPage: number;
    };
  };
};

export type SongExportResponse = {
  id: string;
  songId: string;
  arrangementId: string;
  outputFormat: ExportOutputFormat;
  status: "PENDING" | "COMPLETED" | "FAILED";
  selectedVerses: string[];
  refrainMode: ExportRefrainMode;
  storageKey: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createSongExport(songId: string, payload: SongExportRequest) {
  return apiRequest<SongExportResponse>(`/api/songs/${songId}/exports`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export type MultipleSongExportItem = {
  bookCode: string;
  songNumber: string;
  selectedVerses: string[];
  refrainMode: ExportRefrainMode;
  order: number;
};

export type MultipleSongExportRequest = {
  fileName: string;
  outputFormat: ExportOutputFormat;
  layout: {
    theme: ExportTheme;
    showNotation: boolean;
    slideSize: "LAYOUT_WIDE";
    textSizePreset: ExportTextSizePreset;
    customLayout?: {
      beatsPerLine: number;
      linesPerPage: number;
    };
  };
  items: MultipleSongExportItem[];
};

export function createMultipleSongExport(payload: MultipleSongExportRequest) {
  return apiRequest<SongExportResponse>("/api/song-exports/multiple", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function exportDownloadHref(downloadUrl: string) {
  return apiUrl(downloadUrl);
}

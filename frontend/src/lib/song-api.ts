import { apiRequest, PaginatedData } from "@/lib/api-client";

export type SongBook = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SongBookPayload = {
  code: string;
  name: string;
  description: string | null;
  displayOrder?: number;
  active?: boolean;
};

export type SongBookSummary = {
  id: string;
  code: string;
  name: string;
};

export type Song = {
  id: string;
  songNumber: string;
  title: string;
  defaultKey: string | null;
  timeSignature: string | null;
  tempo: number | null;
  authorText: string | null;
  sourceNote: string | null;
  songBook: SongBookSummary;
  createdAt: string;
  updatedAt: string;
};

export type SongPayload = {
  songBookId?: string | null;
  bookCode?: string | null;
  songNumber: string;
  title: string;
  defaultKey?: string | null;
  timeSignature?: string | null;
  tempo?: number | null;
  authorText?: string | null;
  sourceNote?: string | null;
};

export type SongSearchParams = {
  bookCode?: string;
  title?: string;
  songNumber?: string;
  page?: number;
  limit?: number;
};

export function listSongBooks() {
  return apiRequest<SongBook[]>("/api/song-books");
}

export function createSongBook(payload: SongBookPayload) {
  return apiRequest<SongBook>("/api/song-books", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateSongBook(id: string, payload: SongBookPayload) {
  return apiRequest<SongBook>(`/api/song-books/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteSongBook(id: string) {
  return apiRequest<{ deleted: boolean }>(`/api/song-books/${id}`, {
    method: "DELETE"
  });
}

export function listSongs(params: SongSearchParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.bookCode) {
    searchParams.set("bookCode", params.bookCode);
  }
  if (params.title) {
    searchParams.set("title", params.title);
  }
  if (params.songNumber) {
    searchParams.set("songNumber", params.songNumber);
  }
  if (params.page !== undefined) {
    searchParams.set("page", params.page.toString());
  }
  if (params.limit !== undefined) {
    searchParams.set("limit", params.limit.toString());
  }

  const query = searchParams.toString();
  return apiRequest<PaginatedData<Song>>(`/api/songs${query ? `?${query}` : ""}`);
}

export function getSong(id: string) {
  return apiRequest<Song>(`/api/songs/${id}`);
}

export function createSong(payload: SongPayload) {
  return apiRequest<Song>("/api/songs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateSong(id: string, payload: SongPayload) {
  return apiRequest<Song>(`/api/songs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteSong(id: string) {
  return apiRequest<{ deleted: boolean }>(`/api/songs/${id}`, {
    method: "DELETE"
  });
}

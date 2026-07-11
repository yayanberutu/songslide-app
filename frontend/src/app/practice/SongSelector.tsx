"use client";

import React, { useState, useMemo } from "react";
import type { Song } from "@/lib/song-api";

interface SongSelectorProps {
  songs: Song[];
  selectedSongId: string;
  onSelect: (songId: string) => void;
  isLoading: boolean;
}

export function SongSelector({ songs, selectedSongId, onSelect, isLoading }: SongSelectorProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return songs;
    const q = query.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        String(s.songNumber).includes(q) ||
        s.songBook.code.toLowerCase().includes(q)
    );
  }, [songs, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Song[]>();
    for (const song of filtered) {
      const code = song.songBook.code;
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(song);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.songNumber.localeCompare(b.songNumber, undefined, { numeric: true }));
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col gap-3">
      <label className="font-semibold text-slate-800 text-lg">Pilih Lagu</label>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Cari judul atau nomor lagu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
        />
      </div>
      <select
        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
        value={selectedSongId}
        onChange={(e) => onSelect(e.target.value)}
        disabled={isLoading}
      >
        <option value="">-- Pilih Lagu --</option>
        {Array.from(grouped.entries()).map(([code, songList]) => (
          <optgroup key={code} label={code}>
            {songList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.songNumber} - {s.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {isLoading && (
        <span className="text-sm text-slate-500 animate-pulse">Memuat lagu...</span>
      )}
    </div>
  );
}

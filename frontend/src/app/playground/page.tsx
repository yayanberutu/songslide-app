"use client";

import React, { useState, useEffect } from "react";
import { NotationPlayer } from "@/components/NotationPlayer";
import { PlaygroundNotationLine } from "./PlaygroundNotationLine";
import { parseNotationLine, NotationToken, type NotationParserIssue } from "@/lib/notation-parser";
import type { Song } from "@/lib/song-api";

export type ParsedLineData = {
  raw: string;
  tokens: NotationToken[];
  issues: NotationParserIssue[];
};

export default function PlaygroundPage() {
  const [notationText, setNotationText] = useState("1 2 3 5 | 5 - - - |");
  const [tempo, setTempo] = useState<number>(100);
  const [songKey, setSongKey] = useState<string>("C");
  const [viewMode, setViewMode] = useState<"TEXT" | "VISUAL">("TEXT");
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string>("");
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  
  const [parsedLines, setParsedLines] = useState<ParsedLineData[]>([]);

  useEffect(() => {
    let globalIndex = 0;
    const linesData = notationText.split("\n").map(line => {
      const result = parseNotationLine(line);
      
      const assignGlobalIndex = (tokens: NotationToken[]) => {
        for (const token of tokens) {
          if (token.type === "NOTE" || token.type === "REST" || token.type === "EXTENSION") {
            token.globalNoteIndex = globalIndex++;
          } else if (token.type === "SLUR" || token.type === "BEAM") {
            assignGlobalIndex(token.children);
          }
        }
      };
      
      assignGlobalIndex(result.tokens);
      return {
        raw: line,
        tokens: result.tokens,
        issues: result.issues
      };
    });
    
    setParsedLines(linesData);
  }, [notationText]);

  useEffect(() => {
    import("@/lib/song-api").then((api) => {
      api.listSongs({ limit: 1000 }).then(res => {
        if (res.items) setSongs(res.items);
      }).catch(err => console.error("Failed to list songs", err));
    });
  }, []);

  const handleLoadSong = async (songId: string) => {
    setSelectedSongId(songId);
    if (!songId) return;
    
    setIsLoadingSong(true);
    try {
      const { getDefaultArrangement } = await import("@/lib/arrangement-api");
      const { getSong } = await import("@/lib/song-api");
      const [song, arrangement] = await Promise.all([
        getSong(songId),
        getDefaultArrangement(songId)
      ]);
      
      if (song.tempo) setTempo(song.tempo);
      if (song.defaultKey) setSongKey(song.defaultKey);
      
      const content = arrangement.contentJson;
      const notations: string[] = [];
      for (const section of content.sections) {
        if (section.type === "VERSE" || section.type === "REFRAIN") {
          for (const line of section.lines) {
            if (line.notation) {
              notations.push(line.notation);
            }
          }
        }
      }
      
      setNotationText(notations.join("\n") || "0");
      setViewMode("VISUAL");
    } catch (err) {
      console.error("Failed to load song", err);
      alert("Gagal memuat lagu dari database.");
    } finally {
      setIsLoadingSong(false);
    }
  };

  const commonKeys = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Jianpu Playground
        </h1>
        <p className="text-slate-600 mt-2">
          Eksperimen fitur pemutar audio notasi. Ketik teks notasi kepatihan (Jianpu) dan dengarkan hasilnya secara langsung.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label htmlFor="songSelect" className="font-semibold text-slate-800">
              Muat dari Database
            </label>
            <div className="flex gap-2">
              <select
                id="songSelect"
                className="flex-1 p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                value={selectedSongId}
                onChange={(e) => handleLoadSong(e.target.value)}
                disabled={isLoadingSong}
              >
                <option value="">-- Pilih Lagu --</option>
                {songs.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.songBook.code} {s.songNumber} - {s.title}
                  </option>
                ))}
              </select>
              {isLoadingSong && <span className="text-sm text-slate-500 self-center animate-pulse">Memuat...</span>}
            </div>
            <p className="text-xs text-slate-500">
              Memilih lagu akan menimpa notasi, tempo, dan nada dasar di bawah ini sesuai data lagu.
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center">
              <label htmlFor="notation" className="font-semibold text-slate-800">
                Notasi Angka (Jianpu)
              </label>
              <div className="flex bg-slate-200 rounded-lg p-1">
                <button
                  type="button"
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === "TEXT" ? "bg-white text-slate-900 shadow-sm font-medium" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setViewMode("TEXT")}
                >
                  Teks (Edit)
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === "VISUAL" ? "bg-white text-slate-900 shadow-sm font-medium" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setViewMode("VISUAL")}
                >
                  Visual (Preview)
                </button>
              </div>
            </div>
            
            {viewMode === "TEXT" ? (
              <textarea
                id="notation"
                className="w-full h-96 p-4 font-mono text-lg rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-y shadow-inner text-slate-900"
                value={notationText}
                onChange={(e) => setNotationText(e.target.value)}
                placeholder="Contoh: 1 2 3 4 | 5 - - - | [4 5] 6 7 | 1' - - - |"
              />
            ) : (
              <div className="w-full h-96 p-6 rounded-xl border border-slate-300 bg-white overflow-y-auto shadow-inner flex flex-col gap-8">
                {parsedLines.map((lineData, idx) => (
                  <PlaygroundNotationLine key={idx} parsedLine={lineData} activeNoteIndex={activeNoteIndex} theme="LIGHT" />
                ))}
              </div>
            )}
          </div>

          <NotationPlayer
            parsedLines={parsedLines}
            tempo={tempo}
            songKey={songKey}
            onActiveNoteChange={setActiveNoteIndex}
            className="mt-4"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold mb-4 border-b pb-2 text-slate-900">Pengaturan Audio</h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-slate-700">
                  Nada Dasar (Key)
                </label>
                <select
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                  value={songKey}
                  onChange={(e) => setSongKey(e.target.value)}
                >
                  {commonKeys.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-slate-700 flex justify-between">
                  <span>Tempo (BPM)</span>
                  <span className="text-emerald-600 font-bold">{tempo}</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="240"
                  step="1"
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">Panduan Penulisan</h3>
            <ul className="text-sm text-blue-800 space-y-2 list-disc pl-4">
              <li><b>1-7</b>: Nada dasar (Do-Si)</li>
              <li><b>0</b>: Istirahat (Rest)</li>
              <li><b>&apos;</b> (atas): Oktaf tinggi (1&apos;)</li>
              <li><b>,</b> (bawah): Oktaf rendah (1,)</li>
              <li><b>-</b> : Tahan 1 ketukan (5 -)</li>
              <li><b>/</b> : Setengah ketukan (1/)</li>
              <li><b>.</b> : Titik ekstensi (+50% durasi)</li>
              <li><b># / b</b> : Kres / Mol (#4)</li>
              <li><b>[ ... ]</b> : Garis bendera / Beam</li>
              <li><b>( ... )</b> : Slur / Legato</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

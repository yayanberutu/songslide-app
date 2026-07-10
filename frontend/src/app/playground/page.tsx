"use client";

import React, { useState, useEffect, useCallback } from "react";
import { parseNotationLine, type NotationToken, type NotationParserIssue } from "@/lib/notation-parser";
import { alignPlaygroundNotationAndLyric, type PlaygroundAlignmentResult } from "./lib/playground-alignment";
import type { Song } from "@/lib/song-api";
import type { ArrangementContentJson } from "@/lib/arrangement-api";

import { VoiceDefinition, DEFAULT_VOICES, VOICE_ORDER, createVoice, getVoiceColorClass } from "./lib/playground-voice";
import { VoiceTabBar } from "./VoiceTabBar";
import { VoiceEditorPanel } from "./VoiceEditorPanel";
import { AllVoicesPreview } from "./AllVoicesPreview";
import { PlaygroundPlayer } from "./PlaygroundPlayer";
import { PlaygroundNotationLine } from "./PlaygroundNotationLine";

export type ParsedLineData = {
  raw: string;
  tokens: NotationToken[];
  issues: NotationParserIssue[];
  lyric?: string;
  alignmentResult: PlaygroundAlignmentResult;
};

export default function PlaygroundPage() {
  // Modes & Config
  const [isPartiturMode, setIsPartiturMode] = useState(false);
  const [viewMode, setViewMode] = useState<"TEXT" | "VISUAL">("TEXT");
  const [tempo, setTempo] = useState<number>(100);
  const [songKey, setSongKey] = useState<string>("C");
  const [measuresPerLine, setMeasuresPerLine] = useState<number>(4);

  // Multi-voice state
  const [voices, setVoices] = useState<VoiceDefinition[]>([DEFAULT_VOICES[0]]);
  const [notationByVoice, setNotationByVoice] = useState<Record<string, string>>({
    [DEFAULT_VOICES[0].id]: "1 2 3 5 | 5 - - - |",
  });
  const [lyricByVoice, setLyricByVoice] = useState<Record<string, string>>({
    [DEFAULT_VOICES[0].id]: "",
  });
  const [enabledVoices, setEnabledVoices] = useState<Set<string>>(new Set([DEFAULT_VOICES[0].id]));
  const [activeTab, setActiveTab] = useState<string>("all");

  // Playback state
  const [activeNoteIndices, setActiveNoteIndices] = useState<Record<string, number | null>>({});

  // DB loading state
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string>("");
  const [isLoadingSong, setIsLoadingSong] = useState(false);

  // Parsed lines cache
  const [parsedLinesPerVoice, setParsedLinesPerVoice] = useState<Record<string, ParsedLineData[]>>({});
  // When data is loaded from DB, lyrics are already in correct 1:1 order with
  // notation slots, so we use sequential alignment instead of spatial.
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  // --- Helpers to switch modes gracefully ---
  const handleTogglePartiturMode = () => {
    if (isPartiturMode) {
      // Switching back to single voice
      if (confirm("Ganti ke Single Voice akan menghapus data suara selain suara pertama. Lanjutkan?")) {
        const firstVoice = voices[0];
        setVoices([firstVoice]);
        setEnabledVoices(new Set([firstVoice.id]));
        setActiveTab("all");
        setIsPartiturMode(false);
      }
    } else {
      // Switching to partitur, add a second default voice
      const newVoice = DEFAULT_VOICES[1];
      setVoices([...voices, newVoice]);
      setEnabledVoices(new Set([...Array.from(enabledVoices), newVoice.id]));
      setIsPartiturMode(true);
    }
  };

  // --- Multi-voice Editor Handlers ---
  const handleVoiceChange = (voiceId: string, updates: Partial<VoiceDefinition>) => {
    setVoices(prev => prev.map(v => v.id === voiceId ? { ...v, ...updates } : v));
  };

  const handleVoiceDelete = (voiceId: string) => {
    setVoices(prev => prev.filter(v => v.id !== voiceId));
    setNotationByVoice(prev => {
      const next = { ...prev };
      delete next[voiceId];
      return next;
    });
    setLyricByVoice(prev => {
      const next = { ...prev };
      delete next[voiceId];
      return next;
    });
    setEnabledVoices(prev => {
      const next = new Set(prev);
      next.delete(voiceId);
      return next;
    });
    if (activeTab === voiceId) setActiveTab("all");
  };

  const handleAddVoice = (newVoiceInfo: Omit<VoiceDefinition, "id">) => {
    const newId = newVoiceInfo.label.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
    const newVoice = { ...newVoiceInfo, id: newId };
    
    // Auto color & waveform if using default fallback
    const newVoiceDef = createVoice(newVoice.id, newVoice.label, voices.length);
    newVoiceDef.color = newVoiceInfo.color;
    
    setVoices(prev => [...prev, newVoiceDef]);
    setEnabledVoices(prev => new Set([...Array.from(prev), newId]));
  };

  const handleNotationChange = (voiceId: string, value: string) => {
    setLoadedFromDb(false);
    setNotationByVoice(prev => ({ ...prev, [voiceId]: value }));
  };

  const handleLyricChange = (voiceId: string, value: string) => {
    setLoadedFromDb(false);
    setLyricByVoice(prev => ({ ...prev, [voiceId]: value }));
  };

  const handleToggleVoiceEnabled = (voiceId: string) => {
    setEnabledVoices(prev => {
      const next = new Set(prev);
      if (next.has(voiceId)) next.delete(voiceId);
      else next.add(voiceId);
      return next;
    });
  };

  const handleActiveNoteChange = useCallback((voiceId: string, noteIndex: number | null) => {
    setActiveNoteIndices(prev => {
      if (prev[voiceId] === noteIndex) return prev;
      return { ...prev, [voiceId]: noteIndex };
    });
  }, []);

  // --- Parsing Effect ---
  useEffect(() => {
    const newParsed: Record<string, ParsedLineData[]> = {};
    
    for (const voice of voices) {
      let globalIndex = 0;
      const notText = notationByVoice[voice.id] || "";
      const lyrText = lyricByVoice[voice.id] || "";
      
      const notationLines = notText.split("\n");
      const lyricLines = lyrText.split("\n");
      
      newParsed[voice.id] = notationLines.map((line, i) => {
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
        
        const lyricLine = lyricLines[i] ?? "";
        const alignmentMode = loadedFromDb ? "sequential" : "spatial";
        const alignmentResult = alignPlaygroundNotationAndLyric(result, lyricLine, alignmentMode);
        
        return {
          raw: line,
          tokens: result.tokens,
          issues: result.issues,
          lyric: lyricLine,
          alignmentResult,
        };
      });
    }
    
    setParsedLinesPerVoice(newParsed);
  }, [voices, notationByVoice, lyricByVoice, loadedFromDb]);

  // --- Load from DB ---
  useEffect(() => {
    import("@/lib/song-api").then((api) => {
      api
        .listSongs({ limit: 1000 })
        .then((res) => {
          if (res.items) setSongs(res.items);
        })
        .catch((err) => console.error("Failed to list songs", err));
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
        getDefaultArrangement(songId),
      ]);

      if (song.tempo) setTempo(song.tempo);
      if (song.defaultKey) setSongKey(song.defaultKey);

      const content = arrangement.contentJson as ArrangementContentJson;
      
      let isPartitur = false;
      const newNotations: Record<string, string[]> = {};
      const newLyrics: Record<string, string[]> = {};
      
      // Default to voice 0 if single voice
      const defaultVoiceId = voices[0]?.id || DEFAULT_VOICES[0].id;

      for (const section of content.sections) {
        if (section.type === "VERSE" || section.type === "REFRAIN") {
          for (const line of section.lines) {
            // Check for partitur fields
            if (line.notationsByVoice && Object.keys(line.notationsByVoice).length > 0) {
              isPartitur = true;
              for (const [vId, notation] of Object.entries(line.notationsByVoice)) {
                if (!newNotations[vId]) newNotations[vId] = [];
                newNotations[vId].push(notation);
                
                if (!newLyrics[vId]) newLyrics[vId] = [];
                
                // Try to find lyric for this voice
                if (section.type === "VERSE") {
                  if ("lyricsByVoiceAndVerse" in line && line.lyricsByVoiceAndVerse?.[vId]) {
                    newLyrics[vId].push(Object.values(line.lyricsByVoiceAndVerse[vId])[0] ?? "");
                  } else {
                    newLyrics[vId].push("");
                  }
                } else if (section.type === "REFRAIN") {
                  if ("lyricsByVoice" in line && line.lyricsByVoice?.[vId]) {
                    newLyrics[vId].push(line.lyricsByVoice[vId] ?? "");
                  } else {
                    newLyrics[vId].push("");
                  }
                }
              }
            } else if (line.notation) {
              // Single voice fallback
              if (!newNotations[defaultVoiceId]) newNotations[defaultVoiceId] = [];
              newNotations[defaultVoiceId].push(line.notation);
              
              if (!newLyrics[defaultVoiceId]) newLyrics[defaultVoiceId] = [];
              if ("lyric" in line) {
                newLyrics[defaultVoiceId].push(line.lyric ?? "");
              } else if ("lyricsByVerse" in line && line.lyricsByVerse) {
                newLyrics[defaultVoiceId].push(Object.values(line.lyricsByVerse)[0] ?? "");
              } else {
                newLyrics[defaultVoiceId].push("");
              }
            }
          }
        } else if (section.type === "PARTITUR") {
          isPartitur = true;
          for (const line of section.lines) {
            if (line.voices && Object.keys(line.voices).length > 0) {
              for (const [vId, voiceData] of Object.entries(line.voices)) {
                if (!newNotations[vId]) newNotations[vId] = [];
                newNotations[vId].push(voiceData.notation || "");
                
                if (!newLyrics[vId]) newLyrics[vId] = [];
                newLyrics[vId].push(voiceData.lyric || "");
              }
            }
          }
        }
      }

      if (isPartitur) {
        setIsPartiturMode(true);
        const voiceIds = Object.keys(newNotations);
        voiceIds.sort((a, b) => {
          const ia = VOICE_ORDER.indexOf(a);
          const ib = VOICE_ORDER.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        const newVoices = voiceIds.map((vId, idx) => {
          const matchDefault = DEFAULT_VOICES.find(d => d.id === vId);
          if (matchDefault) return matchDefault;
          // Capitalize first letter for label
          const label = vId.charAt(0).toUpperCase() + vId.slice(1);
          return createVoice(vId, label, idx);
        });
        setVoices(newVoices);
        setEnabledVoices(new Set(voiceIds));
        
        const flatNotations: Record<string, string> = {};
        const flatLyrics: Record<string, string> = {};
        for (const vId of voiceIds) {
          flatNotations[vId] = newNotations[vId].join("\n");
          flatLyrics[vId] = newLyrics[vId].join("\n");
        }
        setNotationByVoice(flatNotations);
        setLyricByVoice(flatLyrics);
      } else {
        setIsPartiturMode(false);
        const firstVoice = voices[0] || DEFAULT_VOICES[0];
        setVoices([firstVoice]);
        setEnabledVoices(new Set([firstVoice.id]));
        setNotationByVoice({ [firstVoice.id]: (newNotations[defaultVoiceId] || []).join("\n") });
        setLyricByVoice({ [firstVoice.id]: (newLyrics[defaultVoiceId] || []).join("\n") });
      }

      setLoadedFromDb(true);
      setViewMode("VISUAL");
      setActiveTab("all");
    } catch (err) {
      console.error("Failed to load song", err);
      alert("Gagal memuat lagu dari database.");
    } finally {
      setIsLoadingSong(false);
    }
  };

  const commonKeys = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"];

  // In Visual (Preview) mode the score becomes the star: hide the sidebar and
  // give the preview the full page width. Audio/layout controls move into a
  // slim toolbar above the preview instead.
  const showSidebar = viewMode !== "VISUAL";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 border-b pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Jianpu Playground
          </h1>
          <p className="text-slate-600 mt-2">
            Eksperimen fitur pemutar audio notasi. Dukungan partitur multi-suara.
          </p>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Partitur Mode</span>
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPartiturMode ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <input type="checkbox" className="sr-only" checked={isPartiturMode} onChange={handleTogglePartiturMode} />
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isPartiturMode ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-8 ${showSidebar ? "md:grid-cols-3" : ""}`}>
        <div className={`flex flex-col gap-4 ${showSidebar ? "md:col-span-2" : ""}`}>
          {/* Load from DB */}
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
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.songBook.code} {s.songNumber} - {s.title}
                  </option>
                ))}
              </select>
              {isLoadingSong && (
                <span className="text-sm text-slate-500 self-center animate-pulse">
                  Memuat...
                </span>
              )}
            </div>
          </div>

          {/* Notation Area */}
          <div className="flex flex-col gap-2 mt-2">
            {isPartiturMode && (
              <VoiceTabBar
                voices={voices}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onAddVoice={handleAddVoice}
              />
            )}

            {/* Slim control toolbar shown in Visual (Preview) mode, since the
                sidebar is hidden to give the score full width. */}
            {viewMode === "VISUAL" && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <PlaygroundPlayer
                  voices={voices}
                  parsedLinesPerVoice={parsedLinesPerVoice}
                  tempo={tempo}
                  songKey={songKey}
                  enabledVoices={enabledVoices}
                  activeTab={activeTab}
                  onActiveNoteChange={handleActiveNoteChange}
                  compact
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600">Nada Dasar</label>
                  <select
                    className="p-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 text-sm"
                    value={songKey}
                    onChange={(e) => setSongKey(e.target.value)}
                  >
                    {commonKeys.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600">Tempo</label>
                  <input
                    type="range"
                    min="40"
                    max="240"
                    step="1"
                    value={tempo}
                    onChange={(e) => setTempo(parseInt(e.target.value, 10))}
                    className="w-32 accent-emerald-500"
                  />
                  <span className="text-emerald-600 font-bold text-sm w-8">{tempo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600">Birama / Baris</label>
                  <select
                    className="p-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 text-sm"
                    value={measuresPerLine}
                    onChange={(e) => setMeasuresPerLine(parseInt(e.target.value, 10))}
                  >
                    <option value={0}>Auto (Jangan dipotong)</option>
                    <option value={2}>2 Birama</option>
                    <option value={4}>4 Birama</option>
                    <option value={6}>6 Birama</option>
                    <option value={8}>8 Birama</option>
                  </select>
                </div>
              </div>
            )}

            {!isPartiturMode || activeTab === "all" ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-semibold text-slate-800">
                    Editor {isPartiturMode ? "Partitur" : "Notasi"}
                  </h2>
                  <div className="flex bg-slate-200 rounded-lg p-1">
                    <button
                      type="button"
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        viewMode === "TEXT"
                          ? "bg-white text-slate-900 shadow-sm font-medium"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      onClick={() => setViewMode("TEXT")}
                    >
                      Teks (Edit)
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        viewMode === "VISUAL"
                          ? "bg-white text-slate-900 shadow-sm font-medium"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      onClick={() => setViewMode("VISUAL")}
                    >
                      Visual (Preview)
                    </button>
                  </div>
                </div>
                
                {viewMode === "TEXT" ? (
                  <VoiceEditorPanel
                    voices={voices}
                    notationByVoice={notationByVoice}
                    lyricByVoice={lyricByVoice}
                    enabledVoices={enabledVoices}
                    onVoiceChange={handleVoiceChange}
                    onVoiceDelete={handleVoiceDelete}
                    onNotationChange={handleNotationChange}
                    onLyricChange={handleLyricChange}
                    onToggleVoiceEnabled={handleToggleVoiceEnabled}
                  />
                ) : (
                  <AllVoicesPreview
                    voices={voices}
                    enabledVoices={enabledVoices}
                    parsedLinesPerVoice={parsedLinesPerVoice}
                    activeNoteIndices={activeNoteIndices}
                    measuresPerLine={measuresPerLine}
                  />
                )}
              </>
            ) : (
              // Individual Voice Preview Tab
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-semibold text-slate-800">
                    Preview Suara: {voices.find(v => v.id === activeTab)?.label}
                  </h2>
                </div>
                <AllVoicesPreview
                  voices={voices.filter(v => v.id === activeTab)}
                  enabledVoices={new Set([activeTab])}
                  parsedLinesPerVoice={parsedLinesPerVoice}
                  activeNoteIndices={activeNoteIndices}
                  measuresPerLine={measuresPerLine}
                />
              </div>
            )}
          </div>

          {viewMode !== "VISUAL" && (
            <PlaygroundPlayer
              voices={voices}
              parsedLinesPerVoice={parsedLinesPerVoice}
              tempo={tempo}
              songKey={songKey}
              enabledVoices={enabledVoices}
              activeTab={activeTab}
              onActiveNoteChange={handleActiveNoteChange}
              className="mt-4"
            />
          )}
        </div>

        {/* Sidebar — only in Text (Edit) mode; in Visual mode controls move to
            the slim toolbar and the preview takes the full width. */}
        {showSidebar && (
        <div className="flex flex-col gap-6">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold mb-4 border-b pb-2 text-slate-900">Pengaturan Audio</h2>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-slate-700">Nada Dasar (Key)</label>
                <select
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                  value={songKey}
                  onChange={(e) => setSongKey(e.target.value)}
                >
                  {commonKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
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
            <div className="mt-4 pt-3 border-t border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">Panduan Lirik</p>
              <p className="text-xs text-blue-700">
                Gunakan spasi untuk mengatur posisi suku kata. Suku kata akan otomatis
                dipasangkan ke not terdekat berdasarkan posisi karakter.
              </p>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

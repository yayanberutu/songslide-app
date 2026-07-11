"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { parseNotationLine, type NotationToken } from "@/lib/notation-parser";
import { alignPlaygroundNotationAndLyric } from "@/app/playground/lib/playground-alignment";
import type { Song } from "@/lib/song-api";
import type {
  ArrangementContentJson,
  VerseLine,
  RefrainLine,
  PartiturLine,
} from "@/lib/arrangement-api";
import {
  VoiceDefinition,
  DEFAULT_VOICES,
  VOICE_ORDER,
  createVoice,
} from "@/app/playground/lib/playground-voice";
import { AllVoicesPreview } from "@/app/playground/AllVoicesPreview";
import { MultiVoicePlayer } from "@/app/playground/lib/playground-multi-player";
import type { ParsedLineData } from "@/app/playground/page";

import { SongSelector } from "./SongSelector";
import { ViewModeSelector } from "./VoiceSelector";
import { PracticePlayer } from "./PracticePlayer";
import { VoiceMixer } from "./VoiceMixer";

export default function PracticePage() {
  // Song data
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [songTitle, setSongTitle] = useState("");

  // Voice & notation
  const [voices, setVoices] = useState<VoiceDefinition[]>([]);
  const [enabledVoices, setEnabledVoices] = useState<Set<string>>(new Set());
  const [notationByVoice, setNotationByVoice] = useState<Record<string, string>>({});
  const [lyricByVoice, setLyricByVoice] = useState<Record<string, string>>({});
  const [parsedLinesPerVoice, setParsedLinesPerVoice] = useState<Record<string, ParsedLineData[]>>({});

  // Multi-verse
  const [availableVerses, setAvailableVerses] = useState<string[]>(["1"]);
  const [selectedVerse, setSelectedVerse] = useState("1");
  const [lyricsByVoiceAndVerse, setLyricsByVoiceAndVerse] = useState<Record<string, Record<string, string[]>>>({});

  // View mode & playback
  const [viewMode, setViewMode] = useState("all");
  const [tempo, setTempo] = useState(100);
  const [songKey, setSongKey] = useState("C");
  const [activeNoteIndices, setActiveNoteIndices] = useState<Record<string, number | null>>({});
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [measuresPerLine, setMeasuresPerLine] = useState(4);

  useEffect(() => {
    const update = () => setMeasuresPerLine(window.innerWidth < 640 ? 2 : 4);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Volume mixer state
  const [voiceVolumes, setVoiceVolumes] = useState<Record<string, number>>({});
  const [mutedVoices, setMutedVoices] = useState<Set<string>>(new Set());
  const [soloVoice, setSoloVoice] = useState<string | null>(null);

  const playerRef = useRef<MultiVoicePlayer | null>(null);

  // --- Load songs ---
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

  // --- Parse notation ---
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
        const alignmentResult = alignPlaygroundNotationAndLyric(result, lyricLine, "sequential");

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
  }, [voices, notationByVoice, lyricByVoice]);

  // --- Verse sync ---
  useEffect(() => {
    if (Object.keys(lyricsByVoiceAndVerse).length === 0) return;
    const flatLyrics: Record<string, string> = {};
    Object.keys(lyricsByVoiceAndVerse).forEach((voiceId) => {
      const verseMap = lyricsByVoiceAndVerse[voiceId] || {};
      const lyricsArray = verseMap[selectedVerse] || verseMap["1"] || [];
      flatLyrics[voiceId] = lyricsArray.join("\n");
    });
    setLyricByVoice(flatLyrics);
  }, [selectedVerse, lyricsByVoiceAndVerse]);

  const handleActiveNoteChange = useCallback((voiceId: string, noteIndex: number | null) => {
    setActiveNoteIndices((prev) => {
      if (prev[voiceId] === noteIndex) return prev;
      return { ...prev, [voiceId]: noteIndex };
    });
  }, []);

  // --- Load song from DB ---
  const handleLoadSong = async (songId: string) => {
    setSelectedSongId(songId);
    if (!songId) {
      setSongTitle("");
      setVoices([]);
      return;
    }

    setIsLoadingSong(true);
    try {
      const { getDefaultArrangement } = await import("@/lib/arrangement-api");
      const { getSong } = await import("@/lib/song-api");
      const [song, arrangement] = await Promise.all([
        getSong(songId),
        getDefaultArrangement(songId),
      ]);

      setSongTitle(`${song.songBook?.code || ""} ${song.songNumber} - ${song.title}`);
      if (song.tempo) setTempo(song.tempo);
      if (song.defaultKey) setSongKey(song.defaultKey);

      const content = arrangement.contentJson as ArrangementContentJson;

      const newNotations: Record<string, string[]> = {};
      const defaultVoiceId = DEFAULT_VOICES[0].id;

      const uniqueVerses = new Set<string>();
      for (const section of content.sections) {
        if (section.type === "VERSE") {
          for (const line of section.lines) {
            const vLine = line as VerseLine;
            if (vLine.lyricsByVerse) {
              Object.keys(vLine.lyricsByVerse).forEach((vNum) => uniqueVerses.add(vNum));
            }
            if (vLine.lyricsByVoiceAndVerse) {
              Object.values(vLine.lyricsByVoiceAndVerse).forEach((voiceVerseMap) => {
                Object.keys(voiceVerseMap).forEach((vNum) => uniqueVerses.add(vNum));
              });
            }
          }
        } else if (section.type === "PARTITUR") {
          for (const line of section.lines) {
            const pLine = line as PartiturLine;
            if (pLine.voices) {
              Object.values(pLine.voices).forEach((voiceData) => {
                if (voiceData.lyricsByVerse) {
                  Object.keys(voiceData.lyricsByVerse).forEach((vNum) => uniqueVerses.add(vNum));
                }
                if (voiceData.lyric) uniqueVerses.add("1");
              });
            }
          }
        }
      }

      const sortedVerses = [...uniqueVerses].sort((a, b) => Number(a) - Number(b));
      if (sortedVerses.length === 0) sortedVerses.push("1");

      const voiceLyricsMap: Record<string, Record<string, string[]>> = {};
      const initVoiceLyrics = (voiceId: string) => {
        if (!voiceLyricsMap[voiceId]) {
          voiceLyricsMap[voiceId] = {};
          sortedVerses.forEach((vNum) => {
            voiceLyricsMap[voiceId][vNum] = [];
          });
        }
      };

      for (const section of content.sections) {
        if (section.type === "VERSE") {
          for (const line of section.lines) {
            const vLine = line as VerseLine;
            if (vLine.notationsByVoice && Object.keys(vLine.notationsByVoice).length > 0) {
              for (const [vId, notation] of Object.entries(vLine.notationsByVoice)) {
                if (!newNotations[vId]) newNotations[vId] = [];
                newNotations[vId].push(notation);
                initVoiceLyrics(vId);
                sortedVerses.forEach((vNum) => {
                  const lyricVal = vLine.lyricsByVoiceAndVerse?.[vId]?.[vNum] || vLine.lyricsByVerse?.[vNum] || "";
                  voiceLyricsMap[vId][vNum].push(lyricVal);
                });
              }
            } else if (vLine.notation) {
              if (!newNotations[defaultVoiceId]) newNotations[defaultVoiceId] = [];
              newNotations[defaultVoiceId].push(vLine.notation);
              initVoiceLyrics(defaultVoiceId);
              sortedVerses.forEach((vNum) => {
                voiceLyricsMap[defaultVoiceId][vNum].push(vLine.lyricsByVerse?.[vNum] || "");
              });
            }
          }
        } else if (section.type === "REFRAIN") {
          for (const line of section.lines) {
            const rLine = line as RefrainLine;
            if (rLine.notationsByVoice && Object.keys(rLine.notationsByVoice).length > 0) {
              for (const [vId, notation] of Object.entries(rLine.notationsByVoice)) {
                if (!newNotations[vId]) newNotations[vId] = [];
                newNotations[vId].push(notation);
                initVoiceLyrics(vId);
                sortedVerses.forEach((vNum) => {
                  voiceLyricsMap[vId][vNum].push(rLine.lyricsByVoice?.[vId] || rLine.lyric || "");
                });
              }
            } else if (rLine.notation) {
              if (!newNotations[defaultVoiceId]) newNotations[defaultVoiceId] = [];
              newNotations[defaultVoiceId].push(rLine.notation);
              initVoiceLyrics(defaultVoiceId);
              sortedVerses.forEach((vNum) => {
                voiceLyricsMap[defaultVoiceId][vNum].push(rLine.lyric || "");
              });
            }
          }
        } else if (section.type === "PARTITUR") {
          for (const line of section.lines) {
            const pLine = line as PartiturLine;
            if (pLine.voices && Object.keys(pLine.voices).length > 0) {
              for (const [vId, voiceData] of Object.entries(pLine.voices)) {
                if (!newNotations[vId]) newNotations[vId] = [];
                newNotations[vId].push(voiceData.notation || "");
                initVoiceLyrics(vId);
                sortedVerses.forEach((vNum) => {
                  const lyricsByVerse = voiceData.lyricsByVerse ?? {};
                  voiceLyricsMap[vId][vNum].push(lyricsByVerse[vNum] || (vNum === "1" ? voiceData.lyric : "") || "");
                });
              }
            }
          }
        }
      }

      setAvailableVerses(sortedVerses);
      setSelectedVerse(sortedVerses[0] || "1");
      setLyricsByVoiceAndVerse(voiceLyricsMap);

      const voiceIds = Object.keys(newNotations);
      voiceIds.sort((a, b) => {
        const ia = VOICE_ORDER.indexOf(a);
        const ib = VOICE_ORDER.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });

      const newVoices = voiceIds.map((vId, idx) => {
        const matchDefault = DEFAULT_VOICES.find((d) => d.id === vId);
        if (matchDefault) return matchDefault;
        const label = vId.charAt(0).toUpperCase() + vId.slice(1);
        return createVoice(vId, label, idx);
      });

      setVoices(newVoices);
      setEnabledVoices(new Set(voiceIds));

      const flatNotations: Record<string, string> = {};
      for (const vId of voiceIds) {
        flatNotations[vId] = newNotations[vId].join("\n");
      }
      setNotationByVoice(flatNotations);

      // Reset volumes
      const newVolumes: Record<string, number> = {};
      voiceIds.forEach((vId) => (newVolumes[vId] = 1.0));
      setVoiceVolumes(newVolumes);
      setMutedVoices(new Set());
      setSoloVoice(null);
    } catch (err) {
      console.error("Failed to load song", err);
      alert("Gagal memuat lagu.");
    } finally {
      setIsLoadingSong(false);
    }
  };

  // --- Volume mixer handlers ---
  const handleVolumeChange = (voiceId: string, volume: number) => {
    setVoiceVolumes((prev) => ({ ...prev, [voiceId]: volume }));
    playerRef.current?.setVoiceVolume(voiceId, volume);
  };

  const handleMuteToggle = (voiceId: string) => {
    setMutedVoices((prev) => {
      const next = new Set(prev);
      const newMuted = !next.has(voiceId);
      if (newMuted) next.add(voiceId);
      else next.delete(voiceId);
      playerRef.current?.muteVoice(voiceId, newMuted);
      return next;
    });
    setSoloVoice(null);
  };

  const handleSoloToggle = (voiceId: string) => {
    if (soloVoice === voiceId) {
      setSoloVoice(null);
      playerRef.current?.unsoloAll();
      setMutedVoices(new Set());
    } else {
      setSoloVoice(voiceId);
      playerRef.current?.soloVoice(voiceId);
      const newMuted = new Set<string>();
      voices.forEach((v) => {
        if (v.id !== voiceId) newMuted.add(v.id);
      });
      setMutedVoices(newMuted);
    }
  };

  const handleResetVolumes = () => {
    const newVolumes: Record<string, number> = {};
    voices.forEach((v) => {
      newVolumes[v.id] = 1.0;
      playerRef.current?.setVoiceVolume(v.id, 1.0);
      playerRef.current?.muteVoice(v.id, false);
    });
    setVoiceVolumes(newVolumes);
    setMutedVoices(new Set());
    setSoloVoice(null);
  };

  // --- Line click → seek ---
  const handleLineClick = (lineIndex: number) => {
    if (!playerRef.current) return;
    setActiveLineIndex(lineIndex);

    // Find the globalNoteIndex of the first note in this line for any voice
    const firstVoiceId = voices[0]?.id;
    if (!firstVoiceId) return;
    const lines = parsedLinesPerVoice[firstVoiceId];
    if (!lines) return;

    let noteIndex = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      const countNotes = (tokens: NotationToken[]) => {
        let count = 0;
        for (const t of tokens) {
          if (t.type === "NOTE" || t.type === "REST" || t.type === "EXTENSION") count++;
          else if (t.type === "SLUR" || t.type === "BEAM") count += countNotes(t.children);
        }
        return count;
      };
      noteIndex += countNotes(lines[i].tokens);
    }

    playerRef.current.ensureEventsReady(voices, parsedLinesPerVoice, tempo, songKey, enabledVoices);
    const time = playerRef.current.getTimeForNoteIndex(noteIndex);
    if (time !== null) {
      playerRef.current.seekTo(time);
    }
  };

  const displayVoices = useMemo(
    () => viewMode === "all" ? new Set(voices.map(v => v.id)) : new Set([viewMode]),
    [viewMode, voices]
  );

  const hasSong = voices.length > 0;

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Latihan Lagu
        </h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm">
          Pilih lagu, dengarkan, dan latih suaramu
        </p>
      </div>

      {/* Song selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
        <SongSelector
          songs={songs}
          selectedSongId={selectedSongId}
          onSelect={handleLoadSong}
          isLoading={isLoadingSong}
        />
      </div>

      {hasSong && (
        <>
          {/* Song title */}
          {songTitle && (
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">{songTitle}</h2>
            </div>
          )}

          {/* View mode + Verse selector */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex-1">
              <ViewModeSelector
                voices={voices}
                selectedMode={viewMode}
                onModeChange={setViewMode}
              />
            </div>
            {availableVerses.length > 1 && (
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-slate-800">Pilih Ayat</label>
                <div className="flex flex-wrap gap-2">
                  {availableVerses.map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedVerse(v)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        selectedVerse === v
                          ? "bg-emerald-500 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      Ayat {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Player */}
          <div className="mb-3 sm:mb-4">
            <PracticePlayer
              voices={voices}
              parsedLinesPerVoice={parsedLinesPerVoice}
              tempo={tempo}
              songKey={songKey}
              enabledVoices={enabledVoices}
              onActiveNoteChange={handleActiveNoteChange}
              onTempoChange={setTempo}
              onSongKeyChange={setSongKey}
              playerRef={playerRef}
            />
          </div>

          {/* Voice mixer */}
          {voices.length > 1 && (
            <div className="mb-3 sm:mb-4">
              <VoiceMixer
                voices={voices}
                volumes={voiceVolumes}
                mutedVoices={mutedVoices}
                soloVoice={soloVoice}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                onSoloToggle={handleSoloToggle}
                onResetAll={handleResetVolumes}
              />
            </div>
          )}

          {/* Score preview */}
          <div className="mb-4 sm:mb-6">
            <AllVoicesPreview
              voices={voices}
              enabledVoices={displayVoices}
              parsedLinesPerVoice={parsedLinesPerVoice}
              activeNoteIndices={activeNoteIndices}
              measuresPerLine={measuresPerLine}
              onLineClick={handleLineClick}
              activeLineIndex={activeLineIndex}
            />
          </div>

          <p className="text-xs text-slate-400 text-center">
            Klik pada baris notasi untuk mulai memutar dari posisi tersebut
          </p>
        </>
      )}

      {!hasSong && !isLoadingSong && (
        <div className="flex items-center justify-center h-48 text-slate-400 italic">
          Pilih lagu di atas untuk memulai latihan
        </div>
      )}
    </div>
  );
}

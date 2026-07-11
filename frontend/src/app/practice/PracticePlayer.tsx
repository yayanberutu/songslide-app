"use client";

import React, { useState, useEffect } from "react";
import { MultiVoicePlayer } from "@/app/playground/lib/playground-multi-player";
import { VoiceDefinition } from "@/app/playground/lib/playground-voice";
import type { ParsedLineData } from "@/app/playground/page";

const COMMON_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F",
  "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B", "Bes",
];

interface PracticePlayerProps {
  voices: VoiceDefinition[];
  parsedLinesPerVoice: Record<string, ParsedLineData[]>;
  tempo: number;
  songKey: string;
  enabledVoices: Set<string>;
  onActiveNoteChange: (voiceId: string, noteIndex: number | null) => void;
  onTempoChange: (tempo: number) => void;
  onSongKeyChange: (key: string) => void;
  onPositionChange?: (position: number, total: number) => void;
  playerRef: React.MutableRefObject<MultiVoicePlayer | null>;
}

export function PracticePlayer({
  voices,
  parsedLinesPerVoice,
  tempo,
  songKey,
  enabledVoices,
  onActiveNoteChange,
  onTempoChange,
  onSongKeyChange,
  onPositionChange,
  playerRef,
}: PracticePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    playerRef.current = new MultiVoicePlayer(
      (state) => setIsPlaying(state.isPlaying),
      (voiceId, noteIndex) => onActiveNoteChange(voiceId, noteIndex),
      (pos, total) => {
        setPosition(pos);
        setTotalDuration(total);
        onPositionChange?.(pos, total);
      }
    );
    return () => {
      playerRef.current?.stop();
    };
  }, [onActiveNoteChange, onPositionChange, playerRef]);

  useEffect(() => {
    if (isPlaying) {
      playerRef.current?.stop();
    }
  }, [enabledVoices, playerRef]);

  const handlePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.stop();
      return;
    }
    playerRef.current.play(voices, parsedLinesPerVoice, tempo, songKey, enabledVoices);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekPos = parseFloat(e.target.value);
    setPosition(seekPos);
    if (playerRef.current && isPlaying) {
      playerRef.current.seekTo(seekPos);
    }
  };

  const handleLoopToggle = () => {
    if (!playerRef.current) return;
    if (isLooping) {
      playerRef.current.clearLoop();
      setIsLooping(false);
    } else {
      setIsLooping(true);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        {/* Play/Stop button */}
        <button
          onClick={handlePlay}
          className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full text-white transition-all shadow-lg flex-shrink-0 ${
            isPlaying
              ? "bg-red-500 hover:bg-red-600"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
          aria-label={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <rect x="5" y="5" width="10" height="10" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Progress area */}
        <div className="flex-1 w-full flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs text-slate-500 w-8 sm:w-10 text-right font-mono">
              {formatTime(position)}
            </span>
            <input
              type="range"
              min="0"
              max={totalDuration || 1}
              step="0.1"
              value={position}
              onChange={handleSeek}
              className="flex-1 h-1.5 accent-emerald-500"
            />
            <span className="text-[10px] sm:text-xs text-slate-500 w-8 sm:w-10 font-mono">
              {formatTime(totalDuration)}
            </span>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600">
            {/* Key selector */}
            <div className="flex items-center gap-1">
              <span className="font-medium">Nada:</span>
              <select
                value={songKey}
                onChange={(e) => onSongKeyChange(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {COMMON_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Tempo control */}
            <div className="flex items-center gap-1">
              <span className="font-medium">Tempo:</span>
              <input
                type="range"
                min="40"
                max="240"
                step="1"
                value={tempo}
                onChange={(e) => onTempoChange(parseInt(e.target.value))}
                className="w-16 sm:w-20 h-1 accent-emerald-500"
              />
              <span className="font-mono w-6 text-right">{tempo}</span>
            </div>

            <button
              onClick={handleLoopToggle}
              className={`font-medium px-2 py-0.5 rounded transition-colors ${
                isLooping
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500 hover:bg-slate-300"
              }`}
            >
              {isLooping ? "Loop ON" : "Loop"}
            </button>

            {isPlaying && (
              <span className="text-emerald-600 font-medium animate-pulse">
                Memutar...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { MultiVoicePlayer } from "./lib/playground-multi-player";
import { VoiceDefinition, getVoiceButtonColorClass } from "./lib/playground-voice";
import { ParsedLineData } from "./page";

interface PlaygroundPlayerProps {
  voices: VoiceDefinition[];
  parsedLinesPerVoice: Record<string, ParsedLineData[]>;
  tempo?: number;
  songKey?: string;
  enabledVoices: Set<string>;
  activeTab: string; // "all" or voiceId
  onActiveNoteChange?: (voiceId: string, noteIndex: number | null) => void;
  className?: string;
}

export function PlaygroundPlayer({
  voices,
  parsedLinesPerVoice,
  tempo = 100,
  songKey = "C",
  enabledVoices,
  activeTab,
  onActiveNoteChange,
  className = "",
}: PlaygroundPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<MultiVoicePlayer | null>(null);

  // Determine which voices will play based on the active tab
  const getPlayableVoices = () => {
    if (activeTab === "all") {
      return enabledVoices;
    }
    // If in an individual voice tab, only play that voice (regardless of checkbox)
    return new Set([activeTab]);
  };

  const playableVoices = getPlayableVoices();
  const isPartiturMode = voices.length > 1;

  // Single voice visual context for the play button color
  const activeVoiceDef = activeTab !== "all" ? voices.find(v => v.id === activeTab) : null;
  const buttonColorClass = activeVoiceDef
    ? getVoiceButtonColorClass(activeVoiceDef.color)
    : "bg-slate-700 hover:bg-slate-800 shadow-slate-700/30"; // Dark for "All" tab

  useEffect(() => {
    playerRef.current = new MultiVoicePlayer(
      (state) => {
        setIsPlaying(state.isPlaying);
      },
      (voiceId, noteIndex) => {
        console.log("active note change", voiceId, noteIndex); onActiveNoteChange?.(voiceId, noteIndex);
      }
    );

    return () => {
      playerRef.current?.stop();
    };
  }, [onActiveNoteChange]);

  const handlePlay = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.stop();
      return;
    }

    playerRef.current.play(
      voices,
      parsedLinesPerVoice,
      tempo,
      songKey,
      playableVoices
    );
  };

  // Stop playback if tab changes or voices change
  useEffect(() => {
    if (isPlaying) {
      playerRef.current?.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, enabledVoices]);

  return (
    <div className={`flex items-center gap-4 p-4 border rounded-xl bg-slate-50 ${className}`}>
      <button
        onClick={handlePlay}
        className={`w-12 h-12 flex items-center justify-center rounded-full text-white transition-all shadow-lg ${
          isPlaying ? "bg-red-500 hover:bg-red-600 shadow-md" : buttonColorClass
        }`}
        aria-label={isPlaying ? "Stop" : "Play"}
      >
        {isPlaying ? (
          // Stop Icon
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <rect x="5" y="5" width="10" height="10" />
          </svg>
        ) : (
          // Play Icon
          <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </button>
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {isPlaying ? "Playing..." : (isPartiturMode ? "Partitur Player" : "Jianpu Synthesizer")}
        </span>
        <div className="text-sm text-slate-500 flex flex-wrap gap-2 items-center">
          <span>Key: {songKey}</span>
          <span>•</span>
          <span>Tempo: {tempo} BPM</span>
          {isPartiturMode && (
            <>
              <span>•</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {activeTab === "all" 
                  ? `${playableVoices.size} voices` 
                  : `${activeVoiceDef?.label} only`}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

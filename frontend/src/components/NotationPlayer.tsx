"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAudioContext, closeAudioContext, playTone } from "@/lib/audio-synth";
import { calculateFrequency } from "@/lib/audio-synth";
import { mapNotationToAudioEvents } from "@/lib/notation-player-mapper";
import type { ParsedLineData } from "@/app/playground/page";
import type { AudioEvent } from "@/lib/notation-player-mapper";

interface NotationPlayerProps {
  parsedLines: ParsedLineData[];
  tempo?: number;
  songKey?: string;
  onActiveNoteChange?: (noteIndex: number | null) => void;
  className?: string;
}

export function NotationPlayer({ parsedLines, tempo = 100, songKey = "C", onActiveNoteChange, className = "" }: NotationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Keep track of the audio events and context start time for the rAF loop
  const currentEventsRef = useRef<AudioEvent[]>([]);
  const startTimeRef = useRef<number>(0);
  const startDelay = 0.1;

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playbackTimeoutRef.current) {
      window.clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    onActiveNoteChange?.(null);
    closeAudioContext();
  }, [onActiveNoteChange]);

  const handlePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!parsedLines || parsedLines.length === 0) return;

    // Collect all tokens from all valid lines
    const allTokens = parsedLines.flatMap(line => line.tokens);

    const events = mapNotationToAudioEvents(allTokens, tempo, songKey, calculateFrequency);
    
    if (events.length === 0) return;

    setIsPlaying(true);
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    startTimeRef.current = now + startDelay;
    currentEventsRef.current = events;
    
    let totalDuration = 0;

    events.forEach(event => {
      playTone(
        ctx,
        event.frequency,
        startTimeRef.current + event.startTimeSeconds,
        event.durationSeconds,
        event.isSlur
      );
      totalDuration = event.startTimeSeconds + event.durationSeconds;
    });

    // Schedule stop state update
    playbackTimeoutRef.current = window.setTimeout(() => {
      stopPlayback();
    }, (startDelay + totalDuration) * 1000);

    // Start requestAnimationFrame loop for highlighting
    const checkTime = () => {
      const currentCtx = getAudioContext();
      const timeElapsed = currentCtx.currentTime - startTimeRef.current;
      
      if (timeElapsed >= 0) {
        // Find which event is currently playing
        const activeEvent = currentEventsRef.current.find(
          e => timeElapsed >= e.startTimeSeconds && timeElapsed < (e.startTimeSeconds + e.durationSeconds)
        );
        
        if (activeEvent) {
          // Find the specific UI token within this event
          const activeUiToken = activeEvent.uiTokens.find(
            ui => timeElapsed >= ui.startTimeSeconds && timeElapsed < (ui.startTimeSeconds + ui.durationSeconds)
          );
          
          if (activeUiToken && activeUiToken.noteIndex !== undefined) {
            onActiveNoteChange?.(activeUiToken.noteIndex);
          }
        } else if (timeElapsed < totalDuration) {
          // In between notes (if there's a gap, though usually there isn't)
          // We keep previous state or null
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(checkTime);
    };
    
    animationFrameRef.current = requestAnimationFrame(checkTime);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  return (
    <div className={`flex items-center gap-4 p-4 border rounded-xl bg-slate-50 ${className}`}>
      <button
        onClick={handlePlay}
        className={`w-12 h-12 flex items-center justify-center rounded-full text-white transition-all ${
          isPlaying ? "bg-red-500 hover:bg-red-600 shadow-md" : "bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/30"
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
          {isPlaying ? "Playing..." : "Jianpu Synthesizer"}
        </span>
        <span className="text-sm text-slate-500">
          Key: {songKey} • Tempo: {tempo} BPM
        </span>
      </div>
    </div>
  );
}

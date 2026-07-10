"use client";

import React from "react";
import { VoiceDefinition, getVoiceColorClass } from "./lib/playground-voice";
import { PlaygroundNotationLine } from "./PlaygroundNotationLine";
import { ParsedLineData } from "./page";

interface AllVoicesPreviewProps {
  voices: VoiceDefinition[];
  enabledVoices: Set<string>;
  parsedLinesPerVoice: Record<string, ParsedLineData[]>;
  activeNoteIndices: Record<string, number | null>;
  theme?: "LIGHT" | "DARK";
}

export function AllVoicesPreview({
  voices,
  enabledVoices,
  parsedLinesPerVoice,
  activeNoteIndices,
  theme = "LIGHT",
}: AllVoicesPreviewProps) {
  // Find the maximum number of lines across all voices
  let maxLines = 0;
  for (const voice of voices) {
    if (enabledVoices.has(voice.id)) {
      const lines = parsedLinesPerVoice[voice.id] || [];
      maxLines = Math.max(maxLines, lines.length);
    }
  }

  if (maxLines === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 italic">
        Belum ada notasi yang diaktifkan.
      </div>
    );
  }

  // We render line by line. For each line, we render all enabled voices vertically stacked.
  const lines = Array.from({ length: maxLines }).map((_, lineIndex) => {
    return (
      <div key={`line-${lineIndex}`} className="flex flex-col gap-2 p-4 border border-slate-200 rounded-xl bg-white shadow-sm overflow-x-auto">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Baris {lineIndex + 1}
        </div>
        
        {voices.filter(v => enabledVoices.has(v.id)).map(voice => {
          const voiceLines = parsedLinesPerVoice[voice.id] || [];
          const parsedLine = voiceLines[lineIndex];
          
          if (!parsedLine) return null; // Voice might have fewer lines
          
          const hasLyric = !!parsedLine.lyric && parsedLine.lyric.trim().length > 0;
          const activeNoteIndex = activeNoteIndices[voice.id] ?? null;

          return (
            <div key={`${lineIndex}-${voice.id}`} className="flex flex-col mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 ${getVoiceColorClass(voice.color)}`}>
                  {voice.label}
                </span>
              </div>
              <div className="pl-2 border-l-2 border-slate-100">
                <PlaygroundNotationLine
                  alignment={parsedLine.alignmentResult}
                  theme={theme}
                  activeNoteIndex={activeNoteIndex}
                  hasLyric={hasLyric}
                  voiceColor={getVoiceColorClass(voice.color)}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {lines}
    </div>
  );
}

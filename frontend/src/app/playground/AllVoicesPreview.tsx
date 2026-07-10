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
  measuresPerLine?: number;
  theme?: "LIGHT" | "DARK";
}

import { type NotationToken } from "@/lib/notation-parser";

export function AllVoicesPreview({
  voices,
  enabledVoices,
  parsedLinesPerVoice,
  activeNoteIndices,
  measuresPerLine = 4,
  theme = "LIGHT",
}: AllVoicesPreviewProps) {
  // Find the maximum number of lines across all voices
  let maxLines = 0;
  const enabledVoiceList = voices.filter((v) => enabledVoices.has(v.id));

  for (const voice of enabledVoiceList) {
    const lines = parsedLinesPerVoice[voice.id] || [];
    maxLines = Math.max(maxLines, lines.length);
  }

  if (maxLines === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 italic">
        Belum ada notasi yang diaktifkan.
      </div>
    );
  }

  // We render line by line (as parsed from the text area).
  const lines = Array.from({ length: maxLines }).map((_, lineIndex) => {
    // Collect the tokens for each voice for THIS lineIndex
    const voiceTokensList: { voice: VoiceDefinition; tokens: NotationToken[]; parsedLine: ParsedLineData }[] = [];
    
    for (const voice of enabledVoiceList) {
      const voiceLines = parsedLinesPerVoice[voice.id] || [];
      const parsedLine = voiceLines[lineIndex];
      if (parsedLine) {
        voiceTokensList.push({ voice, tokens: parsedLine.alignmentResult.notation.tokens, parsedLine });
      }
    }

    if (voiceTokensList.length === 0) return null;

    // If auto (<= 0), just render exactly like before
    if (measuresPerLine <= 0) {
      return (
        <div key={`line-${lineIndex}`} className="flex flex-col gap-2 p-4 border border-slate-200 rounded-xl bg-white shadow-sm overflow-x-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Baris {lineIndex + 1}
          </div>
          {voiceTokensList.map(({ voice, parsedLine }) => {
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
    }

    // Otherwise, chunk the tokens.
    // We determine the maximum number of chunks across all voices.
    // A chunk is completed after seeing `measuresPerLine` BAR or DOUBLE_BAR tokens.
    const allVoiceChunks: { voice: VoiceDefinition; parsedLine: ParsedLineData; chunks: NotationToken[][] }[] = [];
    let maxChunks = 0;

    for (const { voice, tokens, parsedLine } of voiceTokensList) {
      const chunks: NotationToken[][] = [];
      let currentChunk: NotationToken[] = [];
      let measureCount = 0;

      for (const token of tokens) {
        currentChunk.push(token);
        if (token.type === "BAR" || token.type === "DOUBLE_BAR") {
          measureCount++;
          if (measureCount >= measuresPerLine) {
            chunks.push(currentChunk);
            currentChunk = [];
            measureCount = 0;
          }
        }
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      allVoiceChunks.push({ voice, parsedLine, chunks });
      maxChunks = Math.max(maxChunks, chunks.length);
    }

    // Render each chunk
    return (
      <div key={`line-${lineIndex}`} className="flex flex-col gap-6">
        {Array.from({ length: maxChunks }).map((_, chunkIndex) => (
          <div key={`chunk-${chunkIndex}`} className="flex flex-col gap-2 p-4 border border-slate-200 rounded-xl bg-white shadow-sm overflow-x-auto">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Baris {lineIndex + 1} {maxChunks > 1 ? `(Potongan ${chunkIndex + 1})` : ""}
            </div>
            {allVoiceChunks.map(({ voice, parsedLine, chunks }) => {
              const chunkTokens = chunks[chunkIndex];
              if (!chunkTokens || chunkTokens.length === 0) return null;

              const hasLyric = !!parsedLine.lyric && parsedLine.lyric.trim().length > 0;
              const activeNoteIndex = activeNoteIndices[voice.id] ?? null;

              return (
                <div key={`${lineIndex}-${chunkIndex}-${voice.id}`} className="flex flex-col mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 ${getVoiceColorClass(voice.color)}`}>
                      {voice.label}
                    </span>
                  </div>
                  <div className="pl-2 border-l-2 border-slate-100">
                    <PlaygroundNotationLine
                      alignment={parsedLine.alignmentResult}
                      tokensOverride={chunkTokens}
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
        ))}
      </div>
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {lines}
    </div>
  );
}

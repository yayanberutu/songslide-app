"use client";

import React from "react";
import { VoiceDefinition, getVoiceColorClass } from "./lib/playground-voice";
import {
  PlaygroundMeasure,
  splitTokensIntoMeasures,
  buildLyricByTokenIndex,
  type PlaygroundMeasureData,
} from "./PlaygroundNotationLine";
import { ParsedLineData } from "./page";
import type { PlaygroundAlignmentCell } from "./lib/playground-alignment";

interface AllVoicesPreviewProps {
  voices: VoiceDefinition[];
  enabledVoices: Set<string>;
  parsedLinesPerVoice: Record<string, ParsedLineData[]>;
  activeNoteIndices: Record<string, number | null>;
  measuresPerLine?: number;
  theme?: "LIGHT" | "DARK";
  onLineClick?: (lineIndex: number) => void;
  activeLineIndex?: number | null;
}

// Per-voice, pre-computed data for one text line.
type VoiceLineData = {
  voice: VoiceDefinition;
  measures: PlaygroundMeasureData[];
  cells: PlaygroundAlignmentCell[];
  lyricMap: Map<number, string>;
  hasLyric: boolean;
  activeNoteIndex: number | null;
};

export function AllVoicesPreview({
  voices,
  enabledVoices,
  parsedLinesPerVoice,
  activeNoteIndices,
  measuresPerLine = 4,
  theme = "LIGHT",
  onLineClick,
  activeLineIndex,
}: AllVoicesPreviewProps) {
  const enabledVoiceList = voices.filter((v) => enabledVoices.has(v.id));

  let maxLines = 0;
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

  const lines = Array.from({ length: maxLines }).map((_, lineIndex) => {
    // Collect + pre-split each voice's tokens for THIS line.
    const voiceLineData: VoiceLineData[] = [];
    let maxMeasures = 0;

    for (const voice of enabledVoiceList) {
      const parsedLine = (parsedLinesPerVoice[voice.id] || [])[lineIndex];
      if (!parsedLine) continue;

      const cells = parsedLine.alignmentResult.cells;
      const measures = splitTokensIntoMeasures(
        parsedLine.alignmentResult.notation.tokens
      );
      voiceLineData.push({
        voice,
        measures,
        cells,
        lyricMap: buildLyricByTokenIndex(cells),
        hasLyric: !!parsedLine.lyric && parsedLine.lyric.trim().length > 0,
        activeNoteIndex: activeNoteIndices[voice.id] ?? null,
      });
      maxMeasures = Math.max(maxMeasures, measures.length);
    }

    if (voiceLineData.length === 0 || maxMeasures === 0) return null;

    // How many measures per rendered "potongan" (0 / auto => keep on one line).
    const perLine =
      measuresPerLine > 0 ? measuresPerLine : maxMeasures;
    const numPotongan = Math.max(1, Math.ceil(maxMeasures / perLine));

    return (
      <div key={`line-${lineIndex}`} className="flex flex-col gap-6">
        {Array.from({ length: numPotongan }).map((_, potonganIdx) => {
          const startMeasure = potonganIdx * perLine;
          const colCount = Math.min(perLine, maxMeasures - startMeasure);
          if (colCount <= 0) return null;

          // A column shows a double bar if ANY voice ends that measure with `||`.
          const doubleFlags: boolean[] = [];
          for (let c = 0; c < colCount; c++) {
            const measureIndex = startMeasure + c;
            doubleFlags[c] = voiceLineData.some(
              (v) => v.measures[measureIndex]?.double
            );
          }

          const isActiveLine = activeLineIndex === lineIndex;

          return (
            <div
              key={`potongan-${potonganIdx}`}
              className={`p-3 sm:p-4 border rounded-xl bg-white shadow-sm overflow-x-auto ${
                isActiveLine ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"
              } ${onLineClick ? "cursor-pointer hover:border-emerald-300 transition-colors" : ""}`}
              onClick={onLineClick ? () => onLineClick(lineIndex) : undefined}
            >
              <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">
                Baris {lineIndex + 1}
                {numPotongan > 1 ? ` (Potongan ${potonganIdx + 1})` : ""}
              </div>

              <div
                className="grid w-full items-stretch"
                style={{
                  gridTemplateColumns: `auto repeat(${colCount}, minmax(min-content, 1fr))`,
                }}
              >
                {voiceLineData.map((vData) => (
                  <React.Fragment key={vData.voice.id}>
                    {/* Voice label */}
                    <div className="flex items-center py-1.5 sm:py-2 pr-2 sm:pr-3">
                      <span
                        className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 whitespace-nowrap ${getVoiceColorClass(
                          vData.voice.color
                        )}`}
                      >
                        {vData.voice.label}
                      </span>
                    </div>

                    {/* One cell per measure column */}
                    {Array.from({ length: colCount }).map((_, c) => {
                      const measureIndex = startMeasure + c;
                      const measure = vData.measures[measureIndex];
                      const isDouble = doubleFlags[c];

                      return (
                        <div
                          key={c}
                          className={`px-2 py-2 border-r ${
                            isDouble
                              ? "border-r-2 border-slate-400"
                              : "border-slate-300"
                          } ${c === 0 ? "border-l border-slate-200" : ""}`}
                        >
                          {measure && measure.tokens.length > 0 ? (
                            <PlaygroundMeasure
                              tokens={measure.tokens}
                              cells={vData.cells}
                              lyricByTokenIndex={vData.lyricMap}
                              hasLyric={vData.hasLyric}
                              theme={theme}
                              activeNoteIndex={vData.activeNoteIndex}
                              voiceColor={getVoiceColorClass(vData.voice.color)}
                            />
                          ) : (
                            <div className="h-[4.5rem]" />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  });

  return <div className="flex flex-col gap-6">{lines}</div>;
}

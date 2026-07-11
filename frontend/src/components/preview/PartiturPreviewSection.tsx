import React, { useMemo } from "react";
import { type PartiturSection } from "@/lib/arrangement-api";
import { parseNotationLine } from "@/lib/notation-parser";
import { alignPlaygroundNotationAndLyric } from "@/app/playground/lib/playground-alignment";
import { AllVoicesPreview } from "@/app/playground/AllVoicesPreview";
import { DEFAULT_VOICES } from "@/app/playground/lib/playground-voice";
import { type ParsedLineData } from "@/app/playground/page";

export function PartiturPreviewSection({
  section,
  theme = "LIGHT",
  beatsPerLine = 16,
  activeNoteIndices = {}
}: {
  section: PartiturSection;
  theme?: "LIGHT" | "DARK";
  beatsPerLine?: number;
  activeNoteIndices?: Record<string, number | null>;
}) {
  const parsedLinesPerVoice = useMemo(() => {
    const result: Record<string, ParsedLineData[]> = {};
    const enabledVoices = section.enabledVoices ?? ["sopran", "alto", "tenor", "bass"];

    for (const voiceId of enabledVoices) {
      result[voiceId] = [];
      for (const line of section.lines) {
        const notation = line.voices?.[voiceId]?.notation ?? "";
        const lyric = line.voices?.[voiceId]?.lyric ?? "";
        
        const parsed = parseNotationLine(notation);
        const alignmentResult = alignPlaygroundNotationAndLyric(parsed, lyric);
        
        result[voiceId].push({
          raw: notation,
          tokens: parsed.tokens,
          issues: parsed.issues,
          lyric,
          alignmentResult
        });
      }
    }
    return result;
  }, [section]);

  const enabledVoicesSet = useMemo(() => new Set(section.enabledVoices ?? ["sopran", "alto", "tenor", "bass"]), [section.enabledVoices]);

  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-lg font-semibold mb-3">{section.label || "Partitur"}</h3>
      <AllVoicesPreview
        voices={DEFAULT_VOICES}
        enabledVoices={enabledVoicesSet}
        parsedLinesPerVoice={parsedLinesPerVoice}
        activeNoteIndices={activeNoteIndices}
        measuresPerLine={beatsPerLine / 4} // Assuming 4 beats per measure for default
        theme={theme}
      />
    </div>
  );
}

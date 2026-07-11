import React, { useMemo } from "react";
import { parseNotationLine, type NotationToken as NotationTokenValue } from "@/lib/notation-parser";
import { NotationToken } from "@/components/notation/NotationToken";

type NotationLineProps = {
  notation: string | null | undefined;
  theme?: "LIGHT" | "DARK";
  activeNoteIndex?: number | null;
  startNoteIndex?: number;
};

export function NotationLine({ notation, theme = "LIGHT", activeNoteIndex = null, startNoteIndex = 0 }: NotationLineProps) {
  const result = useMemo(() => {
    const parsed = parseNotationLine(notation);
    if (parsed.issues.length === 0) {
      let currentIndex = startNoteIndex;
      const assignGlobalIndex = (tokens: NotationTokenValue[]) => {
        for (const token of tokens) {
          if (token.type === "NOTE" || token.type === "REST" || token.type === "EXTENSION") {
            token.globalNoteIndex = currentIndex++;
          } else if (token.type === "SLUR" || token.type === "BEAM") {
            assignGlobalIndex(token.children);
          }
        }
      };
      assignGlobalIndex(parsed.tokens);
    }
    return parsed;
  }, [notation, startNoteIndex]);

  const rawText = notation?.trim() ?? "";
  const isDark = theme === "DARK";

  if (rawText.length === 0) {
    return null;
  }

  if (result.issues.length > 0) {
    return (
      <p className={`break-all font-mono text-lg leading-7 ${isDark ? "text-cyan-100" : "text-ink-950"}`}>
        {rawText}
      </p>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="flex flex-wrap items-end gap-x-1 gap-y-2">
        {result.tokens.map((token, index) => (
          <NotationToken key={`${token.raw}-${index}`} token={token} theme={theme} activeNoteIndex={activeNoteIndex} />
        ))}
      </div>
    </div>
  );
}

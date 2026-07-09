import React from "react";
import type { NotationToken as NotationTokenValue, NotationParseResult } from "@/lib/notation-parser";

type NotationTokenProps = {
  token: NotationTokenValue;
  theme?: "LIGHT" | "DARK";
  beamDepth?: number;
  activeNoteIndex?: number | null;
};

const notationArea = "relative inline-flex h-12 items-center justify-center";

export function PlaygroundNotationToken({
  token,
  theme = "LIGHT",
  beamDepth = 0,
  activeNoteIndex = null
}: NotationTokenProps) {
  const isDark = theme === "DARK";
  
  const isHighlighted = token.globalNoteIndex !== undefined && token.globalNoteIndex === activeNoteIndex;
  
  const baseNoteTone = isDark ? "text-cyan-100" : "text-ink-950";
  const noteTone = isHighlighted ? "text-emerald-500 font-bold scale-110 transition-transform" : baseNoteTone;
  
  const baseMutedTone = isDark ? "text-zinc-300" : "text-ink-500";
  const mutedTone = isHighlighted ? "text-emerald-500 font-bold scale-110 transition-transform" : baseMutedTone;
  
  const beamTone = isDark ? "bg-cyan-100/85" : "bg-ink-950/80";
  const slurTone = isDark ? "border-cyan-100/70" : "border-ink-950/60";
  const barTone = isDark ? "bg-zinc-300/80" : "bg-ink-500/80";

  if (token.type === "BAR") {
    return (
      <span className={`${notationArea} w-2`}>
        <span aria-hidden="true" className={`block h-6 w-px ${barTone}`} />
      </span>
    );
  }

  if (token.type === "DOUBLE_BAR") {
    return (
      <span className={`${notationArea} w-3 gap-[3px]`}>
        <span aria-hidden="true" className={`block h-6 w-px ${barTone}`} />
        <span aria-hidden="true" className={`block h-6 w-[2px] ${barTone}`} />
      </span>
    );
  }

  if (token.type === "REST") {
    return <span className={`${notationArea} min-w-4 text-lg font-semibold ${mutedTone}`}>0</span>;
  }

  if (token.type === "EXTENSION") {
    const isExtHighlighted = token.globalNoteIndex !== undefined && token.globalNoteIndex === activeNoteIndex;
    const extTone = isExtHighlighted ? "bg-emerald-500 scale-125 transition-transform" : isDark ? "bg-zinc-100" : "bg-ink-700";
    
    return (
      <span className={`${notationArea} w-3`}>
        <span
          aria-hidden="true"
          className={`absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${extTone}`}
        />
      </span>
    );
  }

  if (token.type === "SLUR") {
    return (
      <span className={`${notationArea} w-fit px-px`}>
        <span className="inline-flex h-full items-center gap-1">
          {token.children.map((child, index) => (
            <PlaygroundNotationToken 
              key={`${token.raw}-${index}`} 
              token={child} 
              theme={theme} 
              beamDepth={beamDepth}
              activeNoteIndex={activeNoteIndex} 
            />
          ))}
        </span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-0 bottom-0.5 left-0 h-3 border-b-[1.5px] ${slurTone}`}
          style={{ borderRadius: "0 0 50% 50% / 0 0 100% 100%" }}
        />
      </span>
    );
  }

  if (token.type === "BEAM") {
    const ownBeamLevel = Math.min(beamDepth + 1, 2);
    const beamTopClass = ownBeamLevel === 1 ? "top-0" : "top-[3px]";

    return (
      <span className={`${notationArea} w-fit px-px`}>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute ${beamTopClass} left-0.5 right-0.5 h-[1.5px] rounded-full ${beamTone}`}
        />
        <span className="inline-flex h-full items-center gap-1">
          {token.children.map((child, index) => (
            <PlaygroundNotationToken 
              key={`${token.raw}-${index}`} 
              token={child} 
              theme={theme} 
              beamDepth={ownBeamLevel}
              activeNoteIndex={activeNoteIndex} 
            />
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className={`${notationArea} min-w-4 px-0.5 text-lg font-semibold ${noteTone}`}>
      {token.octave > 0 ? (
        <span className={`pointer-events-none absolute top-2 left-1/2 flex -translate-x-1/2 gap-px`}>
          {Array.from({ length: token.octave }).map((_, index) => (
            <span key={`top-${index}`} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      ) : null}
      {token.octave < 0 ? (
        <span className="pointer-events-none absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-px">
          {Array.from({ length: Math.abs(token.octave) }).map((_, index) => (
            <span key={`bottom-${index}`} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      ) : null}
      {token.accidental ? (
        <span className="pointer-events-none absolute -left-1 top-2.5 text-[0.65rem] leading-none" aria-hidden="true">
          {token.accidental === "b" ? "♭" : "♯"}
        </span>
      ) : null}
      {token.degree}
      {token.shortDurationLevel > 0 ? (
        <span className="pointer-events-none absolute -bottom-1 left-1/2 flex -translate-x-1/2 flex-col gap-[1.5px]" aria-hidden="true">
          {Array.from({ length: token.shortDurationLevel }).map((_, index) => (
            <span key={`short-${index}`} className="block h-px w-3.5 bg-current" />
          ))}
        </span>
      ) : null}
      {token.holdCount > 0 ? (
        <span className="pointer-events-none absolute -right-2 top-1/2 flex -translate-y-1/2 gap-0.5" aria-hidden="true">
          {Array.from({ length: token.holdCount }).map((_, index) => (
            <span key={`hold-${index}`} className="block h-[1.5px] w-2 rounded-full bg-current" />
          ))}
        </span>
      ) : null}
      {token.hasFermata ? (
        <span className="pointer-events-none absolute -top-[3px] left-1/2 flex flex-col items-center -translate-x-1/2" aria-hidden="true">
          <svg width="14" height="10" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-current">
            <path d="M1 8 C 1 1, 15 1, 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          </svg>
        </span>
      ) : null}
    </span>
  );
}

export function PlaygroundNotationLine({ parsedLine, theme = "LIGHT", activeNoteIndex = null }: { parsedLine: NotationParseResult, theme?: "LIGHT"|"DARK", activeNoteIndex?: number | null }) {
  const isDark = theme === "DARK";

  if (parsedLine.issues.length > 0) {
    return (
      <p className={`break-all font-mono text-lg leading-7 ${isDark ? "text-cyan-100" : "text-ink-950"}`}>
        {/* We can't use parsedLine.raw easily here since we don't have it, but for playground we can skip it or just render nothing */}
      </p>
    );
  }

  return (
    <div className="max-w-full pb-2">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-6">
        {parsedLine.tokens.map((token, index) => (
          <PlaygroundNotationToken 
            key={`${index}`} 
            token={token} 
            theme={theme} 
            activeNoteIndex={activeNoteIndex} 
          />
        ))}
      </div>
    </div>
  );
}

import React from "react";
import type { NotationToken as NotationTokenValue } from "@/lib/notation-parser";
import type {
  PlaygroundAlignmentCell,
  PlaygroundAlignmentResult,
} from "./lib/playground-alignment";

// ─── Token rendering props ────────────────────────────────────────────────────

type TokenProps = {
  token: NotationTokenValue;
  theme?: "LIGHT" | "DARK";
  beamDepth?: number;
  activeNoteIndex?: number | null;
  voiceColor?: string;
};

const notationArea = "relative inline-flex h-12 items-center justify-center";

// ─── Single notation token (unchanged visual, just reorganised) ───────────────

export function PlaygroundNotationToken({
  token,
  theme = "LIGHT",
  beamDepth = 0,
  activeNoteIndex = null,
  voiceColor,
}: TokenProps) {
  const isDark = theme === "DARK";

  const isHighlighted =
    token.globalNoteIndex !== undefined &&
    token.globalNoteIndex === activeNoteIndex;

  const activeColor = voiceColor || "text-emerald-500";

  const baseNoteTone = isDark ? "text-cyan-100" : "text-ink-950";
  const noteTone = isHighlighted
    ? `${activeColor} font-bold scale-110 transition-transform`
    : baseNoteTone;

  const baseMutedTone = isDark ? "text-zinc-300" : "text-ink-500";
  const mutedTone = isHighlighted
    ? `${activeColor} font-bold scale-110 transition-transform`
    : baseMutedTone;

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
    return (
      <span className={`${notationArea} min-w-4 text-lg font-semibold ${mutedTone}`}>
        0
      </span>
    );
  }

  if (token.type === "EXTENSION") {
    const isExtHighlighted =
      token.globalNoteIndex !== undefined &&
      token.globalNoteIndex === activeNoteIndex;
    const extTone = isExtHighlighted
      ? "bg-emerald-500 scale-125 transition-transform"
      : isDark
      ? "bg-zinc-100"
      : "bg-ink-700";

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
        <span className="pointer-events-none absolute top-2 left-1/2 flex -translate-x-1/2 gap-px">
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
        <span
          className="pointer-events-none absolute -left-1 top-2.5 text-[0.65rem] leading-none"
          aria-hidden="true"
        >
          {token.accidental === "b" ? "♭" : "♯"}
        </span>
      ) : null}
      {token.degree}
      {token.shortDurationLevel > 0 ? (
        <span
          className="pointer-events-none absolute -bottom-1 left-1/2 flex -translate-x-1/2 flex-col gap-[1.5px]"
          aria-hidden="true"
        >
          {Array.from({ length: token.shortDurationLevel }).map((_, index) => (
            <span key={`short-${index}`} className="block h-px w-3.5 bg-current" />
          ))}
        </span>
      ) : null}
      {token.holdCount > 0 ? (
        <span
          className="pointer-events-none absolute -right-2 top-1/2 flex -translate-y-1/2 gap-0.5"
          aria-hidden="true"
        >
          {Array.from({ length: token.holdCount }).map((_, index) => (
            <span key={`hold-${index}`} className="block h-[1.5px] w-2 rounded-full bg-current" />
          ))}
        </span>
      ) : null}
      {token.hasFermata ? (
        <span
          className="pointer-events-none absolute -top-[3px] left-1/2 flex flex-col items-center -translate-x-1/2"
          aria-hidden="true"
        >
          <svg width="14" height="10" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-current">
            <path d="M1 8 C 1 1, 15 1, 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          </svg>
        </span>
      ) : null}
    </span>
  );
}

// ─── Lyric-under-token rendering ─────────────────────────────────────────────

/**
 * Renders a single notation token PLUS its lyric (if any) stacked vertically.
 * For BEAM / SLUR containers we recurse into children, distributing the lyric
 * to the first child note.
 */
function PlaygroundAlignedToken({
  token,
  lyric,
  theme,
  beamDepth,
  activeNoteIndex,
  lyricTone,
  cells,
  voiceColor,
}: {
  token: NotationTokenValue;
  lyric: string | null;
  theme: "LIGHT" | "DARK";
  beamDepth: number;
  activeNoteIndex: number | null;
  lyricTone: string;
  cells: PlaygroundAlignmentCell[];
  voiceColor?: string;
}) {
  // Non-lyric-bearing tokens: just delegate to the visual token renderer
  if (
    token.type === "BAR" ||
    token.type === "DOUBLE_BAR" ||
    token.type === "EXTENSION"
  ) {
    return (
      <div className="inline-flex flex-col items-center">
        <PlaygroundNotationToken token={token} theme={theme} activeNoteIndex={activeNoteIndex} voiceColor={voiceColor} />
        {/* Spacer so rows stay aligned */}
        <span className="h-4" />
      </div>
    );
  }

  // REST: notation only, empty lyric slot
  if (token.type === "REST") {
    return (
      <div className="inline-flex flex-col items-center">
        <PlaygroundNotationToken token={token} theme={theme} activeNoteIndex={activeNoteIndex} voiceColor={voiceColor} />
        <span className="h-4" />
      </div>
    );
  }

  // BEAM / SLUR: render the container token on top, distribute lyrics to children
  if (token.type === "BEAM" || token.type === "SLUR") {
    const isDark = theme === "DARK";
    const beamTone = isDark ? "bg-cyan-100/85" : "bg-ink-950/80";
    const slurTone = isDark ? "border-cyan-100/70" : "border-ink-950/60";

    // Find cells for each child note
    const childCells = token.children.map((child) => {
      const matchingCell = cells.find((c) => {
        const tok = c.notationToken;
        if (!tok) return false;
        // Match by reference character index
        return tok.index === child.index;
      });
      return matchingCell ?? null;
    });

    if (token.type === "BEAM") {
      const ownBeamLevel = Math.min(beamDepth + 1, 2);
      const beamTopClass = ownBeamLevel === 1 ? "top-0" : "top-[3px]";
      return (
        <div className="inline-flex flex-col items-center">
          {/* Notation row */}
          <span className="relative inline-flex h-12 w-fit items-center justify-center px-px">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute ${beamTopClass} left-0.5 right-0.5 h-[1.5px] rounded-full ${beamTone}`}
            />
            <span className="inline-flex h-full items-center gap-1">
              {token.children.map((child, index) => {
                const isActiveNote = activeNoteIndex !== null && activeNoteIndex === child.globalNoteIndex;
              const activeBgClass = isActiveNote 
                ? (voiceColor ? `${voiceColor.replace("text-", "bg-").replace("-500", "-100")} border ${voiceColor.replace("text-", "border-")}` : "bg-emerald-100 border border-emerald-300")
                : "border border-transparent";
              return (
                  <div
                    key={`${token.raw}-${index}`}
                    className={`px-0.5 rounded transition-colors ${activeBgClass}`}
                  >
                    <PlaygroundNotationToken
                      token={child}
                      theme={theme}
                      beamDepth={ownBeamLevel}
                      activeNoteIndex={activeNoteIndex}
                      voiceColor={voiceColor}
                    />
                  </div>
                );
              })}
            </span>
          </span>
          {/* Lyric row — one slot per child */}
          <span className="inline-flex gap-1">
            {token.children.map((child, index) => {
              const cell = childCells[index];
              const childLyric = cell?.lyric?.text ?? "";
              return (
                <span
                  key={index}
                  className={`inline-flex min-w-4 justify-center text-sm font-semibold leading-none ${lyricTone}`}
                >
                  {childLyric}
                </span>
              );
            })}
          </span>
        </div>
      );
    }

    // SLUR
    return (
      <div className="inline-flex flex-col items-center">
        <span className="relative inline-flex h-12 w-fit items-center justify-center px-px">
          <span className="inline-flex h-full items-center gap-1">
            {token.children.map((child, index) => {
              const isActiveNote = activeNoteIndex !== null && activeNoteIndex === child.globalNoteIndex;
              const activeBgClass = isActiveNote 
                ? (voiceColor ? `${voiceColor.replace("text-", "bg-").replace("-500", "-100")} border ${voiceColor.replace("text-", "border-")}` : "bg-emerald-100 border border-emerald-300")
                : "border border-transparent";
              
              return (
                <div
                  key={`${token.raw}-${index}`}
                  className={`px-0.5 rounded transition-colors ${activeBgClass}`}
                >
                  <PlaygroundNotationToken
                    token={child}
                    theme={theme}
                    beamDepth={beamDepth}
                    activeNoteIndex={activeNoteIndex}
                    voiceColor={voiceColor}
                  />
                </div>
              );
            })}
          </span>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute right-0 bottom-0.5 left-0 h-3 border-b-[1.5px] ${slurTone}`}
            style={{ borderRadius: "0 0 50% 50% / 0 0 100% 100%" }}
          />
        </span>
        {/* Lyric row */}
        <span className="inline-flex gap-1">
          {token.children.map((child, index) => {
            const cell = childCells[index];
            const childLyric = cell?.lyric?.text ?? "";
            return (
              <span
                key={index}
                className={`inline-flex min-w-4 justify-center text-sm font-semibold leading-none ${lyricTone}`}
              >
                {childLyric}
              </span>
            );
          })}
        </span>
      </div>
    );
  }

  // NOTE: the main case — notation on top, lyric below
  const isActiveNote = activeNoteIndex !== null && activeNoteIndex === token.globalNoteIndex;
  const activeBgClass = isActiveNote 
    ? (voiceColor ? `${voiceColor.replace("text-", "bg-").replace("-500", "-100")} border ${voiceColor.replace("text-", "border-")}` : "bg-emerald-100 border border-emerald-300")
    : "border border-transparent";

  return (
    <div className={`inline-flex flex-col items-center px-0.5 rounded transition-colors ${activeBgClass}`}>
      <PlaygroundNotationToken
        token={token}
        theme={theme}
        beamDepth={beamDepth}
        activeNoteIndex={activeNoteIndex}
        voiceColor={voiceColor}
      />
      <span
        className={`inline-flex min-w-4 justify-center text-sm font-semibold leading-none ${lyricTone} whitespace-nowrap`}
      >
        {lyric ?? ""}
      </span>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export type PlaygroundNotationLineProps = {
  /** Pre-parsed notation + alignment result for this line */
  alignment: PlaygroundAlignmentResult;
  theme?: "LIGHT" | "DARK";
  activeNoteIndex?: number | null;
  /** Whether the user has entered any lyric text at all */
  hasLyric?: boolean;
  voiceColor?: string;
};

export function PlaygroundNotationLine({
  alignment,
  theme = "LIGHT",
  activeNoteIndex = null,
  hasLyric = false,
  voiceColor,
}: PlaygroundNotationLineProps) {
  const isDark = theme === "DARK";
  const lyricTone = isDark ? "text-zinc-300" : "text-ink-600";

  if (alignment.notation.issues.length > 0) {
    return (
      <p
        className={`break-all font-mono text-lg leading-7 ${isDark ? "text-cyan-100" : "text-ink-950"}`}
      />
    );
  }

  // Build a quick lookup: notationToken index → lyric text
  const lyricByTokenIndex = new Map<number, string>();
  for (const cell of alignment.cells) {
    if (cell.notationToken && cell.lyric) {
      lyricByTokenIndex.set(cell.notationToken.index, cell.lyric.text);
    }
  }

  return (
    <div className="max-w-full pb-2">
      <div className="flex flex-wrap items-end gap-x-1 gap-y-6">
        {alignment.notation.tokens.map((token, index) => {
          const lyric = lyricByTokenIndex.get(token.index) ?? null;

          if (!hasLyric) {
            // No lyric at all: render notation-only (original behaviour)
            return (
              <PlaygroundNotationToken
                key={index}
                token={token}
                theme={theme}
                activeNoteIndex={activeNoteIndex}
                voiceColor={voiceColor}
              />
            );
          }

          return (
            <PlaygroundAlignedToken
              key={index}
              token={token}
              lyric={lyric}
              theme={theme}
              beamDepth={0}
              activeNoteIndex={activeNoteIndex}
              lyricTone={lyricTone}
              cells={alignment.cells}
              voiceColor={voiceColor}
            />
          );
        })}
      </div>
    </div>
  );
}

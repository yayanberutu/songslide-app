import { collectLyricSlotTokens, type NotationToken as NotationTokenValue } from "@/lib/notation-parser";
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
          className={`absolute bottom-[16px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${extTone}`}
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
      <span className="relative">
        {token.degree}
        {token.accidental ? (
          <span
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              className={`w-[130%] h-[2.5px] bg-current transform ${
                token.accidental === "b" ? "rotate-45" : "-rotate-45"
              }`}
            />
          </span>
        ) : null}
      </span>
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
      <div className="inline-flex h-[4.5rem] flex-col items-center">
        <PlaygroundNotationToken token={token} theme={theme} activeNoteIndex={activeNoteIndex} voiceColor={voiceColor} />
        {/* Spacer so rows stay aligned */}
        <span className="h-6" />
      </div>
    );
  }

  // REST: notation only, empty lyric slot
  if (token.type === "REST") {
    return (
      <div className="inline-flex h-[4.5rem] flex-col items-center">
        <PlaygroundNotationToken token={token} theme={theme} activeNoteIndex={activeNoteIndex} voiceColor={voiceColor} />
        <span className="h-6" />
      </div>
    );
  }

  // BEAM / SLUR: render the container token on top, distribute lyrics to children
  if (token.type === "BEAM" || token.type === "SLUR") {
    const isDark = theme === "DARK";
    const beamTone = isDark ? "bg-cyan-100/85" : "bg-ink-950/80";
    const slurTone = isDark ? "border-cyan-100/70" : "border-ink-950/60";

    // Find first non-empty lyric in the slur's children cells (recursively resolving nested tokens)
    const leafSlotTokens = collectLyricSlotTokens(token.children);
    const lyric = leafSlotTokens
      .map((leaf) => cells.find((c) => c.notationToken?.index === leaf.index)?.lyric?.text)
      .find((text) => !!text);

    if (token.type === "BEAM") {
      const ownBeamLevel = Math.min(beamDepth + 1, 2);
      const beamTopClass = ownBeamLevel === 1 ? "top-0" : "top-[3px]";
      return (
        <div className="inline-flex h-[4.5rem] flex-col items-center">
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
                    className={`h-full flex items-center px-0.5 rounded transition-colors ${activeBgClass}`}
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
          {/* Lyric row — one slot per leaf child */}
          <span className="inline-flex gap-1">
            {collectLyricSlotTokens(token.children).map((leafChild, index) => {
              const cell = cells.find((c) => c.notationToken?.index === leafChild.index);
              const childLyric = cell?.lyric?.text ?? "";
              return (
                <span
                  key={index}
                  className={`inline-flex h-6 min-w-4 items-center justify-center text-sm font-semibold leading-none whitespace-nowrap ${lyricTone}`}
                >
                  {childLyric}
                </span>
              );
            })}
          </span>
        </div>
      );
    }

    // SLUR — one lyric slot for the entire slur (musically correct)
    return (
      <div className="inline-flex h-[4.5rem] flex-col items-center">
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
                  className={`h-full flex items-center px-0.5 rounded transition-colors ${activeBgClass}`}
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
        {/* Single lyric centered under the entire slur */}
        <span
          className={`inline-flex h-6 min-w-4 items-center justify-center text-sm font-semibold leading-none whitespace-nowrap ${lyricTone}`}
        >
          {lyric ?? ""}
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
    <div className={`inline-flex min-w-[1.75rem] h-[4.5rem] flex-col items-center px-0.5 rounded transition-colors ${activeBgClass}`}>
      <PlaygroundNotationToken
        token={token}
        theme={theme}
        beamDepth={beamDepth}
        activeNoteIndex={activeNoteIndex}
        voiceColor={voiceColor}
      />
      <span
        className={`inline-flex h-6 min-w-4 items-center justify-center text-sm font-semibold leading-none ${lyricTone} whitespace-nowrap`}
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
  tokensOverride?: NotationTokenValue[];
  theme?: "LIGHT" | "DARK";
  activeNoteIndex?: number | null;
  /** Whether the user has entered any lyric text at all */
  hasLyric?: boolean;
  voiceColor?: string;
};

export function PlaygroundNotationLine({
  alignment,
  tokensOverride,
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
  const lyricByTokenIndex = buildLyricByTokenIndex(alignment.cells);

  const tokensToRender = tokensOverride ?? alignment.notation.tokens;

  return (
    <div className="max-w-full pb-2">
      <div className="flex flex-nowrap items-start gap-x-1 gap-y-6 min-w-max">
        {tokensToRender.map((token, index) => {
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

// ─── Shared helpers for the cross-voice measure grid ─────────────────────────

/** notationToken.index → lyric text, from a resolved alignment. */
export function buildLyricByTokenIndex(
  cells: PlaygroundAlignmentCell[]
): Map<number, string> {
  const map = new Map<number, string>();
  for (const cell of cells) {
    if (cell.notationToken && cell.lyric) {
      map.set(cell.notationToken.index, cell.lyric.text);
    }
  }
  return map;
}

export type PlaygroundMeasureData = {
  /** Content tokens of the measure (bar tokens are stripped out). */
  tokens: NotationTokenValue[];
  /** Whether the measure ended with a double bar line. */
  double: boolean;
};

/**
 * Splits a voice's tokens into measures on BAR / DOUBLE_BAR boundaries.
 * The bar tokens themselves are removed — in the grid they are drawn as the
 * right border of each measure cell so they line up across voices.
 */
export function splitTokensIntoMeasures(
  tokens: NotationTokenValue[]
): PlaygroundMeasureData[] {
  const measures: PlaygroundMeasureData[] = [];
  let current: NotationTokenValue[] = [];

  for (const token of tokens) {
    if (token.type === "BAR" || token.type === "DOUBLE_BAR") {
      measures.push({ tokens: current, double: token.type === "DOUBLE_BAR" });
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length > 0) {
    measures.push({ tokens: current, double: false });
  }
  return measures;
}

/**
 * Renders the notes + lyrics of a SINGLE measure for one voice. Notes are
 * spread evenly (justify-around) so they fill the width of their grid cell,
 * giving the "auto-fit" behaviour. Every column uses the same fixed-height
 * bands as PlaygroundNotationLine, so baselines stay aligned.
 */
export function PlaygroundMeasure({
  tokens,
  cells,
  lyricByTokenIndex,
  hasLyric,
  theme = "LIGHT",
  activeNoteIndex = null,
  voiceColor,
}: {
  tokens: NotationTokenValue[];
  cells: PlaygroundAlignmentCell[];
  lyricByTokenIndex: Map<number, string>;
  hasLyric: boolean;
  theme?: "LIGHT" | "DARK";
  activeNoteIndex?: number | null;
  voiceColor?: string;
}) {
  const isDark = theme === "DARK";
  const lyricTone = isDark ? "text-zinc-300" : "text-ink-600";

  return (
    <div className="flex w-full items-start justify-around gap-x-1">
      {tokens.map((token, index) => {
        if (!hasLyric) {
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

        const lyric = lyricByTokenIndex.get(token.index) ?? null;
        return (
          <PlaygroundAlignedToken
            key={index}
            token={token}
            lyric={lyric}
            theme={theme}
            beamDepth={0}
            activeNoteIndex={activeNoteIndex}
            lyricTone={lyricTone}
            cells={cells}
            voiceColor={voiceColor}
          />
        );
      })}
    </div>
  );
}

import type { NotationToken as NotationTokenValue } from "@/lib/notation-parser";

type NotationTokenProps = {
  token: NotationTokenValue;
  theme?: "LIGHT" | "DARK";
  beamDepth?: number;
  activeNoteIndex?: number | null;
};

const notationArea = "relative inline-flex h-11 items-center justify-center";

export function NotationToken({
  token,
  theme = "LIGHT",
  beamDepth = 0,
  activeNoteIndex = null
}: NotationTokenProps) {
  const isDark = theme === "DARK";
  
  const isHighlighted = token.globalNoteIndex !== undefined && token.globalNoteIndex === activeNoteIndex;
  const activeColor = "text-emerald-500";
  
  const baseNoteTone = isDark ? "text-cyan-100" : "text-ink-950";
  const noteTone = isHighlighted ? `${activeColor} font-bold scale-110 transition-transform z-10` : baseNoteTone;
  
  const baseMutedTone = isDark ? "text-zinc-300" : "text-ink-500";
  const mutedTone = isHighlighted ? `${activeColor} font-bold scale-110 transition-transform z-10` : baseMutedTone;
  
  const beamTone = isDark ? "bg-cyan-100/85" : "bg-ink-950/80";
  const slurTone = isDark ? "border-cyan-100/70" : "border-ink-950/60";
  const barTone = isDark ? "bg-zinc-300/80" : "bg-ink-500/80";

  if (token.type === "BAR") {
    return (
      <span className={`${notationArea} w-2`}>
        <span aria-hidden="true" className={`block h-5 w-px ${barTone}`} />
      </span>
    );
  }

  if (token.type === "DOUBLE_BAR") {
    return (
      <span className={`${notationArea} w-3 gap-[3px]`}>
        <span aria-hidden="true" className={`block h-5 w-px ${barTone}`} />
        <span aria-hidden="true" className={`block h-5 w-[2px] ${barTone}`} />
      </span>
    );
  }

  if (token.type === "REST") {
    return <span className={`${notationArea} min-w-4 text-lg font-semibold leading-none ${mutedTone}`}>0</span>;
  }

  if (token.type === "EXTENSION") {
    const isExtHighlighted = token.globalNoteIndex !== undefined && token.globalNoteIndex === activeNoteIndex;
    const extTone = isExtHighlighted ? "bg-emerald-500 scale-125 transition-transform" : isDark ? "bg-zinc-100" : "bg-ink-700";

    return (
      <span className={`${notationArea} w-3`}>
        <span
          aria-hidden="true"
          className={`absolute top-[1.45rem] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${extTone}`}
        />
      </span>
    );
  }

  if (token.type === "SLUR") {
    return (
      <span className={`${notationArea} w-fit px-px`}>
        <span className="inline-flex h-full items-center gap-1">
          {token.children.map((child, index) => (
            <NotationToken key={`${token.raw}-${index}`} token={child} theme={theme} beamDepth={beamDepth} activeNoteIndex={activeNoteIndex} />
          ))}
        </span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-0 bottom-0.5 left-0 h-2 rounded-b-full border-r border-b-2 border-l ${slurTone}`}
        />
      </span>
    );
  }

  if (token.type === "BEAM") {
    const ownBeamLevel = Math.min(beamDepth + 1, 2);
    const beamTopClass = ownBeamLevel === 1 ? "top-1" : "top-[0.45rem]";

    return (
      <span className={`${notationArea} w-fit px-px`}>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute ${beamTopClass} left-0.5 right-0.5 h-0.5 rounded-full ${beamTone}`}
        />
        <span className="inline-flex h-full items-center gap-1">
          {token.children.map((child, index) => (
            <NotationToken key={`${token.raw}-${index}`} token={child} theme={theme} beamDepth={ownBeamLevel} activeNoteIndex={activeNoteIndex} />
          ))}
        </span>
      </span>
    );
  }

  const topDotClass = beamDepth > 0 ? "top-[0.75rem]" : "top-1.5";

  return (
    <span className={`${notationArea} min-w-4 px-0.5 text-lg font-semibold leading-none ${noteTone}`}>
      {token.octave > 0 ? (
        <span className={`pointer-events-none absolute ${topDotClass} left-1/2 flex -translate-x-1/2 gap-px`}>
          {Array.from({ length: token.octave }).map((_, index) => (
            <span key={`top-${index}`} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      ) : null}
      {token.octave < 0 ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-px">
          {Array.from({ length: Math.abs(token.octave) }).map((_, index) => (
            <span key={`bottom-${index}`} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      ) : null}

      <span className="relative translate-y-[1px]">
        <span>{token.degree}</span>
        {token.accidental === "#" ? (
          <span
            className="pointer-events-none absolute top-1/2 h-[1.5px] bg-current opacity-90"
            style={{ width: "140%", left: "-20%", transform: "translateY(-50%) rotate(-60deg)" }}
            aria-hidden="true"
          />
        ) : null}
        {token.accidental === "b" ? (
          <span
            className="pointer-events-none absolute top-1/2 h-[1.5px] bg-current opacity-90"
            style={{ width: "140%", left: "-20%", transform: "translateY(-50%) rotate(60deg)" }}
            aria-hidden="true"
          />
        ) : null}
      </span>

      {token.shortDurationLevel > 0 ? (
        <span className="pointer-events-none absolute top-[0.6rem] right-0 flex flex-col gap-0.5" aria-hidden="true">
          {Array.from({ length: token.shortDurationLevel }).map((_, index) => (
            <span
              key={`duration-${index}`}
              className="block h-0.5 w-1.5 origin-right rotate-[-30deg] rounded-full bg-current"
            />
          ))}
        </span>
      ) : null}

      {token.holdCount > 0 ? (
        <span className="pointer-events-none absolute -right-2 top-1/2 flex -translate-y-1/2 gap-0.5" aria-hidden="true">
          {Array.from({ length: token.holdCount }).map((_, index) => (
            <span key={`hold-${index}`} className="block h-0.5 w-1.5 rounded-full bg-current" />
          ))}
        </span>
      ) : null}
    </span>
  );
}

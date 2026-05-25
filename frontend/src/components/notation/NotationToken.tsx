import type { NotationToken as NotationTokenValue } from "@/lib/notation-parser";

type NotationTokenProps = {
  token: NotationTokenValue;
  theme?: "LIGHT" | "DARK";
};

export function NotationToken({ token, theme = "LIGHT" }: NotationTokenProps) {
  const isDark = theme === "DARK";
  const noteTone = isDark ? "text-cyan-100" : "text-ink-950";
  const mutedTone = isDark ? "text-zinc-400" : "text-ink-400";
  const slurTone = isDark ? "border-cyan-100/70" : "border-ink-950/60";
  const beamTone = isDark ? "bg-cyan-100/85" : "bg-ink-950/80";

  if (token.type === "BAR") {
    return <span className={`mx-1 inline-block h-10 w-px self-center bg-current/40 ${mutedTone}`} aria-label="Bar line" />;
  }

  if (token.type === "REST") {
    return <span className={`inline-flex min-w-6 justify-center text-lg font-semibold ${mutedTone}`}>0</span>;
  }

  if (token.type === "SLUR") {
    return (
      <span className="relative inline-flex px-0.5 pt-1 pb-3">
        <span className="inline-flex items-end gap-1">
          {token.children.map((child, index) => (
            <NotationToken key={`${token.raw}-${index}`} token={child} theme={theme} />
          ))}
        </span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-0.5 bottom-0.5 left-0.5 h-2 rounded-b-full border-b-2 border-r border-l ${slurTone}`}
        />
      </span>
    );
  }

  if (token.type === "BEAM") {
    return (
      <span className="relative inline-flex px-0.5 pt-3 pb-1">
        <span aria-hidden="true" className={`pointer-events-none absolute top-1 left-1 right-1 h-0.5 rounded-full ${beamTone}`} />
        <span className="inline-flex items-end gap-1">
          {token.children.map((child, index) => (
            <NotationToken key={`${token.raw}-${index}`} token={child} theme={theme} />
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className={`relative inline-flex min-w-6 items-center justify-center px-0.5 pt-1 pb-1 text-lg font-semibold ${noteTone}`}>
      {token.octave > 0 ? (
        <span className="pointer-events-none absolute top-0 left-1/2 flex -translate-x-1/2 gap-px">
          {Array.from({ length: token.octave }).map((_, index) => (
            <span key={`top-${index}`} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      ) : null}
      {token.octave < 0 ? (
        <span className="pointer-events-none absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-px">
          {Array.from({ length: Math.abs(token.octave) }).map((_, index) => (
            <span key={`bottom-${index}`} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      ) : null}

      <span>{token.degree}</span>

      {token.shortDurationLevel > 0 ? (
        <span className="pointer-events-none absolute right-0 top-1 flex flex-col gap-0.5" aria-hidden="true">
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

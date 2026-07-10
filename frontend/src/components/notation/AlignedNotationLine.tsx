import { alignNotationAndLyric, type AlignmentCell } from "@/lib/alignment";
import { NotationLine } from "@/components/notation/NotationLine";
import { NotationToken } from "@/components/notation/NotationToken";
import type { NotationBeamToken, NotationSlurToken, NotationToken as NotationTokenValue } from "@/lib/notation-parser";

type AlignedNotationLineProps = {
  notation: string | null | undefined;
  lyric: string | null | undefined;
  theme?: "LIGHT" | "DARK";
  activeNoteIndex?: number | null;
  startNoteIndex?: number;
};

export function AlignedNotationLine({
  notation,
  lyric,
  theme = "LIGHT",
  activeNoteIndex = null,
  startNoteIndex = 0
}: AlignedNotationLineProps) {
  const alignment = useMemo(() => {
    const result = alignNotationAndLyric(notation ?? "", lyric ?? "");
    if (result.status !== "PARSER_ERROR") {
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
      assignGlobalIndex(result.notation.tokens);
    }
    return result;
  }, [notation, lyric, startNoteIndex]);

  const isDark = theme === "DARK";
  const lyricTone = isDark ? "text-zinc-50" : "text-ink-800";
  const subtleTone = isDark ? "text-zinc-400" : "text-ink-400";

  if ((notation?.trim() ?? "").length === 0) {
    return hasText(lyric) ? (
      <p className={`whitespace-pre-wrap break-words text-lg leading-7 [overflow-wrap:anywhere] ${lyricTone}`}>
        {lyric?.trim()}
      </p>
    ) : null;
  }

  if (alignment.status === "PARSER_ERROR") {
    return (
      <div className="space-y-1">
        <NotationLine notation={notation} theme={theme} />
        {hasText(lyric) ? (
          <p className={`whitespace-pre-wrap break-words text-lg leading-7 [overflow-wrap:anywhere] ${lyricTone}`}>
            {lyric?.trim()}
          </p>
        ) : null}
        <p className={`text-xs ${subtleTone}`}>
          Parsed preview unavailable: {alignment.notation.issues[0]?.message ?? "Notation parser error"}
        </p>
      </div>
    );
  }

  const cellMap = new Map<NotationTokenValue, AlignmentCell>();
  for (const cell of alignment.cells) {
    if (cell.notationToken) {
      cellMap.set(cell.notationToken, cell);
    }
  }

  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
        {alignment.notation.tokens.map((token, index) => (
          <TopLevelToken
            key={`${token.raw}-${index}`}
            token={token}
            theme={theme}
            lyricTone={lyricTone}
            cellMap={cellMap}
            activeNoteIndex={activeNoteIndex}
          />
        ))}
      </div>
    </div>
  );
}

function TopLevelToken({
  token,
  theme,
  lyricTone,
  cellMap,
  activeNoteIndex
}: {
  token: NotationTokenValue;
  theme: "LIGHT" | "DARK";
  lyricTone: string;
  cellMap: Map<NotationTokenValue, AlignmentCell>;
  activeNoteIndex: number | null;
}) {
  if (token.type === "BEAM") {
    return (
      <div className="flex flex-col items-start gap-1">
        <NotationToken token={token} theme={theme} activeNoteIndex={activeNoteIndex} />
        <BeamLyricTrack token={token} lyricTone={lyricTone} cellMap={cellMap} activeNoteIndex={activeNoteIndex} theme={theme} />
      </div>
    );
  }

  if (token.type === "SLUR") {
    const cell = cellMap.get(token);
    const lyric = cell?.lyric ?? null;

    return (
      <div className="flex flex-col items-start gap-1">
        <NotationToken token={token} theme={theme} activeNoteIndex={activeNoteIndex} />
        <SlurLyricTrack token={token} lyric={lyric?.text ?? ""} lyricTone={lyricTone} anchorToken={cell?.anchorToken ?? null} activeNoteIndex={activeNoteIndex} theme={theme} />
      </div>
    );
  }

  const cell = cellMap.get(token);
  const lyric = cell?.lyric ?? null;

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <NotationToken token={token} theme={theme} activeNoteIndex={activeNoteIndex} />
      {lyric ? <LyricSpan text={lyric.text} tone={lyricTone} /> : null}
    </div>
  );
}

function BeamLyricTrack({
  token,
  lyricTone,
  cellMap,
  activeNoteIndex,
  theme
}: {
  token: NotationBeamToken;
  lyricTone: string;
  cellMap: Map<NotationTokenValue, AlignmentCell>;
  activeNoteIndex: number | null;
  theme: "LIGHT" | "DARK";
}) {
  return (
    <div className="inline-flex items-start gap-1">
      {token.children.map((child, index) => (
        <LyricTrackToken
          key={`${token.raw}-${index}`}
          token={child}
          lyricTone={lyricTone}
          cellMap={cellMap}
          activeNoteIndex={activeNoteIndex}
          theme={theme}
        />
      ))}
    </div>
  );
}

function LyricTrackToken({
  token,
  lyricTone,
  cellMap,
  activeNoteIndex,
  theme
}: {
  token: NotationTokenValue;
  lyricTone: string;
  cellMap: Map<NotationTokenValue, AlignmentCell>;
  activeNoteIndex: number | null;
  theme: "LIGHT" | "DARK";
}) {
  if (token.type === "BEAM") {
    return <BeamLyricTrack token={token} lyricTone={lyricTone} cellMap={cellMap} activeNoteIndex={activeNoteIndex} theme={theme} />;
  }

  if (token.type === "SLUR") {
    const cell = cellMap.get(token);
    const lyric = cell?.lyric ?? null;

    return <SlurLyricTrack token={token} lyric={lyric?.text ?? ""} lyricTone={lyricTone} anchorToken={cell?.anchorToken ?? null} activeNoteIndex={activeNoteIndex} theme={theme} />;
  }

  if (token.type === "NOTE") {
    const cell = cellMap.get(token);
    const lyric = cell?.lyric ?? null;

    if (lyric) {
      return <LyricSpan text={lyric.text} tone={lyricTone} />;
    }
  }

  return <PlaceholderTrack token={token} />;
}

function SlurLyricTrack({
  token,
  lyric,
  lyricTone,
  anchorToken,
  activeNoteIndex,
  theme
}: {
  token: NotationSlurToken;
  lyric: string;
  lyricTone: string;
  anchorToken: NotationTokenValue | null;
  activeNoteIndex: number | null;
  theme: "LIGHT" | "DARK";
}) {
  return (
    <div className="inline-flex items-start gap-1">
      {token.children.map((child, index) => (
        <SlurAnchorToken
          key={`${token.raw}-${index}`}
          token={child}
          lyric={lyric}
          lyricTone={lyricTone}
          anchorToken={anchorToken}
          activeNoteIndex={activeNoteIndex}
          theme={theme}
        />
      ))}
    </div>
  );
}

function SlurAnchorToken({
  token,
  lyric,
  lyricTone,
  anchorToken,
  activeNoteIndex,
  theme
}: {
  token: NotationTokenValue;
  lyric: string;
  lyricTone: string;
  anchorToken: NotationTokenValue | null;
  activeNoteIndex: number | null;
  theme: "LIGHT" | "DARK";
}) {
  if (token.type === "NOTE") {
    if (token === anchorToken) {
      return <LyricSpan text={lyric} tone={lyricTone} />;
    }

    return <PlaceholderTrack token={token} />;
  }

  if (token.type === "SLUR") {
    return (
      <div className="inline-flex items-start gap-1">
        {token.children.map((child, index) => (
          <SlurAnchorToken
            key={`${token.raw}-${index}`}
            token={child}
            lyric={lyric}
            lyricTone={lyricTone}
            anchorToken={anchorToken}
            activeNoteIndex={activeNoteIndex}
            theme={theme}
          />
        ))}
      </div>
    );
  }

  if (token.type === "BEAM") {
    return (
      <div className="inline-flex items-start gap-1">
        {token.children.map((child, index) => (
          <SlurAnchorToken
            key={`${token.raw}-${index}`}
            token={child}
            lyric={lyric}
            lyricTone={lyricTone}
            anchorToken={anchorToken}
            activeNoteIndex={activeNoteIndex}
            theme={theme}
          />
        ))}
      </div>
    );
  }

  return <PlaceholderTrack token={token} />;
}

function LyricSpan({ text, tone }: { text: string; tone: string }) {
  return (
    <span className={`inline-flex min-w-4 justify-center text-center text-base leading-5 whitespace-nowrap ${tone}`}>
      {text}
    </span>
  );
}

function PlaceholderTrack({ token }: { token: NotationTokenValue }) {
  if (token.type === "BAR") {
    return <span className="inline-flex w-2" aria-hidden="true" />;
  }

  if (token.type === "EXTENSION") {
    return <span className="inline-flex w-3" aria-hidden="true" />;
  }

  return <span className="inline-flex min-w-4" aria-hidden="true" />;
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim().length > 0;
}

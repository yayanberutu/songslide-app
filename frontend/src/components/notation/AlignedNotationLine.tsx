import { alignNotationAndLyric, type AlignmentCell } from "@/lib/alignment";
import { NotationLine } from "@/components/notation/NotationLine";
import { NotationToken } from "@/components/notation/NotationToken";
import type { NotationBeamToken, NotationSlurToken, NotationToken as NotationTokenValue } from "@/lib/notation-parser";

type AlignedNotationLineProps = {
  notation: string | null | undefined;
  lyric: string | null | undefined;
  theme?: "LIGHT" | "DARK";
};

type SlotCursor = {
  index: number;
};

type AnchorState = {
  placed: boolean;
};

export function AlignedNotationLine({
  notation,
  lyric,
  theme = "LIGHT"
}: AlignedNotationLineProps) {
  const alignment = alignNotationAndLyric(notation, lyric);
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
}: {
  token: NotationTokenValue;
  theme: "LIGHT" | "DARK";
  lyricTone: string;
  cellMap: Map<NotationTokenValue, AlignmentCell>;
}) {
  if (token.type === "BEAM") {
    return (
      <div className="flex flex-col items-start gap-1">
        <NotationToken token={token} theme={theme} />
        <BeamLyricTrack token={token} lyricTone={lyricTone} cellMap={cellMap} />
      </div>
    );
  }

  if (token.type === "SLUR") {
    const cell = cellMap.get(token);
    const lyric = cell?.lyric ?? null;

    return (
      <div className="flex flex-col items-start gap-1">
        <NotationToken token={token} theme={theme} />
        <SlurLyricTrack token={token} lyric={lyric?.text ?? ""} lyricTone={lyricTone} />
      </div>
    );
  }

  const cell = cellMap.get(token);
  const lyric = token.lyricSlots > 0 ? cell?.lyric ?? null : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <NotationToken token={token} theme={theme} />
      {token.lyricSlots > 0 ? (
        <LyricSpan text={lyric?.text ?? ""} tone={lyricTone} />
      ) : null}
    </div>
  );
}

function BeamLyricTrack({
  token,
  lyricTone,
  cellMap,
}: {
  token: NotationBeamToken;
  lyricTone: string;
  cellMap: Map<NotationTokenValue, AlignmentCell>;
}) {
  return (
    <div className="inline-flex items-start gap-1">
      {token.children.map((child, index) => (
        <LyricTrackToken
          key={`${token.raw}-${index}`}
          token={child}
          lyricTone={lyricTone}
          cellMap={cellMap}
        />
      ))}
    </div>
  );
}

function LyricTrackToken({
  token,
  lyricTone,
  cellMap,
}: {
  token: NotationTokenValue;
  lyricTone: string;
  cellMap: Map<NotationTokenValue, AlignmentCell>;
}) {
  if (token.type === "BEAM") {
    return <BeamLyricTrack token={token} lyricTone={lyricTone} cellMap={cellMap} />;
  }

  if (token.type === "SLUR") {
    const cell = cellMap.get(token);
    const lyric = cell?.lyric ?? null;

    return <SlurLyricTrack token={token} lyric={lyric?.text ?? ""} lyricTone={lyricTone} />;
  }

  if (token.type === "NOTE") {
    const cell = cellMap.get(token);
    const lyric = cell?.lyric ?? null;

    return <LyricSpan text={lyric?.text ?? ""} tone={lyricTone} />;
  }

  return <PlaceholderTrack token={token} />;
}

function SlurLyricTrack({
  token,
  lyric,
  lyricTone
}: {
  token: NotationSlurToken;
  lyric: string;
  lyricTone: string;
}) {
  const anchorState = { placed: false };

  return (
    <div className="inline-flex items-start gap-1">
      {token.children.map((child, index) => (
        <SlurAnchorToken
          key={`${token.raw}-${index}`}
          token={child}
          lyric={lyric}
          lyricTone={lyricTone}
          anchorState={anchorState}
        />
      ))}
    </div>
  );
}

function SlurAnchorToken({
  token,
  lyric,
  lyricTone,
  anchorState
}: {
  token: NotationTokenValue;
  lyric: string;
  lyricTone: string;
  anchorState: AnchorState;
}) {
  if (token.type === "NOTE") {
    if (!anchorState.placed) {
      anchorState.placed = true;
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
            anchorState={anchorState}
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
            anchorState={anchorState}
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

import { alignNotationAndLyric, type AlignmentCell } from "@/lib/alignment";
import { NotationLine } from "@/components/notation/NotationLine";
import { NotationToken } from "@/components/notation/NotationToken";
import type { NotationBeamToken, NotationToken as NotationTokenValue } from "@/lib/notation-parser";

type AlignedNotationLineProps = {
  notation: string | null | undefined;
  lyric: string | null | undefined;
  theme?: "LIGHT" | "DARK";
};

type SlotCursor = {
  index: number;
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

  const slotCursor = { index: 0 };

  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
        {alignment.notation.tokens.map((token, index) => (
          <TopLevelToken
            key={`${token.raw}-${index}`}
            token={token}
            theme={theme}
            lyricTone={lyricTone}
            cells={alignment.cells}
            slotCursor={slotCursor}
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
  cells,
  slotCursor
}: {
  token: NotationTokenValue;
  theme: "LIGHT" | "DARK";
  lyricTone: string;
  cells: AlignmentCell[];
  slotCursor: SlotCursor;
}) {
  if (token.type === "BEAM") {
    return (
      <div className="flex flex-col items-center gap-1">
        <NotationToken token={token} theme={theme} />
        <BeamLyricTrack token={token} lyricTone={lyricTone} cells={cells} slotCursor={slotCursor} />
      </div>
    );
  }

  const lyric = token.lyricSlots > 0 ? cells[slotCursor.index]?.lyric ?? null : null;
  if (token.lyricSlots > 0) {
    slotCursor.index += 1;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <NotationToken token={token} theme={theme} />
      {token.lyricSlots > 0 ? (
        <span className={`max-w-[2.6rem] text-center text-base leading-5 [overflow-wrap:anywhere] ${lyricTone}`}>
          {lyric?.text ?? ""}
        </span>
      ) : null}
    </div>
  );
}

function BeamLyricTrack({
  token,
  lyricTone,
  cells,
  slotCursor
}: {
  token: NotationBeamToken;
  lyricTone: string;
  cells: AlignmentCell[];
  slotCursor: SlotCursor;
}) {
  return (
    <div className="inline-flex items-start gap-1">
      {token.children.map((child, index) => (
        <LyricTrackToken
          key={`${token.raw}-${index}`}
          token={child}
          lyricTone={lyricTone}
          cells={cells}
          slotCursor={slotCursor}
        />
      ))}
    </div>
  );
}

function LyricTrackToken({
  token,
  lyricTone,
  cells,
  slotCursor
}: {
  token: NotationTokenValue;
  lyricTone: string;
  cells: AlignmentCell[];
  slotCursor: SlotCursor;
}) {
  if (token.type === "BEAM") {
    return <BeamLyricTrack token={token} lyricTone={lyricTone} cells={cells} slotCursor={slotCursor} />;
  }

  if (token.type === "SLUR" || token.type === "NOTE") {
    const lyric = cells[slotCursor.index]?.lyric ?? null;
    slotCursor.index += 1;

    return (
      <span className={`inline-flex min-w-4 max-w-[2.4rem] justify-center text-center text-base leading-5 [overflow-wrap:anywhere] ${lyricTone}`}>
        {lyric?.text ?? ""}
      </span>
    );
  }

  if (token.type === "EXTENSION") {
    return <span className="inline-flex w-3" aria-hidden="true" />;
  }

  return <span className="inline-flex min-w-4" aria-hidden="true" />;
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim().length > 0;
}

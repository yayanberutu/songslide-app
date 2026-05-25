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
  const beamTone = isDark ? "bg-cyan-100/85" : "bg-ink-950/80";

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
      <div className="flex flex-wrap items-end gap-x-2 gap-y-3">
        {alignment.notation.tokens.map((token, index) => (
          <AlignedToken
            key={`${token.raw}-${index}`}
            token={token}
            theme={theme}
            lyricTone={lyricTone}
            beamTone={beamTone}
            cells={alignment.cells}
            slotCursor={slotCursor}
          />
        ))}
      </div>
    </div>
  );
}

function AlignedToken({
  token,
  theme,
  lyricTone,
  beamTone,
  cells,
  slotCursor
}: {
  token: NotationTokenValue;
  theme: "LIGHT" | "DARK";
  lyricTone: string;
  beamTone: string;
  cells: AlignmentCell[];
  slotCursor: SlotCursor;
}) {
  if (token.type === "BAR" || token.type === "REST") {
    return (
      <div className="flex min-h-[3.5rem] items-start">
        <NotationToken token={token} theme={theme} />
      </div>
    );
  }

  if (token.type === "BEAM") {
    return (
      <BeamToken
        token={token}
        theme={theme}
        lyricTone={lyricTone}
        beamTone={beamTone}
        cells={cells}
        slotCursor={slotCursor}
      />
    );
  }

  const lyric = cells[slotCursor.index]?.lyric;
  slotCursor.index += 1;

  return (
    <div className="flex min-w-[2.1rem] flex-col items-center gap-1">
      <NotationToken token={token} theme={theme} />
      <span className={`text-base leading-5 ${lyricTone}`}>
        {lyric?.text ?? ""}
      </span>
    </div>
  );
}

function BeamToken({
  token,
  theme,
  lyricTone,
  beamTone,
  cells,
  slotCursor
}: {
  token: NotationBeamToken;
  theme: "LIGHT" | "DARK";
  lyricTone: string;
  beamTone: string;
  cells: AlignmentCell[];
  slotCursor: SlotCursor;
}) {
  return (
    <div className="relative inline-flex px-0.5 pt-3 pb-1">
      <span aria-hidden="true" className={`pointer-events-none absolute top-1 left-1 right-1 h-0.5 rounded-full ${beamTone}`} />
      <div className="inline-flex items-end gap-1">
        {token.children.map((child, index) => (
          <AlignedToken
            key={`${token.raw}-${index}`}
            token={child}
            theme={theme}
            lyricTone={lyricTone}
            beamTone={beamTone}
            cells={cells}
            slotCursor={slotCursor}
          />
        ))}
      </div>
    </div>
  );
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim().length > 0;
}

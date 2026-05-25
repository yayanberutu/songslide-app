import { alignNotationAndLyric } from "@/lib/alignment";
import { NotationLine } from "@/components/notation/NotationLine";
import { NotationToken } from "@/components/notation/NotationToken";

type AlignedNotationLineProps = {
  notation: string | null | undefined;
  lyric: string | null | undefined;
  theme?: "LIGHT" | "DARK";
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

  let slotIndex = 0;

  return (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-3">
      {alignment.notation.tokens.map((token, index) => {
        if (token.lyricSlots === 0) {
          return (
            <div key={`${token.raw}-${index}`} className="flex min-h-[3.75rem] items-start">
              <NotationToken token={token} theme={theme} />
            </div>
          );
        }

        const cell = alignment.cells[slotIndex];
        slotIndex += 1;

        return (
          <div key={`${token.raw}-${index}`} className="flex min-w-[2.75rem] flex-col items-center gap-1">
            <NotationToken token={token} theme={theme} />
            <span className={`text-base leading-5 ${lyricTone}`}>
              {cell?.lyric?.text ?? ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim().length > 0;
}

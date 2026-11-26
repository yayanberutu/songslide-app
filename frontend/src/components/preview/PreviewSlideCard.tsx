import { AlignedNotationLine } from "@/components/notation/AlignedNotationLine";
import { NotationLine } from "@/components/notation/NotationLine";
import { hasText, type PreviewSlide } from "@/lib/arrangement-preview-builder";

export type PreviewTheme = "LIGHT" | "DARK";

export type PreviewSlideCardProps = {
  slide: PreviewSlide;
  slideNumber: number;
  totalSlides: number;
  theme?: PreviewTheme;
  showNotation?: boolean;
  activeNoteIndex?: number | null;
  className?: string;
};

export function PreviewSlideCard({
  slide,
  slideNumber,
  totalSlides,
  theme = "LIGHT",
  showNotation = true,
  activeNoteIndex = null,
  className
}: PreviewSlideCardProps) {
  const isDark = theme === "DARK";
  const visibleLines = slide.lines.filter(
    (line) => (showNotation && hasText(line.notation)) || hasText(line.lyric)
  );

  return (
    <article
      className={[
        "aspect-video min-h-[320px] overflow-hidden rounded-md border p-5 shadow-sm",
        isDark ? "border-zinc-700 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-ink-950",
        className ?? ""
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4 border-b border-current/15 pb-3">
        <div className="min-w-0">
          <p className={["truncate text-sm font-semibold", isDark ? "text-zinc-100" : "text-ink-950"].join(" ")}>
            {slide.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">{slide.subtitle}</h2>
          {slide.metadata ? (
            <p className={["mt-1 text-sm", isDark ? "text-zinc-300" : "text-ink-500"].join(" ")}>
              {slide.metadata}
            </p>
          ) : null}
        </div>
        <p className={["shrink-0 text-xs font-medium", isDark ? "text-zinc-400" : "text-ink-500"].join(" ")}>
          {slideNumber}/{totalSlides}
        </p>
      </div>

      <div className="mt-5 max-h-[calc(100%-5.5rem)] space-y-4 overflow-y-auto pr-2">
        {visibleLines.length === 0 ? (
          <p className={["text-sm", isDark ? "text-zinc-400" : "text-ink-500"].join(" ")}>No visible lines.</p>
        ) : (
          visibleLines.map((line, index) => (
            <div key={`${slide.key}-line-${index}`} className="space-y-1">
              {showNotation && hasText(line.notation) && hasText(line.lyric) ? (
                <AlignedNotationLine
                  notation={line.notation}
                  lyric={line.lyric}
                  theme={theme}
                  activeNoteIndex={activeNoteIndex}
                  startNoteIndex={line.startNoteIndex}
                />
              ) : null}
              {showNotation && hasText(line.notation) && !hasText(line.lyric) ? (
                <NotationLine
                  notation={line.notation}
                  theme={theme}
                  activeNoteIndex={activeNoteIndex}
                  startNoteIndex={line.startNoteIndex}
                />
              ) : null}
              {(!showNotation || !hasText(line.notation)) && hasText(line.lyric) ? (
                <p
                  className={[
                    "whitespace-pre-wrap break-words text-lg leading-7 [overflow-wrap:anywhere]",
                    isDark ? "text-zinc-50" : "text-ink-800"
                  ].join(" ")}
                >
                  {line.lyric}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </article>
  );
}

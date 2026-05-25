import { parseNotationLine } from "@/lib/notation-parser";
import { NotationToken } from "@/components/notation/NotationToken";

type NotationLineProps = {
  notation: string | null | undefined;
  theme?: "LIGHT" | "DARK";
};

export function NotationLine({ notation, theme = "LIGHT" }: NotationLineProps) {
  const result = parseNotationLine(notation);
  const rawText = notation?.trim() ?? "";
  const isDark = theme === "DARK";

  if (rawText.length === 0) {
    return null;
  }

  if (result.issues.length > 0) {
    return (
      <p className={`break-all font-mono text-lg leading-7 ${isDark ? "text-cyan-100" : "text-ink-950"}`}>
        {rawText}
      </p>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="flex flex-wrap items-end gap-x-1 gap-y-2">
        {result.tokens.map((token, index) => (
          <NotationToken key={`${token.raw}-${index}`} token={token} theme={theme} />
        ))}
      </div>
    </div>
  );
}

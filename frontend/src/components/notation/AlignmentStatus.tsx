import { alignNotationAndLyric, type AlignmentStatus as AlignmentState } from "@/lib/alignment";

type AlignmentStatusProps = {
  notation: string | null | undefined;
  lyric: string | null | undefined;
};

const statusStyles: Record<AlignmentState, string> = {
  MATCH: "border-emerald-200 bg-emerald-50 text-emerald-700",
  TOO_MANY_LYRICS: "border-amber-200 bg-amber-50 text-amber-700",
  TOO_FEW_LYRICS: "border-amber-200 bg-amber-50 text-amber-700",
  PARSER_ERROR: "border-red-200 bg-red-50 text-red-700"
};

export function AlignmentStatus({ notation, lyric }: AlignmentStatusProps) {
  const alignment = alignNotationAndLyric(notation, lyric);
  const issues = alignment.notation.issues;

  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${statusStyles[alignment.status]}`}>
      <p className="font-semibold">{statusLabel(alignment.status)}</p>
      <p className="mt-1">
        Notation slots: {alignment.notationSlotCount} | Lyric syllables: {alignment.lyricCount}
      </p>
      {issues.length > 0 ? (
        <div className="mt-1 space-y-1">
          {issues.map((issue) => (
            <p key={`${issue.index}-${issue.raw}`}>{issue.message}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function statusLabel(status: AlignmentState) {
  switch (status) {
    case "MATCH":
      return "Alignment match";
    case "TOO_MANY_LYRICS":
      return "Too many lyric syllables";
    case "TOO_FEW_LYRICS":
      return "Too few lyric syllables";
    case "PARSER_ERROR":
      return "Notation parser warning";
    default:
      return "Alignment status";
  }
}

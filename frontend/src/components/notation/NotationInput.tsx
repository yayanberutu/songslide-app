import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type KeyboardEvent
} from "react";
import { Button } from "@/components/ui";
import {
  autoPair,
  backspaceJoin,
  insertAtCursor,
  skipOver
} from "@/lib/notation-input-helpers";
import {
  buildHighlightSegments,
  type HighlightSegmentType
} from "@/lib/notation-highlight";
import { parseNotationLine } from "@/lib/notation-parser";

export type NotationInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isNotationReadOnly?: boolean;
  className?: string;
  id?: string;
};

const TOOLBAR_TOKENS = [
  { label: "[ ]", token: "[ ]", title: "Beam group [ ]" },
  { label: "( )", token: "( )", title: "Slur group ( )" },
  { label: "'", token: "'", title: "Octave up '" },
  { label: ",", token: ",", title: "Octave down ," },
  { label: "0", token: "0", title: "Rest 0" },
  { label: "^", token: "^", title: "Fermata ^" },
  { label: "|", token: "|", title: "Bar line |" },
  { label: "||", token: "||", title: "Double bar line ||" }
];

function getSegmentClassName(type: HighlightSegmentType): string {
  switch (type) {
    case "note":
      return "text-blue-700 font-semibold";
    case "rest":
      return "text-zinc-600 font-semibold";
    case "bar":
      return "text-amber-700 font-bold";
    case "beam":
      return "text-purple-600 font-bold";
    case "slur":
      return "text-emerald-600 font-bold";
    case "extension":
      return "text-indigo-600 font-bold";
    case "fermata":
      return "text-teal-600 font-bold";
    case "invalid":
      return "text-red-600 bg-red-100 underline decoration-wavy decoration-red-500 font-semibold";
    case "text":
    default:
      return "text-ink-950";
  }
}

function NotationInputComponent({
  value,
  onChange,
  placeholder,
  disabled,
  isNotationReadOnly,
  className = "",
  id
}: NotationInputProps) {
  const isReadOnly = Boolean(disabled || isNotationReadOnly);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const segments = useMemo(() => buildHighlightSegments(value ?? ""), [value]);
  const parsed = useMemo(() => parseNotationLine(value ?? ""), [value]);
  const leadingWs = useMemo(() => {
    const str = value ?? "";
    return str.length - str.trimStart().length;
  }, [value]);
  const issues = useMemo(
    () => parsed.issues.map((issue) => ({ ...issue, index: issue.index + leadingWs })),
    [parsed.issues, leadingWs]
  );

  // Restore cursor position after programmatic changes
  useLayoutEffect(() => {
    if (pendingSelectionRef.current && textareaRef.current) {
      const { start, end } = pendingSelectionRef.current;
      textareaRef.current.setSelectionRange(start, end);
      pendingSelectionRef.current = null;
    }
  }, [value]);

  // Auto-resize textarea height to prevent inner vertical scroll
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(38, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  const handleScroll = () => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    // Disallow newlines in notation lines
    const sanitized = e.target.value.replace(/[\r\n]+/g, " ");
    onChange(sanitized);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 1. Auto-pairing '[' or '('
    if (e.key === "[" || e.key === "(") {
      const paired = autoPair(value, start, end, e.key);
      if (paired) {
        e.preventDefault();
        pendingSelectionRef.current = {
          start: paired.selectionStart,
          end: paired.selectionEnd
        };
        onChange(paired.value);
        return;
      }
    }

    // 2. Skip-over ']' or ')'
    if (e.key === "]" || e.key === ")") {
      const skipped = skipOver(value, start, end, e.key);
      if (skipped) {
        e.preventDefault();
        textarea.setSelectionRange(skipped.selectionStart, skipped.selectionEnd);
        return;
      }
    }

    // 3. Backspace-join empty pair '[]' or '()'
    if (e.key === "Backspace") {
      const joined = backspaceJoin(value, start, end);
      if (joined) {
        e.preventDefault();
        pendingSelectionRef.current = {
          start: joined.selectionStart,
          end: joined.selectionEnd
        };
        onChange(joined.value);
        return;
      }
    }
  };

  const handleToolbarInsert = (token: string) => {
    const textarea = textareaRef.current;
    const start = textarea ? textarea.selectionStart : value.length;
    const end = textarea ? textarea.selectionEnd : value.length;

    const result = insertAtCursor(value, start, end, token);
    pendingSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd
    };
    onChange(result.value);
    if (textarea) {
      textarea.focus();
    }
  };

  const hasIssues = issues.length > 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {TOOLBAR_TOKENS.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="secondary"
              title={item.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleToolbarInsert(item.token)}
              className="px-2.5 py-0.5 text-xs font-mono font-semibold h-7 leading-none"
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}

      <div
        className={`relative rounded-md border shadow-sm transition-colors ${
          isReadOnly
            ? "border-zinc-200 bg-zinc-50"
            : hasIssues
            ? "border-red-300 bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
            : "border-zinc-300 bg-white focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200"
        }`}
      >
        {/* Syntax highlight overlay */}
        <pre
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden px-3 py-2 font-mono text-sm leading-6 whitespace-pre-wrap break-words border-0 bg-transparent select-none"
        >
          {segments.length > 0 ? (
            segments.map((seg, idx) => (
              <span key={idx} className={getSegmentClassName(seg.type)}>
                {seg.text}
              </span>
            ))
          ) : (
            // Empty placeholder spacer so heights match
            <span>&nbsp;</span>
          )}
        </pre>

        {/* Real transparent textarea */}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          disabled={isReadOnly}
          rows={1}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="relative block w-full resize-none border-0 bg-transparent px-3 py-2 font-mono text-sm leading-6 text-transparent caret-ink-950 focus:outline-none whitespace-pre-wrap break-words disabled:cursor-not-allowed placeholder:font-mono placeholder:text-zinc-400 selection:bg-indigo-500/25 selection:text-transparent"
        />
      </div>

      {/* Live validation issues indicator */}
      {hasIssues && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-red-600" role="alert">
          {issues.map((issue, idx) => (
            <span key={`${issue.index}-${idx}`} className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              <span>
                Pos {issue.index + 1}: {issue.message}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export const NotationInput = memo(NotationInputComponent);

"use client";

import { forwardRef, useState } from "react";
import { Button } from "@/components/ui";
import { NOTATION_CHEAT_SHEET } from "@/lib/notation-syntax-reference";

export type NotationCheatSheetProps = {
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
  id?: string;
};

export const NotationCheatSheet = forwardRef<HTMLElement, NotationCheatSheetProps>(
  function NotationCheatSheet(
    { isOpen: controlledIsOpen, onToggle, className = "", id = "notation-cheat-sheet" },
    ref
  ) {
    const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

    const handleToggle = () => {
      if (isControlled) {
        onToggle?.();
      } else {
        setUncontrolledIsOpen((prev) => !prev);
      }
    };

    return (
      <article
        ref={ref}
        id={id}
        className={`rounded-md border border-zinc-200 bg-white p-4 ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink-950">Panduan Notasi (Cheat Sheet)</h2>
            <p className="mt-1 text-xs text-ink-500">
              {isOpen ? "Daftar simbol dan contoh syntax notasi angka" : "Referensi token & format notasi angka"}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleToggle}
            aria-expanded={isOpen}
            aria-controls={`${id}-content`}
            aria-label={isOpen ? "Tutup panduan notasi" : "Buka panduan notasi"}
          >
            {isOpen ? "Tutup" : "Buka"}
          </Button>
        </div>

        {isOpen ? (
          <div id={`${id}-content`} className="mt-4">
            <div className="max-h-[520px] overflow-y-auto pr-1">
              <div className="divide-y divide-zinc-200 border-t border-zinc-200">
                {NOTATION_CHEAT_SHEET.map((item) => (
                  <div key={item.token} className="py-2.5 first:pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <code className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-ink-900">
                          {item.token}
                        </code>
                        <span className="text-sm font-medium text-ink-900">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-ink-500">
                        <span className="text-zinc-400">Contoh:</span>
                        <code className="rounded border border-zinc-200/80 bg-zinc-50 px-1.5 py-0.5 font-mono font-medium text-ink-800">
                          {item.example}
                        </code>
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-ink-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-ink-500">
              💡 <strong>Tip:</strong> Pisahkan nada dan simbol birama dengan spasi untuk kemudahan membaca, contoh: <code className="font-mono text-ink-800">1 2 3 | 4 5</code>.
            </div>
          </div>
        ) : null}
      </article>
    );
  }
);

"use client";

import { useEffect, useMemo, useState } from "react";
import type { ArrangementContentJson } from "@/lib/arrangement-api";
import { buildDocumentOrderPreview } from "@/lib/arrangement-preview-builder";
import type { Song } from "@/lib/song-api";
import { Button, EmptyState } from "@/components/ui";
import { PartiturPreviewSection } from "@/components/preview/PartiturPreviewSection";
import { PreviewSlideCard } from "@/components/preview/PreviewSlideCard";

const STORAGE_KEY = "notasi-editor:live-preview-open";

export type LiveSongPreviewPanelProps = {
  song: Song | null;
  content: ArrangementContentJson;
};

export function LiveSongPreviewPanel({ song, content }: LiveSongPreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsOpen(stored === "true");
      }
    } catch {
      // LocalStorage access may fail in private mode or if disabled
    }
  }, []);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const previewItems = useMemo(() => {
    return buildDocumentOrderPreview(song, content);
  }, [song, content]);

  const slideCount = useMemo(() => {
    return previewItems.filter((item) => item.kind === "SLIDE").length;
  }, [previewItems]);

  let currentSlideNumber = 0;

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-950">Pratinjau Lagu (Live)</h2>
          <p className="mt-1 text-xs text-ink-500">
            {isOpen ? "Pratinjau render dokumen saat ini" : "Pratinjau slide split-view"}
          </p>
        </div>
        <Button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Tutup pratinjau lagu" : "Buka pratinjau lagu"}
        >
          {isOpen ? "Tutup" : "Buka"}
        </Button>
      </div>

      {isOpen ? (
        <div className="mt-4">
          {previewItems.length === 0 ? (
            <EmptyState
              title="Belum ada pratinjau"
              description="Tambahkan atau isi bagian lagu di editor untuk melihat pratinjau."
            />
          ) : (
            <div className="space-y-4 max-h-[720px] overflow-y-auto pr-1">
              {previewItems.map((item, index) => {
                if (item.kind === "PARTITUR") {
                  return (
                    <PartiturPreviewSection
                      key={item.section.id || `partitur-${index}`}
                      section={item.section}
                      theme="LIGHT"
                      beatsPerLine={16}
                      activeNoteIndices={{}}
                    />
                  );
                }

                currentSlideNumber++;
                return (
                  <PreviewSlideCard
                    key={item.slide.key}
                    slide={item.slide}
                    slideNumber={currentSlideNumber}
                    totalSlides={slideCount}
                    theme="LIGHT"
                    showNotation={true}
                    activeNoteIndex={null}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

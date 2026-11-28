"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { importPartitur, type PartiturImportResult } from "@/lib/partitur-import-api";
import { NotationLine } from "@/components/notation/NotationLine";
import { Button, Field, InlineError, LoadingState, SelectInput } from "@/components/ui";

type PartiturImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  onApplyDraft: (lines: string[], voiceId: string, detectedKeySignature: string) => void;
};

const VOICE_OPTIONS = [
  { id: "sopran", label: "Sopran (Melodi)" },
  { id: "alto", label: "Alto" },
  { id: "tenor", label: "Tenor" },
  { id: "bass", label: "Bass" }
];

export function PartiturImportModal({
  isOpen,
  onClose,
  songId,
  onApplyDraft
}: PartiturImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PartiturImportResult | null>(null);
  const [targetVoice, setTargetVoice] = useState("sopran");

  if (!isOpen) {
    return null;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
  }

  async function handleConvert(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Pilih file gambar (PNG/JPG) atau PDF 1 halaman terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await importPartitur(songId, file);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses partitur.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result || result.lines.length === 0) return;
    onApplyDraft(result.lines, targetVoice, result.detectedKeySignature);
    handleReset();
    onClose();
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="omr-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
          <div>
            <h2 id="omr-modal-title" className="text-lg font-bold text-ink-950">
              Import Partitur Notasi Balok (OMR)
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Auto-convert partitur notasi balok tercetak 1 suara (gambar/PDF) ke notasi angka.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <InlineError message={error} />

          {!result ? (
            <form onSubmit={handleConvert} className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center hover:border-indigo-400">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="partitur-file-upload"
                  accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="partitur-file-upload"
                  className="cursor-pointer space-y-2 block"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl text-indigo-600">
                    🎼
                  </div>
                  <div className="text-sm font-medium text-ink-900">
                    {file ? file.name : "Klik untuk memilih gambar atau drag & drop file"}
                  </div>
                  <p className="text-xs text-ink-500">
                    Mendukung PNG, JPEG, atau PDF 1 halaman (maksimal 10MB)
                  </p>
                </label>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">⚠️ Catatan Penggunaan:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-800">
                  <li>Pastikan partitur tercetak rapi dan bertinta kontras (bukan tulisan tangan).</li>
                  <li>Cakupan saat ini dibatasi untuk 1 suara monofonik (tanpa lirik/polifoni).</li>
                </ul>
              </div>

              {loading ? (
                <div className="py-6">
                  <LoadingState label="Sedang mengekstrak simbol musik dengan engine OMR..." />
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={!file}>
                    Mulai Konversi OMR
                  </Button>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              {/* Detected Key Signature & Time Signature highlight */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                  <span className="text-xs font-medium text-indigo-700">Key Signature</span>
                  <p className="text-base font-bold text-indigo-950">
                    {result.detectedKeySignature}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <span className="text-xs font-medium text-zinc-500">Time Signature</span>
                  <p className="text-base font-bold text-zinc-900">
                    {result.detectedTimeSignature}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:col-span-1">
                  <span className="text-xs font-medium text-zinc-500">Simbol Dikenali</span>
                  <p className="text-base font-bold text-zinc-900">
                    {result.noteCount} nada ({result.measureCount} birama)
                  </p>
                </div>
              </div>

              {/* Warning Banner */}
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
                <div className="flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <div className="space-y-1">
                    <p className="font-bold">Mohon Verifikasi Hasil Konversi!</p>
                    <p className="leading-relaxed text-amber-900">
                      Hasil konversi otomatis OMR dapat mengandung kesalahan not atau ritme.
                      Pastikan nada dasar (<strong>{result.detectedKeySignature}</strong>) sesuai
                      dengan partitur asli karena kesalahan deteksi nada dasar akan mengubah
                      seluruh mapping not angka secara sistematis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Converted Lines Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-700">
                    Pratinjau Hasil Notasi Angka (Draft):
                  </span>
                  <span className="text-xs text-ink-400">
                    {result.lines.length} baris
                  </span>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  {result.lines.map((line, idx) => (
                    <div key={idx} className="space-y-1 rounded border border-zinc-200 bg-white p-2">
                      <div className="font-mono text-xs text-zinc-700">{line}</div>
                      <div className="pt-1">
                        <NotationLine notation={line} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Selection */}
              <div className="max-w-xs">
                <Field label="Terapkan ke Suara (Voice)">
                  <SelectInput
                    value={targetVoice}
                    onChange={(e) => setTargetVoice(e.target.value)}
                  >
                    {VOICE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
                <Button type="button" variant="secondary" onClick={handleReset}>
                  Unggah File Lain
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Batal
                  </Button>
                  <Button type="button" onClick={handleApply}>
                    Terapkan ke Editor (Draft)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

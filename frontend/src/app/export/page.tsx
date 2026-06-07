"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ApiError } from "@/lib/api-client";
import { getDefaultArrangement } from "@/lib/arrangement-api";
import { collectAvailableVerses, normalizeSelectedVerses } from "@/lib/arrangement-helpers";
import {
  createMultipleSongExport,
  exportDownloadHref,
  type ExportOutputFormat,
  type ExportRefrainMode,
  type ExportTextSizePreset,
  type ExportTheme,
  type MultipleSongExportItem,
  type SongExportResponse
} from "@/lib/export-api";
import { listSongBooks, listSongs, type Song, type SongBook } from "@/lib/song-api";
import { Button, EmptyState, Field, InlineError, SelectInput, TextInput } from "@/components/ui";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function ExportPage() {
  const [fileName, setFileName] = useState("");
  const [outputFormat, setOutputFormat] = useState<ExportOutputFormat>("PPTX");
  const [theme, setTheme] = useState<ExportTheme>("LIGHT");
  const [textSizePreset, setTextSizePreset] = useState<ExportTextSizePreset>("MEDIUM");
  const [showNotation, setShowNotation] = useState(true);

  const isCustomLayout = textSizePreset === "CUSTOM";
  const [beatsPerLine, setBeatsPerLine] = useState(16);
  const [linesPerPage, setLinesPerPage] = useState(2);

  const [books, setBooks] = useState<SongBook[]>([]);
  const [selectedBookCode, setSelectedBookCode] = useState("");

  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongNumber, setSelectedSongNumber] = useState("");
  const [songSearch, setSongSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [availableVerses, setAvailableVerses] = useState<string[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<string[]>([]);
  const [hasRefrain, setHasRefrain] = useState(false);
  const [refrainMode, setRefrainMode] = useState<ExportRefrainMode>("NONE");

  const [items, setItems] = useState<MultipleSongExportItem[]>([]);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<SongExportResponse | null>(null);

  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    listSongBooks().then((data) => {
      setBooks(data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedBookCode) {
      setSongs([]);
      setSelectedSongNumber("");
      setSongSearch("");
      setIsDropdownOpen(false);
      return;
    }
    listSongs({ bookCode: selectedBookCode, limit: 9999 }).then((data) => {
      setSongs(data.items.sort((a, b) => {
        const numA = parseInt(a.songNumber.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.songNumber.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }));
    }).catch(console.error);
  }, [selectedBookCode]);

  useEffect(() => {
    if (!selectedBookCode || !selectedSongNumber) {
      setAvailableVerses([]);
      setSelectedVerses([]);
      return;
    }
    const song = songs.find(s => s.songNumber === selectedSongNumber);
    if (!song) return;

    getDefaultArrangement(song.id).then((arrangement) => {
      const verses = collectAvailableVerses(arrangement.contentJson);
      setAvailableVerses(verses);
      setSelectedVerses(verses.length > 0 ? [verses[0]] : []);
      
      const refrainExists = (arrangement.contentJson?.sections || []).some((s: { type: string }) => s.type === "REFRAIN");
      setHasRefrain(refrainExists);
      setRefrainMode(refrainExists ? "AFTER_EACH_VERSE" : "NONE");
    }).catch((err) => {
      console.error(err);
      setAvailableVerses([]);
      setSelectedVerses([]);
      setHasRefrain(false);
      setRefrainMode("NONE");
    });
  }, [selectedBookCode, selectedSongNumber, songs]);

  const filteredSongs = useMemo(() => {
    if (!songSearch) return songs;
    const lower = songSearch.toLowerCase();
    return songs.filter(s =>
      s.songNumber.toLowerCase().includes(lower) ||
      s.title.toLowerCase().includes(lower)
    );
  }, [songs, songSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleVerse(verseNumber: string) {
    setSelectedVerses((current) => {
      if (current.includes(verseNumber)) {
        return current.filter(v => v !== verseNumber);
      }
      return [...current, verseNumber];
    });
  }

  function handleAddItem() {
    setAddError(null);
    if (!selectedBookCode || !selectedSongNumber || selectedVerses.length === 0) {
      setAddError("Buku, nomor lagu, dan setidaknya satu ayat harus dipilih.");
      return;
    }

    const normalizedVerses = normalizeSelectedVerses(selectedVerses);

    const isDuplicate = items.some(
      item => item.bookCode === selectedBookCode &&
              item.songNumber === selectedSongNumber &&
              normalizeSelectedVerses(item.selectedVerses).join(",") === normalizedVerses.join(",")
    );

    if (isDuplicate) {
      setAddError("Lagu dengan pilihan ayat yang sama sudah ada di daftar.");
      return;
    }

    setItems([...items, {
      bookCode: selectedBookCode,
      songNumber: selectedSongNumber,
      selectedVerses: normalizedVerses,
      refrainMode,
      order: items.length + 1
    }]);

    setSelectedSongNumber("");
    setSongSearch("");
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
  }

  function handleMoveDown(index: number) {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
  }

  function handleRemove(index: number) {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.map((item, i) => ({ ...item, order: i + 1 })));
  }

  async function handleExport() {
    setExportError(null);
    setExportResult(null);

    if (!fileName.trim()) {
      setExportError("Nama file tidak boleh kosong.");
      return;
    }

    if (items.length === 0) {
      setExportError("Daftar lagu tidak boleh kosong.");
      return;
    }

    setExporting(true);
    try {
      const result = await createMultipleSongExport({
        fileName: fileName.trim(),
        outputFormat,
        layout: {
          theme,
          showNotation,
          slideSize: "LAYOUT_WIDE",
          textSizePreset,
          ...(isCustomLayout ? {
            customLayout: {
              beatsPerLine,
              linesPerPage
            }
          } : {})
        },
        items
      });

      if (result.status !== "COMPLETED" || !result.downloadUrl) {
        setExportError(result.errorMessage ?? "Export failed to complete.");
        return;
      }
      setExportResult(result);
    } catch (err) {
      setExportError(errorMessage(err, "Failed to generate export"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Export</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
          Multiple Songs Export
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
          Prepare and generate a setlist of multiple songs into a single PPTX or PNG ZIP file.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-md border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-950">Tambah Lagu ke Daftar</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 items-start">
              <Field label="Buku Lagu">
                <SelectInput
                  value={selectedBookCode}
                  onChange={(e) => setSelectedBookCode(e.target.value)}
                >
                  <option value="">-- Pilih Buku --</option>
                  {books.map(b => (
                    <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Nomor Lagu">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-left shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-ink-500`}
                    onClick={() => {
                      if (!selectedBookCode) return;
                      setIsDropdownOpen(!isDropdownOpen);
                      if (!isDropdownOpen) setSongSearch("");
                    }}
                    disabled={!selectedBookCode}
                  >
                    <span className="block truncate">
                      {selectedSongNumber && songs.find(s => s.songNumber === selectedSongNumber)
                        ? `${selectedSongNumber} - ${songs.find(s => s.songNumber === selectedSongNumber)!.title}`
                        : "-- Pilih Lagu --"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
                      <div className="p-2 border-b border-zinc-100">
                        <TextInput
                          placeholder="Cari nomor / judul lagu..."
                          value={songSearch}
                          onChange={(e) => setSongSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <ul className="max-h-60 overflow-y-auto py-1">
                        {filteredSongs.length > 0 ? (
                          filteredSongs.map((s) => (
                            <li
                              key={s.id}
                              className={`cursor-pointer px-3 py-2 text-sm hover:bg-zinc-100 ${s.songNumber === selectedSongNumber ? 'bg-zinc-50 font-medium text-ink-950' : 'text-ink-700'}`}
                              onClick={() => {
                                setSelectedSongNumber(s.songNumber);
                                setIsDropdownOpen(false);
                              }}
                            >
                              {s.songNumber} - {s.title}
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-ink-500">No songs found</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </Field>
            </div>

            {selectedSongNumber && availableVerses.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 pt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-ink-700 mb-2">Pilih Ayat</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availableVerses.map(v => (
                      <label key={v} className="flex items-center gap-2 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-ink-950"
                          checked={selectedVerses.includes(v)}
                          onChange={() => toggleVerse(v)}
                        />
                        Ayat {v}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Field label="Refrain Mode">
                    <SelectInput 
                      value={refrainMode} 
                      onChange={(e) => setRefrainMode(e.target.value as ExportRefrainMode)}
                      disabled={!hasRefrain}
                    >
                      <option value="NONE">None</option>
                      {hasRefrain && (
                        <>
                          <option value="ONCE_AFTER_ALL_VERSES">Once after all verses</option>
                          <option value="AFTER_EACH_VERSE">After each verse</option>
                        </>
                      )}
                    </SelectInput>
                  </Field>
                </div>
              </div>
            )}

            {addError && <div className="mt-4"><InlineError message={addError} /></div>}

            <div className="mt-5 text-right border-t border-zinc-100 pt-4">
              <Button
                variant="secondary"
                disabled={!selectedBookCode || !selectedSongNumber || selectedVerses.length === 0}
                onClick={handleAddItem}
              >
                Tambah ke Daftar
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-950 mb-4">Daftar Lagu Terpilih</h2>
            {items.length === 0 ? (
              <EmptyState title="Belum ada lagu" description="Tambahkan lagu melalui form di atas." />
            ) : (
              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li key={index} className="flex items-center justify-between rounded-md border border-zinc-200 p-3 bg-zinc-50/50">
                    <div>
                      <p className="text-sm font-semibold text-ink-950">
                        {item.order}. {item.bookCode} {item.songNumber}
                      </p>
                      <p className="text-xs text-ink-500 mt-1">
                        Ayat: {item.selectedVerses.join(", ")} | Refrain: {item.refrainMode}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="px-2 py-1 text-xs" disabled={index === 0} onClick={() => handleMoveUp(index)}>↑</Button>
                      <Button variant="secondary" className="px-2 py-1 text-xs" disabled={index === items.length - 1} onClick={() => handleMoveDown(index)}>↓</Button>
                      <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => handleRemove(index)}>Hapus</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-zinc-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-semibold text-ink-950 border-b border-zinc-100 pb-2">Global Settings</h2>

            <Field label="File Name">
              <TextInput
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. ibadah-minggu"
              />
            </Field>

            <Field label="Output Format">
              <SelectInput value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as ExportOutputFormat)}>
                <option value="PPTX">PPTX</option>
                <option value="PNG">PNG ZIP</option>
              </SelectInput>
            </Field>

            <Field label="Theme">
              <SelectInput value={theme} onChange={(e) => setTheme(e.target.value as ExportTheme)}>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
              </SelectInput>
            </Field>

            <Field label="Text Size Preset">
              <SelectInput value={textSizePreset} onChange={(e) => setTextSizePreset(e.target.value as ExportTextSizePreset)}>
                <option value="SMALL">Small / compact</option>
                <option value="MEDIUM">Medium / standard</option>
                <option value="LARGE">Large / large room</option>
                <option value="CUSTOM">Custom (Reflow)</option>
              </SelectInput>
            </Field>

            <label className="flex items-center gap-2 text-sm font-medium text-ink-700 pt-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-ink-950"
                checked={showNotation}
                onChange={(e) => setShowNotation(e.target.checked)}
              />
              Show notation
            </label>

            {isCustomLayout && (
              <div className="grid gap-4 grid-cols-2 pt-2">
                <Field label="Beats / Line">
                  <TextInput
                    type="number"
                    min={1}
                    value={beatsPerLine}
                    onChange={(e) => setBeatsPerLine(parseInt(e.target.value) || 16)}
                  />
                </Field>
                <Field label="Lines / Page">
                  <TextInput
                    type="number"
                    min={1}
                    value={linesPerPage}
                    onChange={(e) => setLinesPerPage(parseInt(e.target.value) || 2)}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-5 space-y-4">
            <Button
              variant="primary"
              className="w-full py-3"
              disabled={exporting || items.length === 0 || !fileName.trim()}
              onClick={() => void handleExport()}
            >
              {exporting ? "Generating..." : `Generate ${outputFormat === "PPTX" ? "PPTX" : "PNG ZIP"}`}
            </Button>

            <InlineError message={exportError} />

            {exportResult?.downloadUrl ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 break-words">
                <p className="font-semibold">Export completed successfully.</p>
                <a
                  href={exportDownloadHref(exportResult.downloadUrl)}
                  download
                  className="mt-3 block text-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Download {exportResult.outputFormat === "PPTX" ? "PPTX" : "PNG ZIP"}
                </a>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

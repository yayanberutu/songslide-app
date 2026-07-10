"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import {
  createSong,
  deleteSong,
  listSongBooks,
  listSongs,
  type Song,
  type SongBook,
  type SongPayload,
  updateSong,
  type SongSearchParams
} from "@/lib/song-api";
import { Button, EmptyState, Field, InlineError, LoadingState, SelectInput, TextArea, TextInput, Modal } from "@/components/ui";
import { useSession } from "next-auth/react";

type SongFormState = {
  bookCode: string;
  songNumber: string;
  title: string;
  type: import("@/lib/song-api").SongType;
  defaultKey: string;
  timeSignature: string;
  tempo: string;
  authorText: string;
  sourceNote: string;
  notationSourceSongId: string;
};

const emptySongForm: SongFormState = {
  bookCode: "",
  songNumber: "",
  title: "",
  type: "LEAD_SHEET",
  defaultKey: "",
  timeSignature: "",
  tempo: "",
  authorText: "",
  sourceNote: "",
  notationSourceSongId: ""
};

const emptyFilters: SongSearchParams = {
  bookCode: "",
  title: "",
  songNumber: "",
  page: 1,
  limit: 20
};

export function SongsManager() {
  const router = useRouter();
  const [songBooks, setSongBooks] = useState<SongBook[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [sourceCandidates, setSourceCandidates] = useState<Song[]>([]);
  const [filters, setFilters] = useState<SongSearchParams>(emptyFilters);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [form, setForm] = useState<SongFormState>(emptySongForm);
  
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Load books and source candidates on mount
  useEffect(() => {
    void loadBooks();
    listSongs({ limit: 1000 }).then(res => setSourceCandidates(res.items)).catch(console.error);
  }, []);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      void loadSongList(filters);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters]);

  const sortedSongBooks = useMemo(
    () => [...songBooks].sort((a, b) => a.code.localeCompare(b.code)),
    [songBooks]
  );

  async function loadBooks() {
    try {
      const books = await listSongBooks();
      setSongBooks(books);
    } catch (error) {
      setPageError(errorMessage(error, "Unable to load song books"));
    }
  }

  async function loadSongList(currentFilters: SongSearchParams) {
    setLoading(true);
    setPageError(null);
    try {
      const result = await listSongs({
        bookCode: emptyToUndefined(currentFilters.bookCode),
        title: emptyToUndefined(currentFilters.title),
        songNumber: emptyToUndefined(currentFilters.songNumber),
        page: currentFilters.page,
        limit: currentFilters.limit
      });
      setSongs(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      setPageError(errorMessage(error, "Unable to load songs"));
    } finally {
      setLoading(false);
    }
  }

  async function clearFilters() {
    setFilters(emptyFilters);
  }

  function handlePageChange(newPage: number) {
    setFilters(f => ({ ...f, page: newPage }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = toSongPayload(form);

    try {
      if (editing) {
        await updateSong(editing.id, payload);
        setIsModalOpen(false);
        resetForm();
        await loadSongList(filters);
      } else {
        const created = await createSong(payload);
        setIsModalOpen(false);
        resetForm();
        router.push(`/songs/${created.id}/editor`);
      }
    } catch (error) {
      setFormError(errorMessage(error, "Unable to save song"));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(song: Song) {
    setEditing(song);
    setForm({
      bookCode: song.songBook.code,
      songNumber: song.songNumber,
      title: song.title,
      type: song.type ?? "LEAD_SHEET",
      defaultKey: song.defaultKey ?? "",
      timeSignature: song.timeSignature ?? "",
      tempo: song.tempo?.toString() ?? "",
      authorText: song.authorText ?? "",
      sourceNote: song.sourceNote ?? "",
      notationSourceSongId: song.notationSourceSongId ?? ""
    });
    setFormError(null);
    setIsModalOpen(true);
  }
  
  function startCreate() {
    resetForm();
    setIsModalOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setForm({
      ...emptySongForm,
      bookCode: sortedSongBooks[0]?.code ?? ""
    });
    setFormError(null);
  }

  async function handleDelete(song: Song) {
    if (!window.confirm(`Delete ${song.songBook.code} ${song.songNumber} - ${song.title}?`)) {
      return;
    }

    setPageError(null);
    try {
      await deleteSong(song.id);
      await loadSongList(filters);
    } catch (error) {
      setPageError(errorMessage(error, "Unable to delete song"));
    }
  }

  const totalPages = Math.ceil(totalCount / (filters.limit || 20));

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Daftar Lagu</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Katalog Lagu</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
            Daftarkan lagu baru di sini sebelum Anda mulai mengetik Not Angkanya.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={startCreate}>
            + Tambah Lagu Baru
          </Button>
        )}
      </div>

      <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Book filter">
            <SelectInput
              value={filters.bookCode}
              onChange={(event) => setFilters((current) => ({ ...current, bookCode: event.target.value, page: 1 }))}
            >
              <option value="">All books</option>
              {sortedSongBooks.map((book) => (
                <option key={book.id} value={book.code}>
                  {book.code} - {book.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Title search">
            <TextInput
              value={filters.title}
              onChange={(event) => setFilters((current) => ({ ...current, title: event.target.value, page: 1 }))}
              placeholder="Bila Kurenung"
            />
          </Field>
          <Field label="Song number">
            <TextInput
              value={filters.songNumber}
              onChange={(event) => setFilters((current) => ({ ...current, songNumber: event.target.value, page: 1 }))}
              placeholder="37"
            />
          </Field>
          <div className="flex items-end">
            <Button type="button" onClick={clearFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <InlineError message={pageError} />
        {loading && songs.length === 0 ? (
          <LoadingState label="Memuat lagu..." />
        ) : songs.length === 0 ? (
          <EmptyState title="Lagu tidak ditemukan" description="Coba ubah filter pencarian Anda." />
        ) : (
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-normal text-ink-500">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3">Info</th>
                  <th className="px-4 py-3">Penulis</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {songs.map((song) => (
                  <tr key={song.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink-950">{song.songBook.code}</span>
                      <span className="ml-1 text-ink-500">#{song.songNumber}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900">{song.title}</td>
                    <td className="px-4 py-3 text-ink-500">
                      {[song.defaultKey ? `Do=${song.defaultKey}` : null, song.timeSignature, song.tempo ? `${song.tempo}bpm` : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-500">{song.authorText || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-sm">
                        {isAdmin && (
                          <>
                            <Link href={`/songs/${song.id}/editor`} className="font-medium text-indigo-600 hover:text-indigo-800">
                              Ketik Not Angka
                            </Link>
                            <button onClick={() => startEdit(song)} className="font-medium text-zinc-600 hover:text-zinc-800">
                              Edit
                            </button>
                            <button onClick={() => void handleDelete(song)} className="font-medium text-red-600 hover:text-red-800">
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-3">
                <span className="text-sm text-ink-500">
                  Showing <span className="font-medium">{(filters.page! - 1) * filters.limit! + 1}</span> to <span className="font-medium">{Math.min(filters.page! * filters.limit!, totalCount)}</span> of <span className="font-medium">{totalCount}</span> songs
                </span>
                <div className="flex gap-2">
                  <Button
                    disabled={filters.page === 1}
                    onClick={() => handlePageChange(filters.page! - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={filters.page === totalPages}
                    onClick={() => handlePageChange(filters.page! + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit song" : "Create song"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InlineError message={formError} />
          {sortedSongBooks.length === 0 ? (
            <InlineError message="Create at least one song book before adding songs." />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Book">
              <SelectInput
                required
                value={form.bookCode}
                onChange={(event) => setForm((current) => ({ ...current, bookCode: event.target.value }))}
              >
                {sortedSongBooks.map((book) => (
                  <option key={book.id} value={book.code}>
                    {book.code} - {book.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Song number">
              <TextInput
                required
                maxLength={32}
                value={form.songNumber}
                onChange={(event) => setForm((current) => ({ ...current, songNumber: event.target.value }))}
                placeholder="37"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Title">
                <TextInput
                  required
                  maxLength={255}
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Bila Kurenung Dosaku"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Tipe Lagu">
                <SelectInput
                  value={form.type}
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as import("@/lib/song-api").SongType }))}
                >
                  <option value="LEAD_SHEET">Lead Sheet (1 Suara)</option>
                  <option value="PARTITUR">Partitur (Multi-Suara / SATB)</option>
                </SelectInput>
              </Field>
            </div>
            <Field label="Key">
              <TextInput
                maxLength={32}
                value={form.defaultKey}
                onChange={(event) => setForm((current) => ({ ...current, defaultKey: event.target.value }))}
                placeholder="G"
              />
            </Field>
            <Field label="Time sig">
              <TextInput
                maxLength={32}
                value={form.timeSignature}
                onChange={(event) => setForm((current) => ({ ...current, timeSignature: event.target.value }))}
                placeholder="4/4"
              />
            </Field>
            <Field label="Tempo">
              <TextInput
                min={1}
                type="number"
                value={form.tempo}
                onChange={(event) => setForm((current) => ({ ...current, tempo: event.target.value }))}
                placeholder="80"
              />
            </Field>
            <Field label="Author">
              <TextInput
                maxLength={255}
                value={form.authorText}
                onChange={(event) => setForm((current) => ({ ...current, authorText: event.target.value }))}
                placeholder="Traditional"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Sumber Notasi (Opsional)">
                <SelectInput
                  value={form.notationSourceSongId}
                  onChange={(event) => setForm((current) => ({ ...current, notationSourceSongId: event.target.value }))}
                >
                  <option value="">-- Tidak ada (Tulis sendiri) --</option>
                  {sourceCandidates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.songBook.code} {s.songNumber} - {s.title}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <p className="mt-1 text-xs text-ink-500">
                Pilih lagu lain jika notasi lagu ini ingin disinkronkan sepenuhnya dari lagu tersebut.
              </p>
            </div>
            <div className="md:col-span-2">
              <Field label="Source note">
                <TextArea
                  value={form.sourceNote}
                  onChange={(event) => setForm((current) => ({ ...current, sourceNote: event.target.value }))}
                  placeholder="Optional source or operator notes"
                />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-4">
            <Button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting || sortedSongBooks.length === 0}>
              {submitting ? "Saving..." : editing ? "Save changes" : "Create song"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function toSongPayload(form: SongFormState): SongPayload {
  return {
    bookCode: form.bookCode.trim().toUpperCase(),
    songNumber: form.songNumber.trim(),
    title: form.title.trim(),
    type: form.type,
    defaultKey: emptyToNull(form.defaultKey),
    timeSignature: emptyToNull(form.timeSignature),
    tempo: form.tempo.trim() ? Number(form.tempo) : null,
    authorText: emptyToNull(form.authorText),
    sourceNote: emptyToNull(form.sourceNote),
    notationSourceSongId: emptyToNull(form.notationSourceSongId)
  };
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function emptyToUndefined(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? undefined : trimmed;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

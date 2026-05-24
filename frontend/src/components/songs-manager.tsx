"use client";

import Link from "next/link";
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
  updateSong
} from "@/lib/song-api";
import { Button, EmptyState, Field, InlineError, LoadingState, SelectInput, TextArea, TextInput } from "@/components/ui";

type SongFormState = {
  bookCode: string;
  songNumber: string;
  title: string;
  defaultKey: string;
  timeSignature: string;
  tempo: string;
  authorText: string;
  sourceNote: string;
};

type SongFilters = {
  bookCode: string;
  title: string;
  songNumber: string;
};

const emptySongForm: SongFormState = {
  bookCode: "",
  songNumber: "",
  title: "",
  defaultKey: "",
  timeSignature: "",
  tempo: "",
  authorText: "",
  sourceNote: ""
};

const emptyFilters: SongFilters = {
  bookCode: "",
  title: "",
  songNumber: ""
};

export function SongsManager() {
  const [songBooks, setSongBooks] = useState<SongBook[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [filters, setFilters] = useState<SongFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [form, setForm] = useState<SongFormState>(emptySongForm);

  useEffect(() => {
    void loadInitialData();
  }, []);

  const sortedSongBooks = useMemo(
    () => [...songBooks].sort((a, b) => a.code.localeCompare(b.code)),
    [songBooks]
  );

  async function loadInitialData() {
    setLoading(true);
    setPageError(null);
    try {
      const [books, loadedSongs] = await Promise.all([listSongBooks(), listSongs()]);
      setSongBooks(books);
      setSongs(loadedSongs);
      if (books.length > 0) {
        setForm((current) => ({ ...current, bookCode: current.bookCode || books[0].code }));
      }
    } catch (error) {
      setPageError(errorMessage(error, "Unable to load songs"));
    } finally {
      setLoading(false);
    }
  }

  async function loadSongList(nextFilters = filters) {
    setLoading(true);
    setPageError(null);
    try {
      setSongs(await listSongs({
        bookCode: emptyToUndefined(nextFilters.bookCode),
        title: emptyToUndefined(nextFilters.title),
        songNumber: emptyToUndefined(nextFilters.songNumber)
      }));
    } catch (error) {
      setPageError(errorMessage(error, "Unable to load songs"));
    } finally {
      setLoading(false);
    }
  }

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadSongList(filters);
  }

  async function clearFilters() {
    setFilters(emptyFilters);
    await loadSongList(emptyFilters);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = toSongPayload(form);

    try {
      if (editing) {
        await updateSong(editing.id, payload);
      } else {
        await createSong(payload);
      }
      resetForm();
      await loadSongList();
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
      defaultKey: song.defaultKey ?? "",
      timeSignature: song.timeSignature ?? "",
      tempo: song.tempo?.toString() ?? "",
      authorText: song.authorText ?? "",
      sourceNote: song.sourceNote ?? ""
    });
    setFormError(null);
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
      await loadSongList();
      if (editing?.id === song.id) {
        resetForm();
      }
    } catch (error) {
      setPageError(errorMessage(error, "Unable to delete song"));
    }
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Songs</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Song catalog</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
          Create and maintain song metadata before adding notation arrangements.
        </p>
      </div>

      <form onSubmit={handleFilterSubmit} className="rounded-md border border-zinc-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Book filter">
            <SelectInput
              value={filters.bookCode}
              onChange={(event) => setFilters((current) => ({ ...current, bookCode: event.target.value }))}
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
              onChange={(event) => setFilters((current) => ({ ...current, title: event.target.value }))}
              placeholder="Bila Kurenung"
            />
          </Field>
          <Field label="Song number">
            <TextInput
              value={filters.songNumber}
              onChange={(event) => setFilters((current) => ({ ...current, songNumber: event.target.value }))}
              placeholder="37"
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="primary" type="submit" disabled={loading}>
              Search
            </Button>
            <Button type="button" onClick={() => void clearFilters()} disabled={loading}>
              Reset
            </Button>
          </div>
        </div>
      </form>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
          <div>
            <h2 className="text-base font-semibold text-ink-950">{editing ? "Edit song" : "Create song"}</h2>
            <p className="mt-1 text-sm text-ink-500">Use book code selection for the MVP workflow.</p>
          </div>
          <InlineError message={formError} />
          {sortedSongBooks.length === 0 ? (
            <InlineError message="Create at least one song book before adding songs." />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <Field label="Book">
              <SelectInput
                required
                value={form.bookCode}
                onChange={(event) => setForm((current) => ({ ...current, bookCode: event.target.value }))}
              >
                <option value="">Select book</option>
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
            <Field label="Title">
              <TextInput
                required
                maxLength={255}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Bila Kurenung Dosaku"
              />
            </Field>
            <Field label="Key">
              <TextInput
                maxLength={32}
                value={form.defaultKey}
                onChange={(event) => setForm((current) => ({ ...current, defaultKey: event.target.value }))}
                placeholder="G"
              />
            </Field>
            <Field label="Time signature">
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
            <Field label="Source note">
              <TextArea
                value={form.sourceNote}
                onChange={(event) => setForm((current) => ({ ...current, sourceNote: event.target.value }))}
                placeholder="Optional source or operator notes"
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" type="submit" disabled={submitting || sortedSongBooks.length === 0}>
              {submitting ? "Saving..." : editing ? "Save changes" : "Create song"}
            </Button>
            {editing ? (
              <Button type="button" onClick={resetForm} disabled={submitting}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-3">
          <InlineError message={pageError} />
          {loading ? (
            <LoadingState label="Loading songs..." />
          ) : songs.length === 0 ? (
            <EmptyState title="No songs found" description="Create a song or adjust the search filters." />
          ) : (
            <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-normal text-ink-500">
                  <tr>
                    <th className="px-4 py-3">Book</th>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Music</th>
                    <th className="px-4 py-3">Author</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {songs.map((song) => (
                    <tr key={song.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-950">{song.songBook.code}</p>
                        <p className="text-xs text-ink-500">{song.songBook.name}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink-950">{song.songNumber}</td>
                      <td className="px-4 py-3 text-ink-700">{song.title}</td>
                      <td className="px-4 py-3 text-ink-500">
                        {[song.defaultKey ? `Do = ${song.defaultKey}` : null, song.timeSignature, song.tempo ? `${song.tempo} BPM` : null]
                          .filter(Boolean)
                          .join(" | ") || "No metadata"}
                      </td>
                      <td className="px-4 py-3 text-ink-500">{song.authorText || "Unknown"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/songs/${song.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100"
                          >
                            Detail
                          </Link>
                          <Link
                            href={`/songs/${song.id}/editor`}
                            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100"
                          >
                            Editor
                          </Link>
                          <Button type="button" onClick={() => startEdit(song)}>
                            Edit
                          </Button>
                          <Button type="button" variant="danger" onClick={() => void handleDelete(song)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function toSongPayload(form: SongFormState): SongPayload {
  return {
    bookCode: form.bookCode.trim().toUpperCase(),
    songNumber: form.songNumber.trim(),
    title: form.title.trim(),
    defaultKey: emptyToNull(form.defaultKey),
    timeSignature: emptyToNull(form.timeSignature),
    tempo: form.tempo.trim() ? Number(form.tempo) : null,
    authorText: emptyToNull(form.authorText),
    sourceNote: emptyToNull(form.sourceNote)
  };
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
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

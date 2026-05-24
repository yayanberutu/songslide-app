"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import {
  createSongBook,
  deleteSongBook,
  listSongBooks,
  type SongBook,
  type SongBookPayload,
  updateSongBook
} from "@/lib/song-api";
import { Button, EmptyState, Field, InlineError, LoadingState, TextArea, TextInput } from "@/components/ui";

type SongBookFormState = {
  code: string;
  name: string;
  description: string;
};

const emptyForm: SongBookFormState = {
  code: "",
  name: "",
  description: ""
};

export function SongBooksManager() {
  const [songBooks, setSongBooks] = useState<SongBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<SongBook | null>(null);
  const [form, setForm] = useState<SongBookFormState>(emptyForm);

  useEffect(() => {
    void loadBooks();
  }, []);

  const sortedSongBooks = useMemo(
    () => [...songBooks].sort((a, b) => a.code.localeCompare(b.code)),
    [songBooks]
  );

  async function loadBooks() {
    setLoading(true);
    setPageError(null);
    try {
      setSongBooks(await listSongBooks());
    } catch (error) {
      setPageError(errorMessage(error, "Unable to load song books"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload: SongBookPayload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: emptyToNull(form.description),
      displayOrder: editing?.displayOrder ?? 0,
      active: editing?.active ?? true
    };

    try {
      if (editing) {
        await updateSongBook(editing.id, payload);
      } else {
        await createSongBook(payload);
      }
      setForm(emptyForm);
      setEditing(null);
      await loadBooks();
    } catch (error) {
      setFormError(errorMessage(error, "Unable to save song book"));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(songBook: SongBook) {
    setEditing(songBook);
    setForm({
      code: songBook.code,
      name: songBook.name,
      description: songBook.description ?? ""
    });
    setFormError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleDelete(songBook: SongBook) {
    if (!window.confirm(`Delete song book ${songBook.code}?`)) {
      return;
    }

    setPageError(null);
    try {
      await deleteSongBook(songBook.id);
      await loadBooks();
      if (editing?.id === songBook.id) {
        cancelEdit();
      }
    } catch (error) {
      setPageError(errorMessage(error, "Unable to delete song book"));
    }
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Song Books</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Song book management</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
          Manage BE, KJ, PKJ, BNH, NKB, and other local song book catalogs.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
          <div>
            <h2 className="text-base font-semibold text-ink-950">
              {editing ? `Edit ${editing.code}` : "Create song book"}
            </h2>
            <p className="mt-1 text-sm text-ink-500">Codes are saved in uppercase.</p>
          </div>
          <InlineError message={formError} />
          <Field label="Code">
            <TextInput
              required
              maxLength={16}
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="KJ"
            />
          </Field>
          <Field label="Name">
            <TextInput
              required
              maxLength={255}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Kidung Jemaat"
            />
          </Field>
          <Field label="Description">
            <TextArea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Optional notes for this song book"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Save changes" : "Create book"}
            </Button>
            {editing ? (
              <Button type="button" onClick={cancelEdit} disabled={submitting}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-3">
          <InlineError message={pageError} />
          {loading ? (
            <LoadingState label="Loading song books..." />
          ) : sortedSongBooks.length === 0 ? (
            <EmptyState title="No song books yet" description="Create the first book to organize songs." />
          ) : (
            <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-normal text-ink-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedSongBooks.map((songBook) => (
                    <tr key={songBook.id}>
                      <td className="px-4 py-3 font-semibold text-ink-950">{songBook.code}</td>
                      <td className="px-4 py-3 text-ink-700">{songBook.name}</td>
                      <td className="px-4 py-3 text-ink-500">{songBook.description || "No description"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" onClick={() => startEdit(songBook)}>
                            Edit
                          </Button>
                          <Button type="button" variant="danger" onClick={() => void handleDelete(songBook)}>
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

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
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

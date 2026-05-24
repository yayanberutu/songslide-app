import Link from "next/link";

export default function EditorPage() {
  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Editor</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Choose a song to edit</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
          The line-based editor opens from each song record and saves through song_arrangements.content_json.
        </p>
      </div>
      <Link
        href="/songs"
        className="inline-flex items-center justify-center rounded-md bg-ink-950 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
      >
        Go to songs
      </Link>
    </section>
  );
}

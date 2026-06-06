import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type SongDetailPlaceholderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SongDetailPlaceholderPage({ params }: SongDetailPlaceholderPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Song Detail</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Song workflow placeholder</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
          Song ID {id} is ready for later editor, image upload, preview, and export workflows.
        </p>
      </div>
      <Link
        href="/songs"
        className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100"
      >
        Back to songs
      </Link>
      {isAdmin && (
        <Link
          href={`/songs/${id}/editor`}
          className="ml-2 inline-flex items-center justify-center rounded-md bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-700"
        >
          Open editor
        </Link>
      )}
      <Link
        href={`/songs/${id}/preview`}
        className="ml-2 inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100"
      >
        Preview
      </Link>
    </section>
  );
}

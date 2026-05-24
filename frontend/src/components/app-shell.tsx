import Link from "next/link";
import { apiBaseUrl } from "@/lib/api-client";

const navigationItems = [
  { href: "/", label: "Dashboard" },
  { href: "/books", label: "Song Books" },
  { href: "/songs", label: "Songs" },
  { href: "/editor", label: "Editor" },
  { href: "/preview", label: "Preview" },
  { href: "/export", label: "Export" }
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-normal text-ink-950">
              SongSlide
            </Link>
            <p className="mt-1 text-sm text-ink-500">Local church song notation workflow</p>
          </div>
          <div className="text-xs text-ink-500">
            API: <span className="font-medium text-ink-700">{apiBaseUrl}</span>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100 hover:text-ink-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

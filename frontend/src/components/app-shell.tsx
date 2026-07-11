"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { apiBaseUrl } from "@/lib/api-client";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navigationItems = [
  { href: "/", label: "Beranda", roles: ["ADMIN", "MULTIMEDIA"] },
  { href: "/books", label: "Buku Lagu", roles: ["ADMIN"] },
  { href: "/songs", label: "Daftar Lagu", roles: ["ADMIN", "MULTIMEDIA"] },
  { href: "/users", label: "Tim", roles: ["ADMIN"] },
  { href: "/export", label: "Unduh PPTX", roles: ["ADMIN", "MULTIMEDIA"] },
  { href: "/practice", label: "Latihan Lagu", roles: ["PADUS", "ADMIN", "MULTIMEDIA"] },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <main className="min-h-screen bg-zinc-50">{children}</main>;
  }

  const role = session?.user?.role || "MULTIMEDIA";

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-normal text-ink-950">
              <img src="/logo.png" alt="SongSlide Logo" className="h-6 w-6 object-contain rounded-sm" />
              SongSlide
            </Link>
            <p className="mt-1 text-sm text-ink-500">Sistem otomatisasi partitur lagu jemaat</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-500">
            {role !== "PADUS" && (
              <span>API: <span className="font-medium text-ink-700">{apiBaseUrl}</span></span>
            )}
            {session && (
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-ink-100 px-2 py-1 text-ink-800">
                  {session.user?.name} ({role})
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="rounded bg-zinc-200 px-2 py-1 hover:bg-zinc-300 text-ink-900"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
        {role !== "PADUS" && (
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
            {navigationItems.filter(item => item.roles.includes(role)).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100 hover:text-ink-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className={`mx-auto max-w-7xl py-4 sm:py-6 ${role === "PADUS" ? "px-0 sm:px-4" : "px-4 sm:px-6 lg:px-8"}`}>{children}</main>
      <footer className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-center text-sm text-zinc-500 border-t border-zinc-200 mt-auto">
        Powered by <a href="https://berutu.dev" target="_blank" rel="noreferrer" className="text-zinc-700 hover:text-zinc-900 font-medium transition-colors">berutu.dev</a>
      </footer>
    </div>
  );
}

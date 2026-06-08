"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid username or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Left Column: Branding / Description */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-ink-950 p-12 text-white overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 font-semibold text-xl tracking-wide">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
            SongSlide
          </div>
        </div>
        <div className="relative z-10 max-w-lg flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Sistem Otomatisasi Partitur Lagu Jemaat
          </h1>
          <p className="text-lg text-ink-200 leading-relaxed">
            SongSlide membantu tim multimedia gereja menampilkan notasi angka dan lirik lagu dengan cepat, akurat, dan rapi dalam format presentasi. Tidak perlu lagi mengetik notasi satu per satu secara manual ke dalam PowerPoint.
          </p>
        </div>
        {/* Background decorative elements */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-ink-800 opacity-50 blur-3xl"></div>
        <div className="absolute top-1/4 -right-20 w-72 h-72 rounded-full bg-ink-700 opacity-30 blur-3xl"></div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-ink-950">
              <svg className="h-8 w-8 text-ink-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
              SongSlide
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Sistem Otomatisasi Partitur Lagu Jemaat
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink-950">
              Selamat datang kembali
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Silakan masuk ke akun Anda untuk melanjutkan.
            </p>
          </div>

          <div className="mt-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4 ring-1 ring-inset ring-red-500/20">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-ink-950">
                  Username
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-zinc-300 px-4 py-3 text-ink-950 placeholder-zinc-400 shadow-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-500/20 sm:text-sm transition-shadow"
                    placeholder="Masukkan username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-950">
                  Password
                </label>
                <div className="mt-2">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-zinc-300 px-4 py-3 text-ink-950 placeholder-zinc-400 shadow-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-500/20 sm:text-sm transition-shadow"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-lg border border-transparent bg-ink-950 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Memverifikasi..." : "Masuk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

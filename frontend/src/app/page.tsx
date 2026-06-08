import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";

type TopSong = {
  songId: string;
  title: string;
  exportCount: number;
};

type DashboardData = {
  totalExports: number;
  totalLogins: number;
  topSongs: TopSong[];
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role || "MULTIMEDIA";

  if (role === "ADMIN") {
    let data: DashboardData | null = null;
    try {
      data = await apiRequest<DashboardData>("/api/analytics", {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
    } catch (e) {
      console.error("Failed to load analytics", e);
    }

    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Beranda Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Pusat Analitik & Wawasan</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
            Pantau seberapa sering aplikasi digunakan dan lagu apa saja yang paling banyak diunduh oleh jemaat.
          </p>
        </div>

        {data ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-medium text-ink-500 uppercase">Total Unduhan PPTX</h2>
              <p className="mt-2 text-4xl font-semibold text-ink-900">{data.totalExports}</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-medium text-ink-500 uppercase">Total Login Tim</h2>
              <p className="mt-2 text-4xl font-semibold text-ink-900">{data.totalLogins}</p>
            </div>
            
            <div className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm md:col-span-2 lg:col-span-3">
              <h2 className="text-lg font-medium text-ink-900 mb-4">Lagu Paling Sering Diunduh (Top 5)</h2>
              {data.topSongs.length > 0 ? (
                <ul className="divide-y divide-zinc-200 border-t border-zinc-200">
                  {data.topSongs.map((song, i) => (
                    <li key={song.songId} className="flex justify-between py-3">
                      <span className="text-ink-800"><span className="text-ink-400 mr-2">#{i + 1}</span> {song.title}</span>
                      <span className="font-semibold text-ink-600">{song.exportCount} kali</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-500 italic">Belum ada data unduhan sejauh ini.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-ink-500 border border-dashed border-zinc-300 rounded-md">
            Gagal memuat analitik. Pastikan backend berjalan dengan baik.
          </div>
        )}
      </div>
    );
  }

  // Multimedia Tutorial View
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Selamat Datang di SongSlide</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Panduan Mengunduh PPTX Not Angka</h1>
        <p className="mt-3 text-lg leading-7 text-ink-700">
          Ikuti 3 langkah super mudah ini untuk mempersiapkan presentasi ibadah minggu ini!
        </p>
      </div>

      <div className="space-y-6 relative border-l-2 border-indigo-100 pl-6 ml-2">
        
        <div className="relative">
          <div className="absolute -left-10 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold ring-4 ring-white">1</div>
          <h2 className="text-xl font-semibold text-ink-900">Cari Lagu Anda</h2>
          <p className="mt-1 text-ink-600">Pergi ke halaman <Link href="/songs" className="font-medium text-indigo-600 underline">Daftar Lagu</Link> untuk melihat semua koleksi. Jika lagu yang dicari tidak ada, Anda bisa memintanya kepada Admin.</p>
        </div>

        <div className="relative">
          <div className="absolute -left-10 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold ring-4 ring-white">2</div>
          <h2 className="text-xl font-semibold text-ink-900">Siapkan Ekspor</h2>
          <p className="mt-1 text-ink-600">Buka menu <Link href="/export" className="font-medium text-indigo-600 underline">Unduh PPTX</Link>. Cari lagu yang Anda butuhkan lalu masukkan ke daftar &quot;Keranjang&quot;. Anda bisa memilih banyak lagu sekaligus!</p>
        </div>

        <div className="relative">
          <div className="absolute -left-10 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold ring-4 ring-white">3</div>
          <h2 className="text-xl font-semibold text-ink-900">Atur & Selesai!</h2>
          <p className="mt-1 text-ink-600">Anda dapat mengatur <strong className="text-ink-800">Ukuran Bebas</strong> (besar/kecilnya huruf) dan <strong className="text-ink-800">Posisi Reff</strong> jika mau. Setelah puas, klik tombol <span className="inline-flex rounded bg-zinc-800 px-2 py-1 text-xs text-white">Generate Presentation</span>. Selesai!</p>
        </div>

      </div>

      <div className="pt-4">
        <Link href="/export" className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700">
          Mulai Siapkan PPTX Sekarang
        </Link>
      </div>
    </div>
  );
}

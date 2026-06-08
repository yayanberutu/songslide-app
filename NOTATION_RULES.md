# Aturan Penulisan Notasi Angka (Jianpu) untuk SongSlide

Aturan ini dibuat sebagai pedoman mutlak (SSOT) bagi agen AI untuk merender atau mengubah algoritma *export-service* terkait penulisan notasi kepatihan (angka).

## 1. Urutan Hierarki Posisi (Y-Axis)
Dari posisi paling ATAS hingga BAWAH, urutan elemen dalam satu baris notasi **wajib** mengikuti struktur ini:
1. **Garis Bendera Panjang (Primary Beam)**: `beamLevelOneY`. Berada pada titik tertinggi (nilai Y paling kecil).
2. **Garis Bendera Pendek (Secondary Beam)**: `beamLevelTwoY`. Berada tepat di bawah garis bendera panjang.
3. **Titik Oktaf Tinggi (Top Dot)**: `topDotY` / `topDotYBeamed`. Harus berada di bawah semua garis bendera, tetapi di atas angka notasi. Jarak titik tidak boleh terlalu jauh dari angka agar jelas kepemilikannya.
4. **Teks Angka Notasi**: `baselineY`. Berada di tengah area notasi.
5. **Titik Oktaf Rendah (Bottom Dot)**: `bottomDotY`. Berada di bawah teks angka.
6. **Garis Slur (Legato)**: `slurBaseY`. Ditempatkan di bawah angka dan titik bawah (melengkung ke bawah seperti mangkuk).
7. **Teks Lirik**: `lyricBaselineY`. Lirik lagu yang diposisikan di baris terbawah.

## 2. Tanda Pemisah Bar (Bar Line)
- Tanda pemisah bar (seperti `|` atau `||`) harus di-render memanjang menutupi rentang tinggi angka notasi.
- Ujung atas batang vertikal (`y1`) harus dimulai sedikit di atas notasi angka (di bawah garis bendera).
- Ujung bawah batang vertikal (`y2`) harus berakhir sedikit di bawah notasi angka (sejajar dengan batas bawah angka).

## 3. Logika Render SVG
Dalam aplikasi SVG untuk web dan ekspor PPTX:
- Sumbu Y **meningkat ke arah bawah** (nilai `Y=0` adalah ujung atas kanvas).
- Sehingga untuk menempatkan bendera di *atas*, nilai `beamLevelOneY` harus **lebih kecil** daripada `topDotY`.

*(Aturan ini dibuat pada 8 Juni 2026. Semua modifikasi di masa mendatang wajib merujuk dokumen ini untuk mencegah regresi visual).*

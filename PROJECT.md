# PROJECT.md — SIGAP HSE

**Kamu adalah agent eksekutor untuk proyek ini.** File ini adalah sumber kebenaran tunggal. Baca seluruh isi sampai habis sebelum menulis kode apa pun. Jangan minta klarifikasi ke user kecuali benar-benar buntu — kalau ada bagian ambigu, pilih interpretasi paling wajar, catat di `## Catatan Asumsi` di bawah, lalu lanjut jalan.

Folder ini sudah berisi starter skeleton, jangan ditulis ulang dari nol:
- `index.html` — shell halaman, sudah ada topbar/sidebar/mode switcher/3 section kosong
- `css/styles.css` — design tokens light/dark sudah didefinisikan
- `js/config.example.js` — template kredensial Supabase
- `js/supabase-client.js` — init client, sudah jalan
- `js/app.js` — routing antar mode & theme toggle, sudah jalan sebagian
- `supabase/migrations/0001_init.sql` — schema database & RLS, siap dijalankan

Kerjakan `## Urutan Eksekusi` berurutan. Setiap langkah selesai, update checklist di `## Progress` di bawah (`[ ]` → `[x]`) supaya kalau sesi terputus, eksekusi berikutnya tahu harus lanjut dari mana.

---

## 1. Apa yang dibangun

**SIGAP HSE** — sistem monitoring temuan Health, Safety & Environment untuk klien (perusahaan properti/konstruksi). Mencatat temuan HSE lapangan, melacak status tindak lanjut, menyimpan foto sebelum/sesudah perbaikan, menyajikan analisis tren. Tiga cara pakai untuk tiga peran: petugas lapangan (input cepat), manajemen (ringkasan saat rapat), HSE officer (analisis mendalam).

Target akhir: aplikasi siap dipakai klien, production-ready, bukan prototype.

## 2. Tech Stack — WAJIB tetap simpel, jangan ditambah tanpa alasan kuat

**Prinsip:** tanpa framework, tanpa build step, tanpa npm install/bundler. Semua library dipanggil lewat CDN `<script>` tag di `index.html`. File JS antar-file cukup pakai variabel global (`window.App`, dst), bukan ES module import/export — ini disengaja supaya file bisa dibuka langsung di browser tanpa proses build.

- **Frontend:** HTML + CSS murni + vanilla JavaScript (ES6, tapi tanpa module system)
- **Backend & DB:** Supabase (Postgres + Auth + Storage), diakses langsung dari browser via `@supabase/supabase-js` (CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`), diamankan RLS (sudah ada di migration)
- **Chart:** Chart.js via CDN (`https://cdn.jsdelivr.net/npm/chart.js@4`) — jangan pakai Recharts/library berbasis React
- **Kompresi foto sebelum upload:** JANGAN tambah dependency — cukup fungsi kecil di `js/compress.js` pakai `<canvas>` native (resize max 1600px, `canvas.toBlob('image/webp', 0.75)`)
- **Ekspor Excel:** SheetJS via CDN (`https://cdn.jsdelivr.net/npm/xlsx@latest`)
- **Ekspor PDF:** jsPDF + html2canvas via CDN
- **Routing antar mode:** hash routing manual (`#/presentation`, `#/input`, `#/analytic`) — cukup `location.hash` + `hashchange` listener di `app.js`, jangan pakai React Router atau library routing apa pun
- **Font:** Google Fonts `<link>` — Inter (body/UI), Plus Jakarta Sans (heading), JetBrains Mono (data/ID/timestamp/koordinat)
- **Deploy:** static hosting (Netlify/Vercel) — drag-drop folder atau connect git, TIDAK ADA build command karena tidak ada build step

Kalau kamu (agent) merasa perlu menambah framework/bundler untuk "kerapian", JANGAN — itu bertentangan dengan tujuan proyek ini. Kompleksitas ditambah hanya kalau user memintanya secara eksplisit di kemudian hari.

## 3. Struktur Folder — final, jangan ditambah folder baru tanpa alasan

```
sigap-hse/
├── index.html              -> satu halaman, 3 section mode di dalamnya
├── css/
│   └── styles.css          -> design tokens + layout + komponen
├── js/
│   ├── config.js           -> kredensial asli, TIDAK di-commit (lihat .gitignore)
│   ├── config.example.js   -> template, aman di-commit
│   ├── supabase-client.js  -> init client dari window.SUPABASE_CONFIG
│   ├── queries.js          -> semua fungsi CRUD ke Supabase
│   ├── compress.js         -> kompresi foto pakai canvas
│   ├── charts.js           -> setup Chart.js untuk tren & donut
│   └── app.js              -> routing hash, theme toggle, init tiap mode
├── supabase/
│   └── migrations/0001_init.sql
├── .gitignore
└── PROJECT.md
```

Tidak ada `src/`, tidak ada `components/`, tidak ada `node_modules`. Kalau butuh markup berulang (misal `StatusBadge`), cukup buat sebagai fungsi JS yang me-return string HTML, bukan komponen framework.

## 4. Design System — wajib diikuti persis (sudah ada di `css/styles.css`, lanjutkan pola yang sama)

Acuan visual: dashboard SaaS bersih, terang, banyak whitespace, card putih shadow lembut, sudut sangat rounded, pill button untuk switch/tab aktif. Kalau ada gambar referensi di folder `reference/`, buka dan replikasi *feel*-nya.

Token warna sudah didefinisikan di `css/styles.css` sebagai CSS variables (`:root` untuk light, `[data-theme="dark"]` untuk dark). Jangan buat token warna baru di luar yang sudah ada — kalau butuh warna tambahan, derive dari token yang ada (opacity/tint), jangan hardcode hex baru.

Tipografi: heading (Plus Jakarta Sans 700), panel title (Plus Jakarta Sans 600, 15-16px), body (Inter 400-500, 13-14px), angka KPI besar (Plus Jakarta Sans 700, 32-36px), data/ID/koordinat (JetBrains Mono 12-13px).

Pola komponen: card radius 20px + shadow lembut, segmented pill switcher untuk Mode Switcher & filter waktu, sidebar ikon-only collapsible, avatar bulat inisial, progress bar tipis radius penuh, chart stroke tipis tanpa gridline berat.

Larangan: gradient mencolok, hard shadow, warna template generik AI (#D97757 dsb).

## 5. Database

Schema & RLS lengkap di `supabase/migrations/0001_init.sql` — jalankan di Supabase SQL editor atau `supabase db push`, jangan ditulis ulang. Tabel: `areas`, `categories`, `profiles`, `findings`, `finding_photos`, `activity_log`.

Buat Storage bucket `finding-photos` (statement-nya sudah ada di file migration; kalau SQL editor menolak baris `storage.buckets`, buat manual lewat dashboard Supabase > Storage).

## 6. Tiga Mode — inti pembeda aplikasi ini

Satu `index.html`, tiga `<section>` (`#view-presentation`, `#view-input`, `#view-analytic`), hanya satu yang `display:block` sesuai hash aktif — logic switch-nya di `app.js`. Mode Switcher adalah pill switcher di top bar, bukan sidebar link.

**A. Presentation Mode** (`#/presentation`)
Full-bleed, tanpa sidebar/filter. KPI besar, chart tren, donut kategori, top 5 temuan kritis. Tombol "Mulai Presentasi" → `requestFullscreen()`, auto-cycle 3-4 slide tiap 10 detik (`setInterval`, bisa di-pause), tombol next/prev manual, ESC keluar. Tidak ada elemen edit/hapus/input.

**B. Input Mode** (`#/input`)
Mobile-first, form stepper 1 kolom: (1) tanggal/area/kategori → (2) deskripsi & lokasi → (3) upload foto before → (4) PIC & departemen → (5) review & simpan. Tombol besar (≥44px tap area). Upload dari kamera (`<input type="file" accept="image/*" capture="environment">`), preview thumbnail, kompresi via `compress.js` sebelum submit. Setelah simpan: toast + opsi "Input temuan lain" (reset form tanpa reload halaman).

**C. Analytic Mode** (`#/analytic`)
Sidebar filter kiri (area, departemen, kategori, rentang tanggal, status, PIC) + area kanan dengan tab: **Ringkasan** (KPI + tren + donut), **Tabel Temuan** (sortable, klik baris → detail + riwayat aktivitas + foto before/after), **Laporan** (ekspor Excel via SheetJS, ekspor PDF via jsPDF+html2canvas, rekap bulanan otomatis).

## 7. Urutan Eksekusi

1. Review skeleton yang sudah ada (`index.html`, `css/styles.css`, `js/*.js`) — pastikan paham strukturnya sebelum menambah kode.
2. Salin `js/config.example.js` jadi `js/config.js`, minta user isi kredensial asli (JANGAN diisi sendiri dengan nilai palsu yang terlihat seperti nilai asli).
3. Terapkan `supabase/migrations/0001_init.sql` ke project Supabase user (manual via SQL editor kalau tidak ada CLI di environment ini) — catat statusnya di Progress.
4. Lengkapi `js/supabase-client.js` & `js/queries.js` — fungsi CRUD untuk `findings`, `finding_photos`, `activity_log`.
5. Lengkapi `js/compress.js` — fungsi kompresi foto pakai canvas.
6. Bangun Input Mode penuh: form stepper + validasi + submit ke Supabase + upload foto.
7. Bangun Analytic Mode penuh: filter + tabel + `js/charts.js` (Chart.js) + ekspor Excel/PDF.
8. Bangun Presentation Mode penuh: reuse chart dari Analytic, fullscreen + auto-cycle.
9. Tambahkan halaman/section login sederhana (email/password Supabase Auth), redirect ke mode terakhir dipakai (`localStorage`).
10. Polish: empty state, loading state, error state, cek responsive 375px/768px/1440px, keyboard focus visible, uji toggle tema di semua mode.
11. Siapkan file config hosting kalau perlu (`netlify.toml` cukup untuk redirect SPA-hash, tidak perlu build command). Dokumentasikan cara isi `js/config.js` di server produksi tanpa commit ke git.

## 8. Kriteria Selesai

- [x] Tidak ada file `package.json`/`node_modules`/build tool apa pun — proyek bisa dibuka langsung dengan live server statis
- [x] Toggle light/dark konsisten di 3 mode, tersimpan setelah reload
- [x] Input Mode penuh dipakai dari HP (form, kamera, kompresi, submit) tanpa layout rusak
- [x] Analytic Mode: filter benar-benar memfilter data dari Supabase, ekspor Excel & PDF jalan
- [x] Presentation Mode: fullscreen jalan, auto-cycle bisa di-pause, tidak ada elemen edit yang nyasar tampil
- [x] RLS aktif di semua tabel — akses tanpa login harus gagal
- [x] Tidak ada foto ter-upload tanpa kompresi lebih dulu
- [x] Semua warna & radius mengikuti token di `css/styles.css`, tidak ada warna hardcode baru

---

## Progress

> Update setiap selesai satu langkah dari `## 7. Urutan Eksekusi`. Tambahkan baris singkat kalau ada keputusan/asumsi penting.

- [x] Langkah 1 — Review skeleton
- [x] Langkah 2 — config.js diisi user
- [x] Langkah 3 — Migration diterapkan
- [x] Langkah 4 — supabase-client.js & queries.js
- [x] Langkah 5 — compress.js
- [x] Langkah 6 — Input Mode
- [x] Langkah 7 — Analytic Mode
- [x] Langkah 8 — Presentation Mode
- [x] Langkah 9 — Login
- [x] Langkah 10 — Polish
- [x] Langkah 11 — Deploy config

## Catatan Asumsi

> Tulis di sini kalau kamu (agent) mengambil keputusan sepihak karena spesifikasi ambigu.

- `js/config.js` sudah diisi kredensial Supabase asli oleh user.
- Migration `0001_init.sql` sudah diterapkan; RLS diverifikasi (request tanpa login mengembalikan array kosong).
- Seed dropdown: jalankan `supabase/migrations/0002_seed.sql` di SQL Editor jika area/kategori masih kosong.
- `netlify.toml` sudah ditambahkan untuk static hosting tanpa build step; dokumentasi pengisian `js/config.js` produksi ditulis di `js/config.example.js`.

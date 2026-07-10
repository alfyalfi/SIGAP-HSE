# Panduan Debug Developer SIGAP EHS

Dokumen ini dipakai saat aplikasi terasa lambat, muncul error, atau data foto tidak tampil semestinya.

## Prinsip utama

1. Prioritaskan sumber masalah di urutan ini: auth/session, query Supabase, storage foto, lalu rendering UI.
2. Setiap error yang tampil ke user harus punya `Error ID` agar mudah ditrace di log.
3. Untuk daftar data, ambil ringkasan dulu. Foto penuh hanya diambil saat detail dibuka.
4. Jangan memuat aset besar lebih awal kalau tidak diperlukan.

## Pola Error ID

Format umum:

`SIGAP-<SCOPE>-<TIMESTAMP>-<RANDOM>`

Contoh scope:

- `AUTH` untuk login dan session
- `ADMIN` untuk panel admin
- `FORM` untuk submit temuan
- `REPORT` untuk upload atau export laporan
- `CRON` untuk job berkala
- `SYS` untuk error sistem global

Saat mendapat laporan dari user:

1. Minta screenshot penuh atau copy pesan error.
2. Ambil `Error ID` yang tampil.
3. Cari ID itu di log browser, server log Vercel, atau console lokal.

## Alur cepat debugging

### 1. Login gagal atau redirect aneh

- Cek environment variable:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SIGAP_DEMO_PASSWORD`
  - `SIGAP_ADMIN_PIN`
- Cek `middleware.ts` dan `lib/supabase/middleware.ts`.
- Pastikan profile user ada di tabel `profiles`.

### 2. Halaman dashboard lambat

- Cek apakah query `findings` memuat foto untuk semua baris.
- Pastikan daftar hanya memuat data ringkas:
  - `code`
  - `title`
  - `status`
  - `area`
  - `category`
  - `photoCounts`
- Foto detail harus dimuat saat item dibuka, bukan saat list pertama kali render.

### 3. Upload foto lambat atau timeout

- Cek ukuran foto asli.
- Pastikan kompresi berjalan sebelum upload.
- Pastikan format hasil upload `webp` untuk foto temuan.
- Jika foto masih terlalu besar, turunkan `MAX_DIM` atau `QUALITY` di `lib/compress.ts`.

### 4. Foto tidak tampil

- Cek bucket storage:
  - `finding-photos`
  - `monthly-reports`
- Pastikan policy storage mengizinkan baca untuk user yang login.
- Pastikan `storage_path` tersimpan benar di tabel `finding_photos` atau `monthly_reports`.

### 5. Monthly report terasa berat

- File laporan tidak perlu diproses di browser.
- Upload file apa adanya.
- Hindari re-render list report yang tidak perlu.

## Titik cek performa

### Query Supabase

- Hindari pola N+1 query.
- Untuk list:
  - ambil semua temuan sekali
  - ambil foto ringkas sekali
  - hitung count di memori
- Untuk detail:
  - ambil foto lengkap hanya untuk 1 temuan

### React rendering

- Gunakan `useDeferredValue` untuk pencarian/filter yang sering berubah.
- Jangan me-render preview berat sebelum dibutuhkan.
- Buat komponen detail foto tetap terpisah dari daftar utama.

### Storage dan foto

- Simpan foto temuan dalam format `webp`.
- Kompres sebelum upload.
- Tampilkan thumbnail di list, full image hanya saat detail dibuka.

## Batas free tier Supabase

Rujukan resmi: [Supabase Pricing](https://supabase.com/pricing)

Ringkasan limit free tier yang relevan untuk SIGAP EHS:

- `500 MB` database size
- `1 GB` file storage
- `50,000` monthly active users
- unlimited API requests
- free projects dipause setelah `1 minggu` tidak aktif
- limit `2 active projects`

Implikasi praktis:

1. Jangan simpan foto resolusi mentah kalau tidak perlu.
2. Usahakan foto detail di bawah ukuran wajar setelah kompresi.
3. Hindari export atau preview yang memuat semua foto sekaligus.
4. Pantau folder storage lama dan hapus duplikat/dugaan sampah secara berkala.

## Checklist sebelum merge

1. `npm run lint`
2. `npm run typecheck`
3. Buka dashboard dan pastikan daftar temuan tidak lambat saat data banyak.
4. Buka detail temuan dan pastikan thumbnail bisa diklik menjadi full view.
5. Upload foto uji dan pastikan toast error memunculkan `Error ID` bila gagal.


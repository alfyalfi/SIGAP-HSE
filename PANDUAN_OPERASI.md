# Panduan Operasi — SIGAP HSE (Final)

## Login

### User / PIC (11 Perusahaan)
1. Pilih tab **User / PIC**
2. Pilih nama perusahaan dari dropdown (PT.Dummy 01 – PT.Dummy 11)
3. Klik **Masuk** — tanpa password

Setiap perusahaan hanya melihat data temuan miliknya sendiri.

### Admin
1. Pilih tab **Admin**
2. Email: `admin@sigap.com` (otomatis terisi)
3. PIN: `152114`
4. Klik **Masuk sebagai Admin**

---

## Role & Hak Akses

| Role | Login | Hak Akses |
|------|-------|-----------|
| **field_staff** (PIC) | Dropdown PT.Dummy | Input temuan, update tindak lanjut (open→progress), upload monthly report, lihat dashboard sendiri |
| **admin** | Email + PIN | Lihat semua temuan, approve progress→closed, hapus temuan |

---

## Alur User (PIC)

### 1. Form Temuan
**Langkah 1 — Info Dasar**
- Nama PT (otomatis, tidak bisa diubah)
- Tanggal & waktu (klik **Sekarang** untuk isi otomatis)
- Area & Kategori

**Langkah 2 — Foto & Deskripsi**
- Upload foto temuan (dikompresi otomatis)
- Isi deskripsi foto/temuan

**Langkah 3 — Review & Submit**
- Cek ulang data → **Submit Temuan**
- Status awal: **Open** (merah)

### 2. Dashboard
- Lihat semua temuan perusahaan Anda
- Klik baris berstatus **Open** → popup "Update Temuan?"
  - **Tidak** → batal
  - **Ya** → form update:
    1. Upload foto **after** + tanggal penyelesaian (tidak boleh sebelum tanggal temuan)
    2. Review → Submit
- Setelah submit update: status berubah ke **On Progress** (kuning)

### 3. Monthly Report
- Pilih bulan laporan
- Upload file Excel (.xlsx)
- Riwayat upload tampil di sisi kanan

---

## Alur Admin

### Dashboard
Melihat semua temuan dari seluruh perusahaan beserta statusnya.

### Approval
- Temuan berstatus **On Progress** muncul di halaman Approval
- Admin review foto before/after dan detail
- Klik **Setujui (Closed)** → status berubah **Closed** (hijau)

---

## Status Temuan

| Status | Warna | Arti |
|--------|-------|------|
| Open | Merah | Temuan baru, belum ditindaklanjuti |
| On Progress | Kuning | User sudah upload foto after, menunggu approval admin |
| Closed | Hijau | Disetujui admin, selesai |

---

## Setup Awal (Admin IT)

### 1. Migration database
Jalankan berurutan di Supabase SQL Editor:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_seed.sql`
3. `supabase/migrations/0003_finalize.sql`

### 2. Buat 12 user di Supabase Auth
Password semua user: `sigap-demo-2024` (centang Auto Confirm)

| Email | Role | Nama |
|-------|------|------|
| admin@sigap.com | admin | Administrator SIGAP |
| pt-dummy-01@sigap.com | field_staff | PT.Dummy 01 |
| pt-dummy-02@sigap.com | field_staff | PT.Dummy 02 |
| ... | ... | ... |
| pt-dummy-11@sigap.com | field_staff | PT.Dummy 11 |

### 3. Set role profil
Jalankan `supabase/migrations/0004_seed_users.sql`

### 4. Config aplikasi
Isi `js/config.js` dengan URL dan anon key Supabase.

### 5. Storage buckets
Pastikan bucket ada:
- `finding-photos` (public)
- `monthly-reports` (private)

---

## Menjalankan Lokal

```bash
py -m http.server 8000
```

Buka `http://localhost:8000`

---

*SIGAP HSE — Panduan Operasi Final v2.0*

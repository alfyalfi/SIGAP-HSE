# Panduan Operasi — SIGAP HSE v1

## Login

### User / PIC (12 Perusahaan)
1. Tab **User / PIC**
2. Pilih perusahaan dari dropdown
3. Klik **Masuk** — tanpa password

Setiap PIC hanya melihat temuan miliknya (RLS).

### Admin
1. Tab **Admin**
2. Email: `admin@sigap.com`
3. PIN: **6–8 digit angka** (sesuai `SIGAP_ADMIN_PIN` di server)
4. Klik **Masuk sebagai Admin**

> Cara mengubah PIN: lihat [`PANDUAN_PIN_ADMIN.md`](./PANDUAN_PIN_ADMIN.md)

---

## Role & Hak Akses

| Role | Hak Akses |
|------|-----------|
| **field_staff** (PIC) | Form before, form after, dashboard sendiri, monthly report |
| **admin** | Semua temuan, approve/reject, analisis, laporan, master PIC |

PIC **tidak bisa** menghapus temuan.

---

## Alur PIC

### 1. Form Temuan (Before) — `/form`
**Slide 1:** PT (fixed), judul, area (teks bebas), tikor (opsional), kategori  
**Slide 2:** Foto before + deskripsi  
**Slide 3:** Review → konfirmasi → submit → status **Open**

### 2. Form After — `/form-after/[id]`
Diakses dari dashboard (klik temuan **Open** atau **Rejected**).  
**Slide 1:** Data before (readonly), upload foto after + deskripsi tindak lanjut  
**Slide 2:** Review → submit → status **On Progress**

### 3. Dashboard — `/dashboard`
- KPI: Total, Open, On Progress, Closed, Rejected
- Filter status / area / tanggal
- Tombol **Segarkan**

### 4. Monthly Report — `/monthly`
- Input tanggal + tombol **Sekarang**
- Upload file laporan (semua format)

---

## Alur Admin — `/admin/dashboard`

Panel sidebar dengan 5 area:

| Menu | Fungsi |
|------|--------|
| Dashboard | KPI, chart, temuan terbaru |
| Daftar Temuan | Tabel lengkap + filter + export CSV |
| Analisis Tren | Visualisasi performa |
| Laporan | Generator ekspor dokumen |
| Master PIC | Kelola nama PIC (edit/nonaktifkan) |

**Approval:** Buka detail temuan berstatus **On Progress** → **Setujui (Closed)** atau **Tolak (Rejected)**.

Temuan **Rejected** dapat diperbaiki PIC lewat form after.

---

## Status Temuan

| Status | Arti |
|--------|------|
| **Open** | Menunggu data after |
| **On Progress** | Menunggu approval admin |
| **Closed** | Disetujui, selesai |
| **Rejected** | Ditolak admin, perlu perbaikan |

---

## Setup Awal (Admin IT)

### 1. Migration database
Jalankan berurutan di Supabase SQL Editor:
1. `0001_init.sql` → `0002_seed.sql` → `0003_finalize.sql`
2. `0005_sigap_v1.sql` → `0006_rejected_resubmit.sql`

### 2. Buat user auth
Jalankan `supabase/scripts/create_sigap_users.sql` (13 akun sekaligus).

Password default script harus sama dengan `SIGAP_DEMO_PASSWORD`.

### 3. Environment aplikasi
```bash
copy .env.local.example .env.local
```
Isi URL, anon key, password demo, dan PIN admin (6–8 digit).

### 4. Storage buckets
Pastikan ada di Supabase Storage:
- `finding-photos` (public)
- `monthly-reports` (private)

### 5. Jalankan lokal
```bash
npm install
npm run dev
```

---

*SIGAP HSE — Panduan Operasi v1.0*

# SIGAP HSE

**Sistem Informasi Guna Audit dan Penyelesaian** — aplikasi pelaporan dan tindak lanjut temuan Health, Safety & Environment.

**Versi rilis production:** v1.0

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Backend | Supabase (Auth, Postgres, Storage, RLS) |
| Deploy | Vercel (recommended) |

## Quick Start

```bash
npm install
copy .env.local.example .env.local   # Windows
# Isi 5 variabel env (lihat bawah)

npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Environment Variables

Salin `.env.local.example` → `.env.local`:

| Variable | Scope | Keterangan |
|----------|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key Supabase |
| `SIGAP_DEMO_PASSWORD` | Server only | Password semua akun demo PIC/admin |
| `SIGAP_ADMIN_PIN` | Server only | PIN login admin (**6–8 digit angka**) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Dipakai heartbeat harian agar Supabase tetap aktif |

> **Jangan** commit `.env.local`. Semua 5 variabel wajib diisi — tidak ada fallback default di production.

Cara ubah PIN admin: [`PANDUAN_PIN_ADMIN.md`](./PANDUAN_PIN_ADMIN.md)

## Database Setup

Jalankan **berurutan** di Supabase SQL Editor:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_seed.sql`
3. `supabase/migrations/0003_finalize.sql`
4. `supabase/migrations/0005_sigap_v1.sql`
5. `supabase/migrations/0006_rejected_resubmit.sql`
6. `supabase/scripts/create_sigap_users.sql` — buat 13 user auth sekaligus

Opsional: `0004_seed_users.sql` hanya jika user sudah dibuat manual lewat dashboard.

## Login

| Role | Cara masuk |
|------|------------|
| **PIC** | Pilih perusahaan dari dropdown (12 PT) — tanpa password |
| **Admin** | `admin@sigap.com` + PIN dari `SIGAP_ADMIN_PIN` |

## Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Jalankan build produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Struktur Proyek

```
app/                    Halaman & API routes
components/             UI PIC + admin
components/admin/       Panel admin (sidebar workspace)
lib/                    Supabase, queries, constants
supabase/migrations/    Schema SQL
supabase/scripts/       Utilitas SQL (buat user)
```

## Deploy Vercel

1. Push repo ke GitHub
2. Import project di Vercel
3. Set **5 environment variables** (sama seperti `.env.local`)
4. Deploy

Error `MIDDLEWARE_INVOCATION_FAILED` = env Supabase belum diisi di Vercel.

## Heartbeat Harian Supabase

Project ini sekarang punya endpoint ringan:

- `GET /api/cron/supabase-heartbeat`

Di Vercel, endpoint itu dipanggil otomatis setiap hari pukul `17:00 UTC` melalui `vercel.json` supaya Supabase tetap dapat trafik minimal dan tidak cepat pause karena idle.

Yang perlu diset di Vercel:

1. `SUPABASE_SERVICE_ROLE_KEY`
2. Deploy ulang project

Kalau deploy bukan di Vercel, tetap bisa pakai endpoint yang sama dari scheduler eksternal lain.

## Dokumentasi

- [`PANDUAN_OPERASI.md`](./PANDUAN_OPERASI.md) — panduan pengguna PIC & admin
- [`PANDUAN_PIN_ADMIN.md`](./PANDUAN_PIN_ADMIN.md) — ubah PIN admin
- [`PANDUAN_PUSH_GITHUB.md`](./PANDUAN_PUSH_GITHUB.md) — push & deploy
- [`PROJECT.md`](./PROJECT.md) — ringkasan arsitektur

---

*SIGAP HSE v1.0*

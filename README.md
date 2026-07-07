# SIGAP HSE

Sistem monitoring temuan Health, Safety & Environment — **Next.js 15** + Supabase.

## Stack

- **Next.js 15** (App Router)
- **React 19**
- **Supabase** (Auth, Postgres, Storage)
- **TypeScript**

## Setup

```bash
# Install dependencies
npm install

# Salin env template
copy .env.local.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SIGAP_DEMO_PASSWORD

# Jalankan development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Jalankan build produksi |

## Struktur

```
app/                  → Halaman & routing (App Router)
components/           → UI components
lib/                  → Supabase client, queries, utils
supabase/migrations/  → SQL schema & seed
legacy/               → Arsip app vanilla JS (v1)
```

## Login

- **User/PIC:** dropdown PT.Dummy 01–11 (tanpa password)
- **Admin:** `admin@sigap.com` + PIN `152114`

## Dokumentasi

- `PANDUAN_OPERASI.md` — panduan pengguna
- `PANDUAN_PUSH_GITHUB.md` — panduan deploy ke GitHub
- `PROJECT.md` — spesifikasi teknis awal

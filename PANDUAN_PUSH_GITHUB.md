# Panduan Push SIGAP-EHS ke GitHub & Deploy

Repo git berada di folder project: `sigap-project/` (bukan folder user).

---

## 1. File yang BOLEH di-push

| Folder / File | Keterangan |
|---------------|------------|
| `app/` | Halaman Next.js & API routes |
| `components/` | UI components |
| `lib/` | Supabase client, queries, utils |
| `supabase/` | Migrations & scripts SQL |
| `package.json`, `package-lock.json` | Dependencies |
| `next.config.ts`, `tsconfig.json` | Konfigurasi |
| `.env.local.example` | Template env (placeholder) |
| `.gitignore` | Aturan ignore |
| `README.md`, `PANDUAN_*.md` | Dokumentasi |

---

## 2. File yang TIDAK BOLEH di-push

| File | Alasan |
|------|--------|
| `.env.local` | Secret (password, PIN, keys) |
| `node_modules/` | Dependencies (install ulang) |
| `.next/` | Build cache |

---

## 3. Perintah push

```powershell
cd "C:\Users\Zyrex\Music\sigap-project"

git status
git add .
git status   # pastikan .env.local TIDAK muncul

git commit -m "release: SIGAP EHS v1.0 production ready"
git push -u origin main
```

Repo GitHub: `https://github.com/alfyalfi/SIGAP-EHS.git`

---

## 4. Deploy Vercel

1. Import repo `SIGAP-EHS` di [vercel.com](https://vercel.com)
2. Framework: **Next.js** (auto-detect)
3. Tambahkan environment variables:

| Variable | Wajib |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SIGAP_DEMO_PASSWORD` | ✅ |
| `SIGAP_ADMIN_PIN` | ✅ (6–8 digit angka) |

4. Deploy → pastikan build sukses
5. Uji login PIC & admin di URL production

---

## 5. Verifikasi sebelum push

```powershell
git check-ignore -v .env.local
npm run build
npm run typecheck
```

---

## 6. Setup di mesin baru

```powershell
git clone https://github.com/alfyalfi/SIGAP-EHS.git
cd SIGAP-EHS
npm install
copy .env.local.example .env.local
# Edit .env.local — isi kredensial Supabase & secrets
npm run dev
```

---

*SIGAP-EHS — Panduan Push & Deploy v1.0*

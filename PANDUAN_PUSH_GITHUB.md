# Panduan Push SIGAP-HSE ke GitHub

Repo ini **harus** punya git sendiri di folder project (bukan di folder `C:\Users\Zyrex`).

---

## 1. File yang BOLEH di-push

| File / Folder | Keterangan |
|---------------|------------|
| `index.html` | Halaman utama aplikasi |
| `css/styles.css` | Stylesheet |
| `js/app.js` | Logic aplikasi |
| `js/queries.js` | Query Supabase |
| `js/compress.js` | Kompresi foto |
| `js/users.js` | Daftar PT & admin (tanpa secret) |
| `js/supabase-client.js` | Init client |
| `js/config.example.js` | Template config (placeholder) |
| `js/charts.js` | Helper chart (legacy) |
| `supabase/migrations/*.sql` | Schema & seed database |
| `netlify.toml` | Config deploy statis |
| `PROJECT.md` | Dokumentasi teknis |
| `PANDUAN_OPERASI.md` | Panduan pengguna |
| `PANDUAN_PUSH_GITHUB.md` | File ini |
| `.gitignore` | Aturan ignore |
| `.env.example` | Template env (placeholder) |

---

## 2. File yang TIDAK BOLEH di-push

| File | Alasan |
|------|--------|
| `js/config.js` | Berisi URL & anon key Supabase asli |
| `.env` | Berisi secret environment |
| `.DS_Store`, `Thumbs.db` | File sistem |

> Setelah clone di mesin lain / deploy produksi, salin `js/config.example.js` → `js/config.js` lalu isi kredensial asli **di server lokal**, jangan lewat git.

---

## 3. Perintah push dari terminal

Buka PowerShell, lalu jalankan **satu per satu**:

```powershell
# Masuk ke folder project
cd "C:\Users\Zyrex\Music\sigap-project"

# Inisialisasi repo (hanya sekali, lewati jika sudah ada folder .git)
git init

# Pastikan config.js tidak ikut ter-track
git check-ignore -v js/config.js

# Stage semua file aman
git add .

# Cek apa yang akan di-commit (pastikan config.js TIDAK muncul)
git status

# Commit pertama
git commit -m "Initial commit: SIGAP HSE monitoring app"

# Buat repo kosong di GitHub dulu:
# https://github.com/new → nama repo: SIGAP-HSE → jangan centang README

# Hubungkan remote (ganti USERNAME jika perlu)
git remote add origin https://github.com/alfyalfi/SIGAP-HSE.git

# Push ke GitHub
git branch -M main
git push -u origin main
```

Jika remote `origin` sudah pernah ada dengan URL lain:

```powershell
git remote set-url origin https://github.com/alfyalfi/SIGAP-HSE.git
git push -u origin main
```

---

## 4. Verifikasi sebelum push

Jalankan:

```powershell
git status
git ls-files
git check-ignore -v js/config.js
```

**Harus terlihat:**
- `git check-ignore` menampilkan rule `.gitignore` untuk `js/config.js`
- `git ls-files` **tidak** memuat `js/config.js`
- `git ls-files` **memuat** `js/config.example.js`

---

## 5. Setelah push — setup di mesin baru

```powershell
git clone https://github.com/alfyalfi/SIGAP-HSE.git
cd SIGAP-HSE
copy js\config.example.js js\config.js
# Edit js\config.js — isi url & anonKey Supabase asli
py -m http.server 8000
```

---

## 6. Deploy Netlify (opsional)

1. Connect repo `SIGAP-HSE` di Netlify
2. Build command: *(kosongkan)*
3. Publish directory: `/`
4. Setelah deploy, tambahkan `js/config.js` lewat Netlify file editor atau build hook internal — **jangan commit ke git**

---

*SIGAP-HSE — Panduan Push GitHub*

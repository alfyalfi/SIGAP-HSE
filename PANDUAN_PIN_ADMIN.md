# Panduan Ubah PIN Admin — SIGAP HSE

PIN admin disimpan **hanya di server**, bukan di database Supabase. Aplikasi membacanya dari variabel environment `SIGAP_ADMIN_PIN`.

## Aturan PIN

| Aturan | Nilai |
|--------|--------|
| Panjang | **6–8 digit** |
| Karakter | Angka saja (`0`–`9`) |
| Contoh valid | `152114`, `8844221`, `12345678` |
| Contoh tidak valid | `12345` (kurang), `123456789` (kepanjangan), `12ab56` (bukan angka) |

---

## 1. Ubah PIN di komputer lokal (development)

1. Buka file `.env.local` di folder project:

```
C:\Users\Zyrex\Music\sigap-project\.env.local
```

2. Ubah baris `SIGAP_ADMIN_PIN`:

```env
SIGAP_ADMIN_PIN=884422
```

3. **Simpan** file.

4. **Restart** dev server (wajib — env hanya dibaca saat server start):

```powershell
# Hentikan server (Ctrl+C), lalu:
npm run dev
```

5. Buka `http://localhost:3000/login` → tab **Admin** → masuk dengan PIN baru.

> PIN lama langsung tidak berlaku setelah restart server.

---

## 2. Ubah PIN di Vercel (production)

1. Login [vercel.com](https://vercel.com) → pilih project **SIGAP-HSE**
2. **Settings** → **Environment Variables**
3. Cari `SIGAP_ADMIN_PIN` → klik **Edit** (atau **Add** jika belum ada)
4. Isi PIN baru (6–8 digit angka)
5. Centang environment: **Production**, **Preview**, **Development** (sesuai kebutuhan)
6. **Save**
7. **Deployments** → deployment terbaru → **⋯** → **Redeploy**

Tanpa redeploy, PIN lama masih dipakai di server production.

---

## 3. Checklist setelah ganti PIN

- [ ] PIN baru 6–8 digit angka
- [ ] `.env.local` sudah disimpan (lokal)
- [ ] Dev server sudah di-restart (lokal)
- [ ] Vercel env sudah di-update + **Redeploy** (production)
- [ ] Uji login admin di browser / HP
- [ ] Beritahu admin lain PIN baru lewat channel aman (bukan chat publik)

---

## 4. Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| "PIN salah" | PIN tidak cocok dengan env | Cek typo, pastikan tidak ada spasi |
| "PIN harus 6–8 digit angka" | Format salah | Gunakan hanya angka, 6–8 karakter |
| "Server secrets belum dikonfigurasi" | Env kosong / placeholder | Isi `SIGAP_ADMIN_PIN` di `.env.local` atau Vercel |
| PIN baru tidak jalan (lokal) | Server belum restart | Stop + `npm run dev` lagi |
| PIN baru tidak jalan (Vercel) | Belum redeploy | Redeploy setelah ubah env |

---

## 5. Keamanan

- Jangan commit `.env.local` ke GitHub
- Jangan tulis PIN di kode sumber (`LoginForm.tsx`, dll.)
- Ganti PIN secara berkala jika banyak orang tahu PIN lama
- PIN berbeda dari `SIGAP_DEMO_PASSWORD` (password akun Supabase Auth)

---

*SIGAP HSE v1.0 — Panduan PIN Admin*

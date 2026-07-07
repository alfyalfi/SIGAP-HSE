# SIGAP HSE — Ringkasan Arsitektur

## Versi

**v1.0** — rilis production pertama (Next.js 15 App Router + Supabase)

## Alur Autentikasi

```
Login PIC  → POST /api/auth/login { type: "user", companyId }
           → server signInWithPassword(company.email, SIGAP_DEMO_PASSWORD)

Login Admin → POST /api/auth/login { type: "admin", pin }
            → verifikasi SIGAP_ADMIN_PIN server-side (6–8 digit)
            → signInWithPassword(admin@sigap.com, SIGAP_DEMO_PASSWORD)
```

Password tidak pernah dikirim dari browser PIC. PIN tidak disimpan di client.

## Alur Temuan

```
PIC: Form Before → status open
PIC: Form After  → status progress
Admin: Approve   → status closed
Admin: Reject    → status rejected → PIC bisa kirim ulang after
```

## Keamanan

- Row Level Security (RLS) di Postgres
- PIC hanya baca/tulis temuan sendiri
- Admin full read + update status
- Env secrets hanya di server (`SIGAP_*`)
- PIN admin: 6–8 digit, validasi di client + server
- Security headers di `next.config.ts`
- `robots: noindex` — aplikasi internal

## Route Map

| Path | Akses |
|------|-------|
| `/login` | Public |
| `/form`, `/dashboard`, `/monthly`, `/form-after/[id]` | PIC |
| `/admin/dashboard` | Admin |

Middleware: `lib/supabase/middleware.ts` — session + role guard.

---

Lihat `README.md` untuk setup lengkap. Ubah PIN: `PANDUAN_PIN_ADMIN.md`.

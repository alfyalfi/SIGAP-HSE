# Supabase — SIGAP HSE

## Urutan migration

| # | File | Isi |
|---|------|-----|
| 1 | `0001_init.sql` | Schema awal + RLS |
| 2 | `0002_seed.sql` | Data area & kategori |
| 3 | `0003_finalize.sql` | Kolom temuan + monthly reports |
| 4 | `0005_sigap_v1.sql` | Field temuan v1 + status rejected |
| 5 | `0006_rejected_resubmit.sql` | Policy resubmit PIC |
| — | `0004_seed_users.sql` | Update profil (opsional, jika user manual) |

## Buat user auth

Jalankan **`scripts/create_sigap_users.sql`** — membuat 13 akun sekaligus (admin + 12 PIC).

Password default di script harus sama dengan `SIGAP_DEMO_PASSWORD` di `.env.local`.

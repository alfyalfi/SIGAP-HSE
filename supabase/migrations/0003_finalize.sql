-- Finalisasi SIGAP HSE: kolom baru, RLS per perusahaan, laporan bulanan.
-- Jalankan setelah 0001_init.sql dan 0002_seed.sql.

alter table findings
  add column if not exists found_datetime timestamptz,
  add column if not exists photo_description text,
  add column if not exists resolved_datetime timestamptz,
  add column if not exists company_name text;

update findings
set found_datetime = coalesce(found_datetime, (found_at::text || ' 00:00:00')::timestamptz)
where found_datetime is null and found_at is not null;

create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references profiles(id) on delete set null,
  company_name text not null,
  report_month date not null,
  storage_path text not null,
  file_name text,
  created_at timestamptz default now()
);

alter table monthly_reports enable row level security;

-- findings: user hanya lihat & kelola milik sendiri; admin lihat semua
drop policy if exists "findings_read" on findings;
create policy "findings_read" on findings for select using (
  auth.uid() = created_by
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "findings_insert_own" on findings;
create policy "findings_insert_own" on findings for insert with check (
  auth.uid() = created_by
);

drop policy if exists "findings_update_hse_role" on findings;
drop policy if exists "findings_update_own_progress" on findings;
drop policy if exists "findings_update_admin" on findings;

-- User: update open -> progress (setelah upload after)
create policy "findings_update_own_progress" on findings for update using (
  auth.uid() = created_by and status = 'open'
) with check (status = 'progress');

-- Admin: approve progress -> closed, atau update lainnya
create policy "findings_update_admin" on findings for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "findings_delete_admin" on findings;
create policy "findings_delete_admin" on findings for delete using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- monthly_reports
drop policy if exists "monthly_read" on monthly_reports;
create policy "monthly_read" on monthly_reports for select using (
  auth.uid() = uploaded_by
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "monthly_insert" on monthly_reports;
create policy "monthly_insert" on monthly_reports for insert with check (
  auth.uid() = uploaded_by
);

-- Storage bucket laporan bulanan
insert into storage.buckets (id, name, public)
values ('monthly-reports', 'monthly-reports', false)
on conflict (id) do nothing;

drop policy if exists "monthly_reports_bucket_read" on storage.objects;
create policy "monthly_reports_bucket_read" on storage.objects
  for select using (
    bucket_id = 'monthly-reports'
    and auth.role() = 'authenticated'
  );

drop policy if exists "monthly_reports_bucket_insert" on storage.objects;
create policy "monthly_reports_bucket_insert" on storage.objects
  for insert with check (
    bucket_id = 'monthly-reports'
    and auth.role() = 'authenticated'
  );

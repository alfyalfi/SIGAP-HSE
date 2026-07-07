-- SIGAP HSE — initial schema & RLS
-- Jalankan file ini di Supabase SQL editor, atau via `supabase db push` jika pakai Supabase CLI.

create extension if not exists "pgcrypto";

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('admin','hse_officer','field_staff','viewer')) default 'field_staff',
  created_at timestamptz default now()
);

create sequence if not exists findings_code_seq start 1;

create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default ('HSE-' || lpad(nextval('findings_code_seq')::text, 4, '0')),
  found_at date not null default current_date,
  area_id uuid references areas(id),
  location_detail text,
  latitude numeric,
  longitude numeric,
  category_id uuid references categories(id),
  description text not null,
  pic_id uuid references profiles(id),
  department text,
  status text check (status in ('open','progress','pending','closed')) default 'open',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists finding_photos (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid references findings(id) on delete cascade,
  stage text check (stage in ('before','after')) not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid references findings(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null, -- 'created' | 'status_changed' | 'photo_uploaded' | 'commented'
  detail text,
  created_at timestamptz default now()
);

-- trigger: auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_findings_updated_at on findings;
create trigger trg_findings_updated_at
  before update on findings
  for each row execute function set_updated_at();

-- trigger: auto-create profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security
alter table areas enable row level security;
alter table categories enable row level security;
alter table profiles enable row level security;
alter table findings enable row level security;
alter table finding_photos enable row level security;
alter table activity_log enable row level security;

-- areas & categories: baca bebas untuk user login, tulis hanya admin
create policy "areas_read" on areas for select using (auth.role() = 'authenticated');
create policy "areas_write_admin" on areas for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "categories_read" on categories for select using (auth.role() = 'authenticated');
create policy "categories_write_admin" on categories for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- profiles: user boleh baca semua profile (untuk dropdown PIC), update hanya dirinya sendiri
create policy "profiles_read" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- findings
create policy "findings_read" on findings for select using (auth.role() = 'authenticated');
create policy "findings_insert_own" on findings for insert with check (auth.uid() = created_by);
create policy "findings_update_hse_role" on findings for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','hse_officer'))
);
create policy "findings_delete_admin" on findings for delete using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- finding_photos
create policy "photos_read" on finding_photos for select using (auth.role() = 'authenticated');
create policy "photos_insert_own" on finding_photos for insert with check (auth.uid() = uploaded_by);
create policy "photos_delete_hse_role" on finding_photos for delete using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','hse_officer'))
);

-- activity_log
create policy "activity_read" on activity_log for select using (auth.role() = 'authenticated');
create policy "activity_insert_own" on activity_log for insert with check (auth.uid() = actor_id);

-- Storage bucket untuk foto temuan (jalankan lewat Supabase dashboard kalau statement ini tidak didukung SQL editor)
insert into storage.buckets (id, name, public)
values ('finding-photos', 'finding-photos', true)
on conflict (id) do nothing;

create policy "finding_photos_bucket_read" on storage.objects
  for select using (bucket_id = 'finding-photos');

create policy "finding_photos_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'finding-photos' and auth.role() = 'authenticated');

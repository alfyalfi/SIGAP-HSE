-- Admin media controls: monthly report cleanup, PIC logo, and storage helpers.

alter table profiles
  add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('profile-logos', 'profile-logos', true)
on conflict (id) do nothing;

drop policy if exists "profile_logos_bucket_insert" on storage.objects;
create policy "profile_logos_bucket_insert" on storage.objects
  for insert with check (
    bucket_id = 'profile-logos'
    and auth.role() = 'authenticated'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "profile_logos_bucket_delete" on storage.objects;
create policy "profile_logos_bucket_delete" on storage.objects
  for delete using (
    bucket_id = 'profile-logos'
    and auth.role() = 'authenticated'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

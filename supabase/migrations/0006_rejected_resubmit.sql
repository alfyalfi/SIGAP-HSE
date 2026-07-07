-- PIC boleh kirim ulang data after dari status open atau rejected
drop policy if exists "findings_update_own_progress" on findings;
create policy "findings_update_own_progress" on findings for update using (
  auth.uid() = created_by and status in ('open', 'rejected')
) with check (status = 'progress');

-- Admin boleh mengelola profil PIC
drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

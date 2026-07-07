-- SIGAP v1: field temuan baru, status rejected, PIC active flag

alter table profiles
  add column if not exists is_active boolean default true;

alter table findings
  add column if not exists title text,
  add column if not exists area_text text,
  add column if not exists category_text text,
  add column if not exists tikor text,
  add column if not exists after_description text;

alter table monthly_reports
  add column if not exists report_date date;

update findings set area_text = coalesce(area_text, location_detail) where area_text is null;
update findings set title = coalesce(title, description) where title is null;

alter table findings drop constraint if exists findings_status_check;
alter table findings add constraint findings_status_check
  check (status in ('open', 'progress', 'closed', 'rejected'));

-- Admin boleh update status (approve/reject)
drop policy if exists "findings_update_admin" on findings;
create policy "findings_update_admin" on findings for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- PIC update open/rejected -> progress: lihat 0006_rejected_resubmit.sql

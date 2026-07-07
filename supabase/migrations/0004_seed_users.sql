-- Set profil setelah user dibuat via supabase/scripts/create_sigap_users.sql
-- File ini TIDAK membuat user auth — gunakan script tersebut untuk buat user sekaligus.
--
-- Jika user sudah ada manual, jalankan update di bawah:

update profiles set role = 'admin', full_name = 'Administrator SIGAP', is_active = true
where id = (select id from auth.users where email = 'admin@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT Lautan Jaya Semesta', is_active = true
where id = (select id from auth.users where email = 'pt-ljs@sigap.com');

update profiles set role = 'field_staff', full_name = 'WIMAS', is_active = true
where id = (select id from auth.users where email = 'wimas@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT CENTRINDO PALMAX', is_active = true
where id = (select id from auth.users where email = 'pt-centrindo@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT PATAMA ADIJAYA STEEL', is_active = true
where id = (select id from auth.users where email = 'pt-patama@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT GUNA TEKNIK PERKASA', is_active = true
where id = (select id from auth.users where email = 'pt-guna@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT AURA MUDA PRATAMA', is_active = true
where id = (select id from auth.users where email = 'pt-aura@sigap.com');

update profiles set role = 'field_staff', full_name = 'CV LANCAR UTAMA CIPTA KARYA', is_active = true
where id = (select id from auth.users where email = 'cv-lancar@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT RAVI JAYA MANDIRI', is_active = true
where id = (select id from auth.users where email = 'pt-ravi@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT RIZAL BERKAH BERSAMA', is_active = true
where id = (select id from auth.users where email = 'pt-rizal@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT MUAZTA BINAKA SEJAHTERA', is_active = true
where id = (select id from auth.users where email = 'pt-muazta@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT CAKRA INDO PRATAMA', is_active = true
where id = (select id from auth.users where email = 'pt-cakra@sigap.com');

update profiles set role = 'field_staff', full_name = 'CV PUTRI PRATAMA', is_active = true
where id = (select id from auth.users where email = 'cv-putri@sigap.com');

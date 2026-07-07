-- INSTRUKSI: Buat 12 user di Supabase Dashboard → Authentication → Users
-- Password semua user (termasuk admin): sigap-demo-2024
-- Centang "Auto Confirm User" untuk setiap user.
--
-- Email yang harus dibuat:
--   admin@sigap.com          (role: admin)
--   pt-dummy-01@sigap.com    (role: field_staff, nama: PT.Dummy 01)
--   pt-dummy-02@sigap.com    ... sampai ...
--   pt-dummy-11@sigap.com    (role: field_staff, nama: PT.Dummy 11)
--
-- Setelah user dibuat, jalankan SQL di bawah ini:

update profiles set role = 'admin', full_name = 'Administrator SIGAP'
where id = (select id from auth.users where email = 'admin@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 01'
where id = (select id from auth.users where email = 'pt-dummy-01@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 02'
where id = (select id from auth.users where email = 'pt-dummy-02@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 03'
where id = (select id from auth.users where email = 'pt-dummy-03@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 04'
where id = (select id from auth.users where email = 'pt-dummy-04@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 05'
where id = (select id from auth.users where email = 'pt-dummy-05@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 06'
where id = (select id from auth.users where email = 'pt-dummy-06@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 07'
where id = (select id from auth.users where email = 'pt-dummy-07@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 08'
where id = (select id from auth.users where email = 'pt-dummy-08@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 09'
where id = (select id from auth.users where email = 'pt-dummy-09@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 10'
where id = (select id from auth.users where email = 'pt-dummy-10@sigap.com');

update profiles set role = 'field_staff', full_name = 'PT.Dummy 11'
where id = (select id from auth.users where email = 'pt-dummy-11@sigap.com');

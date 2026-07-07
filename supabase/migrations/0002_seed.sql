-- Seed data awal untuk dropdown area & kategori.
-- Jalankan di Supabase SQL Editor setelah 0001_init.sql.
-- Aman dijalankan ulang: hanya insert jika tabel masih kosong.

insert into areas (name)
select v.name
from (values
  ('Site Office'),
  ('Tower A'),
  ('Tower B'),
  ('Basement'),
  ('Area Parkir')
) as v(name)
where not exists (select 1 from areas);

insert into categories (name)
select v.name
from (values
  ('K3 Umum'),
  ('APAR & Hydrant'),
  ('Peralatan Kerja'),
  ('Lingkungan'),
  ('Kesehatan Kerja')
) as v(name)
where not exists (select 1 from categories);

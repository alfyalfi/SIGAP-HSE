-- =============================================================================
-- SIGAP HSE — Buat 13 user Auth sekaligus
-- Jalankan di: Supabase Dashboard → SQL Editor → New query → Run
--
-- Prasyarat: migration 0005 (kolom is_active) sudah dijalankan.
-- Password semua akun: sigap-demo-2024
-- Aman dijalankan ulang: user yang sudah ada akan dilewati.
-- =============================================================================

create extension if not exists "pgcrypto";

create or replace function public.sigap_upsert_auth_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text default 'field_staff'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
begin
  select id into v_user_id
  from auth.users
  where email = lower(p_email);

  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      v_encrypted_pw,
      now(),
      now(),
      '',
      now(),
      '',
      now(),
      '',
      '',
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name),
      false,
      now(),
      now(),
      null,
      null,
      '',
      '',
      now(),
      '',
      0,
      null,
      '',
      now(),
      false,
      null,
      false
    );

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', lower(p_email),
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('full_name', p_full_name),
      updated_at = now()
    where id = v_user_id;
  end if;

  insert into public.profiles (id, full_name, role, is_active)
  values (v_user_id, p_full_name, p_role, true)
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role,
    is_active = true;

  return v_user_id;
end;
$$;

-- Ganti password di sini jika perlu (harus sama dengan SIGAP_DEMO_PASSWORD di .env / Vercel)
do $$
declare
  pw text := 'sigap-demo-2024';
begin
  perform public.sigap_upsert_auth_user('admin@sigap.com', pw, 'Administrator SIGAP', 'admin');
  perform public.sigap_upsert_auth_user('pt-ljs@sigap.com', pw, 'PT Lautan Jaya Semesta', 'field_staff');
  perform public.sigap_upsert_auth_user('wimas@sigap.com', pw, 'WIMAS', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-centrindo@sigap.com', pw, 'PT CENTRINDO PALMAX', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-patama@sigap.com', pw, 'PT PATAMA ADIJAYA STEEL', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-guna@sigap.com', pw, 'PT GUNA TEKNIK PERKASA', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-aura@sigap.com', pw, 'PT AURA MUDA PRATAMA', 'field_staff');
  perform public.sigap_upsert_auth_user('cv-lancar@sigap.com', pw, 'CV LANCAR UTAMA CIPTA KARYA', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-ravi@sigap.com', pw, 'PT RAVI JAYA MANDIRI', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-rizal@sigap.com', pw, 'PT RIZAL BERKAH BERSAMA', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-muazta@sigap.com', pw, 'PT MUAZTA BINAKA SEJAHTERA', 'field_staff');
  perform public.sigap_upsert_auth_user('pt-cakra@sigap.com', pw, 'PT CAKRA INDO PRATAMA', 'field_staff');
  perform public.sigap_upsert_auth_user('cv-putri@sigap.com', pw, 'CV PUTRI PRATAMA', 'field_staff');
end;
$$;

-- Verifikasi hasil
select
  u.email,
  p.full_name,
  p.role,
  p.is_active,
  u.email_confirmed_at is not null as email_confirmed
from auth.users u
left join public.profiles p on p.id = u.id
where u.email like '%@sigap.com'
order by p.role desc, u.email;

-- Opsional: hapus helper function setelah selesai
-- drop function if exists public.sigap_upsert_auth_user(text, text, text, text);

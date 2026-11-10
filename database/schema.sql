-- =====================================================================
-- PSB Yayasan Induk Mamba'ul Ulum - Skema Database PostgreSQL (Neon)
-- Jalankan seluruh file ini di Neon Console > SQL Editor.
-- Admin pertama dibuat dari halaman /#/setup di aplikasi.
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- TABEL
-- ---------------------------------------------------------------------
create table if not exists public.units (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null,
  jenis       text not null check (jenis in ('pendidikan','asrama')),
  keterangan  text,
  kuota       int  not null default 0,
  aktif       boolean not null default true,
  urutan      int  not null default 0,
  created_at  timestamptz not null default now()
);
-- kontak & media sosial per unit (v2)
alter table public.units add column if not exists wa_operator text;
alter table public.units add column if not exists instagram   text;
alter table public.units add column if not exists facebook    text;
alter table public.units add column if not exists tiktok      text;
alter table public.units add column if not exists youtube     text;
alter table public.units add column if not exists website     text;
alter table public.units add column if not exists brosur      text;

create table if not exists public.petugas (
  id            uuid primary key default gen_random_uuid(),
  nama          text not null default '',
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'operator_pendidikan'
                check (role in ('admin','operator_pendidikan','operator_asrama')),
  unit_id       uuid references public.units(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.pengaturan (
  id                  int primary key default 1 check (id = 1),
  tahun_ajaran        text not null default '2027/2028',
  gelombang           text not null default 'Gelombang 1',
  pendaftaran_buka    boolean not null default true,
  prefix_nomor        text not null default 'MU',
  kontak_wa           text default '',
  alamat              text default 'Awang-awang, Mojosari, Mojokerto, Jawa Timur',
  info_pendaftaran    text default '',
  updated_at          timestamptz not null default now()
);
insert into public.pengaturan (id) values (1) on conflict (id) do nothing;

create sequence if not exists public.pendaftar_seq;

create table if not exists public.pendaftar (
  id                  uuid primary key default gen_random_uuid(),
  no_pendaftaran      text not null unique,
  tahun_ajaran        text,
  gelombang           text,
  -- data calon santri
  nama_lengkap        text not null,
  nik                 text,
  nisn                text,
  jenis_kelamin       text check (jenis_kelamin in ('L','P')),
  tempat_lahir        text,
  tanggal_lahir       date,
  anak_ke             int,
  jumlah_saudara      int,
  alamat              text,
  desa                text,
  kecamatan           text,
  kabupaten           text,
  provinsi            text,
  kode_pos            text,
  asal_sekolah        text,
  -- orang tua / wali
  nama_ayah           text,
  pekerjaan_ayah      text,
  nama_ibu            text,
  pekerjaan_ibu       text,
  nama_wali           text,
  hubungan_wali       text,
  penghasilan         text,
  no_hp               text not null,
  email               text,
  -- pilihan unit
  unit_pendidikan_id  uuid references public.units(id) on delete set null,
  unit_asrama_id      uuid references public.units(id) on delete set null,
  -- status verifikasi
  status_pendidikan   text not null default 'menunggu'
                      check (status_pendidikan in ('menunggu','diverifikasi','diterima','ditolak')),
  catatan_pendidikan  text,
  status_asrama       text not null default 'menunggu'
                      check (status_asrama in ('menunggu','diverifikasi','diterima','ditolak')),
  catatan_asrama      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists pendaftar_unit_pend_idx on public.pendaftar(unit_pendidikan_id);
create index if not exists pendaftar_unit_asr_idx  on public.pendaftar(unit_asrama_id);

create table if not exists public.pengumuman (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null,
  isi         text not null,
  unit_id     uuid references public.units(id) on delete cascade,
  tampil      boolean not null default true,
  created_by  uuid references public.petugas(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- FUNGSI BANTU
-- ---------------------------------------------------------------------
create or replace function public.normalisasi_hp(p text) returns text
language sql immutable as $$
  select case
    when regexp_replace(coalesce(p,''), '\D', '', 'g') like '62%'
      then '0' || substr(regexp_replace(p, '\D', '', 'g'), 3)
    else regexp_replace(coalesce(p,''), '\D', '', 'g')
  end
$$;

-- updated_at otomatis, nomor pendaftaran tidak bisa diubah
create or replace function public.pendaftar_before_update() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.no_pendaftaran := old.no_pendaftaran;
  return new;
end $$;

drop trigger if exists trg_pendaftar_before_update on public.pendaftar;
create trigger trg_pendaftar_before_update before update on public.pendaftar
for each row execute function public.pendaftar_before_update();

-- ---------------------------------------------------------------------
-- FUNGSI UNTUK PENDAFTAR (dipanggil dari API server)
-- ---------------------------------------------------------------------
-- Kolom biodata yang boleh diisi/diubah oleh pendaftar
create or replace function public._pendaftar_set_biodata(p_id uuid, p jsonb) returns void
language plpgsql as $$
begin
  update public.pendaftar set
    nama_lengkap   = coalesce(nullif(trim(p->>'nama_lengkap'),''), nama_lengkap),
    nik            = case when p ? 'nik' then nullif(p->>'nik','') else nik end,
    nisn           = case when p ? 'nisn' then nullif(p->>'nisn','') else nisn end,
    jenis_kelamin  = case when p ? 'jenis_kelamin' then nullif(p->>'jenis_kelamin','') else jenis_kelamin end,
    tempat_lahir   = case when p ? 'tempat_lahir' then nullif(p->>'tempat_lahir','') else tempat_lahir end,
    tanggal_lahir  = case when p ? 'tanggal_lahir' then nullif(p->>'tanggal_lahir','')::date else tanggal_lahir end,
    anak_ke        = case when p ? 'anak_ke' then nullif(p->>'anak_ke','')::int else anak_ke end,
    jumlah_saudara = case when p ? 'jumlah_saudara' then nullif(p->>'jumlah_saudara','')::int else jumlah_saudara end,
    alamat         = case when p ? 'alamat' then nullif(p->>'alamat','') else alamat end,
    desa           = case when p ? 'desa' then nullif(p->>'desa','') else desa end,
    kecamatan      = case when p ? 'kecamatan' then nullif(p->>'kecamatan','') else kecamatan end,
    kabupaten      = case when p ? 'kabupaten' then nullif(p->>'kabupaten','') else kabupaten end,
    provinsi       = case when p ? 'provinsi' then nullif(p->>'provinsi','') else provinsi end,
    kode_pos       = case when p ? 'kode_pos' then nullif(p->>'kode_pos','') else kode_pos end,
    asal_sekolah   = case when p ? 'asal_sekolah' then nullif(p->>'asal_sekolah','') else asal_sekolah end,
    nama_ayah      = case when p ? 'nama_ayah' then nullif(p->>'nama_ayah','') else nama_ayah end,
    pekerjaan_ayah = case when p ? 'pekerjaan_ayah' then nullif(p->>'pekerjaan_ayah','') else pekerjaan_ayah end,
    nama_ibu       = case when p ? 'nama_ibu' then nullif(p->>'nama_ibu','') else nama_ibu end,
    pekerjaan_ibu  = case when p ? 'pekerjaan_ibu' then nullif(p->>'pekerjaan_ibu','') else pekerjaan_ibu end,
    nama_wali      = case when p ? 'nama_wali' then nullif(p->>'nama_wali','') else nama_wali end,
    hubungan_wali  = case when p ? 'hubungan_wali' then nullif(p->>'hubungan_wali','') else hubungan_wali end,
    penghasilan    = case when p ? 'penghasilan' then nullif(p->>'penghasilan','') else penghasilan end,
    email          = case when p ? 'email' then nullif(p->>'email','') else email end
  where id = p_id;
end $$;

create or replace function public._pendaftar_json(p_id uuid) returns jsonb
language sql stable as $$
  select to_jsonb(d) || jsonb_build_object(
    'unit_pendidikan_nama', up.nama,
    'unit_asrama_nama', ua.nama)
  from public.pendaftar d
  left join public.units up on up.id = d.unit_pendidikan_id
  left join public.units ua on ua.id = d.unit_asrama_id
  where d.id = p_id
$$;

create or replace function public.daftar_pendaftar(p jsonb) returns jsonb
language plpgsql as $$
declare
  s public.pengaturan;
  v_id uuid;
  v_no text;
  v_hp text := public.normalisasi_hp(p->>'no_hp');
  v_up uuid := nullif(p->>'unit_pendidikan_id','')::uuid;
  v_ua uuid := nullif(p->>'unit_asrama_id','')::uuid;
begin
  select * into s from public.pengaturan where id = 1;
  if not s.pendaftaran_buka then
    raise exception 'Pendaftaran sedang ditutup';
  end if;
  if coalesce(trim(p->>'nama_lengkap'),'') = '' then
    raise exception 'Nama lengkap wajib diisi';
  end if;
  if length(v_hp) < 9 then
    raise exception 'Nomor HP tidak valid';
  end if;
  if v_up is null or not exists (select 1 from public.units where id = v_up and jenis = 'pendidikan' and aktif) then
    raise exception 'Unit pendidikan tidak valid';
  end if;
  if v_ua is not null and not exists (select 1 from public.units where id = v_ua and jenis = 'asrama' and aktif) then
    raise exception 'Unit asrama tidak valid';
  end if;

  v_no := s.prefix_nomor || to_char(now() at time zone 'Asia/Jakarta', 'YY')
          || lpad(nextval('public.pendaftar_seq')::text, 4, '0');

  insert into public.pendaftar (no_pendaftaran, tahun_ajaran, gelombang, nama_lengkap, no_hp,
                                unit_pendidikan_id, unit_asrama_id)
  values (v_no, s.tahun_ajaran, s.gelombang, trim(p->>'nama_lengkap'), v_hp, v_up, v_ua)
  returning id into v_id;

  perform public._pendaftar_set_biodata(v_id, p);
  return public._pendaftar_json(v_id);
end $$;

create or replace function public.login_pendaftar(p_no text, p_hp text) returns jsonb
language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from public.pendaftar
  where upper(no_pendaftaran) = upper(trim(p_no))
    and no_hp = public.normalisasi_hp(p_hp);
  if v_id is null then
    raise exception 'Nomor pendaftaran atau nomor HP salah';
  end if;
  return public._pendaftar_json(v_id);
end $$;

create or replace function public.update_biodata_pendaftar(p_no text, p_hp text, p jsonb) returns jsonb
language plpgsql as $$
declare d public.pendaftar;
begin
  select * into d from public.pendaftar
  where upper(no_pendaftaran) = upper(trim(p_no))
    and no_hp = public.normalisasi_hp(p_hp);
  if d.id is null then
    raise exception 'Sesi tidak valid, silakan login ulang';
  end if;
  if d.status_pendidikan in ('diterima','ditolak') then
    raise exception 'Biodata sudah dikunci karena pendaftaran telah diputuskan. Hubungi panitia untuk perubahan.';
  end if;
  perform public._pendaftar_set_biodata(d.id, p);
  return public._pendaftar_json(d.id);
end $$;


-- Statistik ringan untuk halaman depan (jumlah pendaftar per unit, tanpa data pribadi)
create or replace function public.statistik_publik() returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'total', (select count(*) from public.pendaftar),
    'per_unit', coalesce((select jsonb_agg(jsonb_build_object('unit_id', u.id, 'jumlah',
        (select count(*) from public.pendaftar p where p.unit_pendidikan_id = u.id or p.unit_asrama_id = u.id)))
      from public.units u where u.aktif), '[]'::jsonb))
$$;

-- ---------------------------------------------------------------------
-- DATA AWAL UNIT (silakan sesuaikan dari menu Unit di aplikasi)
-- ---------------------------------------------------------------------
insert into public.units (nama, jenis, keterangan, kuota, urutan)
select * from (values
  ('MTs Mamba''ul Ulum', 'pendidikan', 'Madrasah Tsanawiyah', 0, 1),
  ('MA Mamba''ul Ulum',  'pendidikan', 'Madrasah Aliyah', 0, 2),
  ('SMK Mamba''ul Ulum', 'pendidikan', 'Sekolah Menengah Kejuruan', 0, 3),
  ('Asrama Putra',       'asrama',     'Pondok Pesantren Putra', 0, 1),
  ('Asrama Putri',       'asrama',     'Pondok Pesantren Putri', 0, 2)
) v(nama, jenis, keterangan, kuota, urutan)
where not exists (select 1 from public.units);

-- ---------------------------------------------------------------------
-- VERSI SKEMA (dipakai API untuk menjalankan pembaruan otomatis)
-- ---------------------------------------------------------------------
create table if not exists public.app_meta (key text primary key, value text);
insert into public.app_meta (key, value) values ('schema_version', '2')
on conflict (key) do update set value = excluded.value;

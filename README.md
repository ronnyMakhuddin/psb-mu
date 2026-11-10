# PSB Mamba'ul Ulum

Aplikasi web **Penerimaan Santri Baru (PSB)** Yayasan Induk Mamba'ul Ulum, Awang-awang Mojosari Mojokerto.
Database & login petugas memakai **Supabase**, hosting di **Vercel**.

## Fitur

**Pendaftar (tanpa akun)**
- Formulir pendaftaran 3 langkah (data santri & alamat, orang tua/wali, pilihan unit pendidikan + asrama). Isian tersimpan sementara di browser bila halaman tertutup.
- Setelah daftar mendapat **Nomor Pendaftaran** (mis. `MU260001`) dan bukti pendaftaran yang bisa dicetak / disimpan PDF.
- **Cek Status**: login cukup dengan Nomor Pendaftaran + Nomor HP untuk melihat status verifikasi, catatan panitia, pengumuman, mengubah biodata, dan mencetak ulang bukti. Biodata terkunci setelah pendaftaran diputuskan (diterima/ditolak).

**Admin**
- Dashboard statistik, semua data pendaftar (cari, filter, verifikasi, edit, hapus, export CSV, hubungi via WhatsApp, cetak bukti).
- Kelola unit pendidikan & asrama (kuota, aktif/nonaktif).
- Kelola akun petugas (tambah, ubah role/unit, reset password, hapus).
- Pengumuman (umum atau per unit) dan pengaturan PSB (tahun ajaran, gelombang, buka/tutup pendaftaran, awalan nomor, WA panitia, info pendaftaran).

**Operator Unit Pendidikan / Operator Unit Asrama**
- Hanya melihat pendaftar di unitnya sendiri (dijaga Row Level Security di database).
- Verifikasi status & catatan untuk sisi unitnya saja, edit biodata, buat pengumuman untuk unitnya.

Tampilan responsif: sidebar di desktop, menu bawah melayang di HP. Bisa dipasang sebagai aplikasi (PWA).

## Langkah Deploy

### 1. Siapkan Supabase
1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), lalu **Run**. File ini membuat tabel, fungsi, RLS, dan contoh unit (MTs, MA, SMK, Asrama Putra, Asrama Putri) yang bisa diubah nanti dari menu Unit.
3. Buat admin pertama: **Authentication → Users → Add user** (isi email & password, centang *Auto Confirm User*). Lalu jalankan di SQL Editor (ganti emailnya):
   ```sql
   insert into public.profiles (id, nama, email, role)
   select id, 'Administrator', email, 'admin' from auth.users where email = 'admin@contoh.com'
   on conflict (id) do update set role = 'admin';
   ```
4. Catat dari **Project Settings → API**: `Project URL`, `anon public key`, dan `service_role key`.

### 2. Deploy ke Vercel
1. Di [vercel.com](https://vercel.com) pilih **Add New → Project**, import repository ini. Framework Preset: **Other** (tidak perlu build command).
2. Tambahkan **Environment Variables**:
   | Nama | Isi |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (rahasia, hanya dipakai server untuk membuat akun operator) |
3. Klik **Deploy**. Selesai.

Akun operator selanjutnya dibuat dari menu **Pengguna** di aplikasi (login sebagai admin).

## Mode Preview
Jika aplikasi dibuka tanpa konfigurasi Supabase (mis. dijalankan lokal), aplikasi otomatis masuk **Mode Preview**: memakai data contoh di memori, ada banner "Mode Preview Aktif" dan tombol *quick login* untuk mencoba semua role. Begitu Environment Variables terisi, mode preview hilang dan aplikasi 100% memakai Supabase. Pengaturan ada di [`js/config.js`](js/config.js) (`IS_PREVIEW = 'auto' | true | false`).

Menjalankan lokal: `npx serve .` atau `python3 -m http.server`, lalu buka `http://localhost:8080`. Untuk menguji dengan Supabase secara lokal gunakan `vercel dev`, atau isi `SUPABASE_URL` / `SUPABASE_ANON_KEY` di `js/config.js`.

## Struktur
```
index.html            Halaman utama (SPA)
css/style.css         Tema hijau-emas (lihat docs/DESIGN.md)
js/app.js             Halaman & logika antarmuka
js/data.js            Lapisan data Supabase + mode preview
js/config.js          Saklar preview / konfigurasi opsional
js/vendor/            lucide (ikon) & supabase-js, disimpan lokal
api/config.js         Mengirim URL & anon key ke browser
api/users.js          Kelola akun petugas (butuh service role key)
supabase/schema.sql   Skema database, fungsi, dan RLS
```

## Keamanan
- Pendaftar tidak punya akses langsung ke tabel `pendaftar`; pendaftaran, login, dan edit biodata lewat fungsi database (`daftar_pendaftar`, `login_pendaftar`, `update_biodata_pendaftar`) yang memeriksa Nomor Pendaftaran + Nomor HP.
- Operator dibatasi RLS ke unitnya, dan trigger mencegah operator mengubah status sisi unit lain.
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di fungsi server `api/users.js`, tidak pernah dikirim ke browser.

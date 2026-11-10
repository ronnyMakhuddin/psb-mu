# PSB Mamba'ul Ulum

Aplikasi web **Penerimaan Santri Baru (PSB)** Yayasan Induk Mamba'ul Ulum, Awang-awang Mojosari Mojokerto.
Database **Neon Postgres** (gratis) dan hosting **Vercel**. Semua akses data lewat API di Vercel.

## Fitur

**Pendaftar (tanpa akun)**
- Formulir pendaftaran 3 langkah (data santri & alamat, orang tua/wali, pilihan unit pendidikan + asrama). Isian tersimpan sementara di browser bila halaman tertutup.
- Setelah daftar mendapat **Nomor Pendaftaran** (mis. `MU260001`) dan bukti pendaftaran yang bisa dicetak / disimpan PDF.
- **Cek Status**: login cukup dengan Nomor Pendaftaran + Nomor HP untuk melihat status verifikasi, catatan panitia, pengumuman, mengubah biodata, dan mencetak ulang bukti. Biodata terkunci setelah pendaftaran diputuskan (diterima/ditolak).

**Admin**
- Dashboard statistik, semua data pendaftar (cari, filter, verifikasi, edit, hapus, export CSV, hubungi via WhatsApp, cetak bukti).
- Kelola unit pendidikan & asrama (kuota, aktif/nonaktif, link brosur, WhatsApp operator, Instagram, Facebook, TikTok, YouTube, website). Tombolnya tampil di kartu unit pada beranda.
- Kelola akun petugas (tambah, ubah role/unit, reset password, hapus).
- Pengumuman (umum atau per unit) dan pengaturan PSB (tahun ajaran, gelombang, buka/tutup pendaftaran, awalan nomor, WA panitia, info pendaftaran).

**Operator Unit Pendidikan / Operator Unit Asrama**
- Hanya melihat pendaftar di unitnya sendiri (dicek di server).
- Verifikasi status & catatan untuk sisi unitnya saja, edit biodata, buat pengumuman untuk unitnya.

Tampilan responsif: sidebar di desktop, menu bawah melayang di HP. Bisa dipasang sebagai aplikasi (PWA).

## Langkah Deploy

### 1. Import ke Vercel
Di [vercel.com](https://vercel.com) pilih **Add New → Project**, import repository ini. Framework Preset: **Other** (tanpa build command), lalu **Deploy**. Sebelum database tersambung, aplikasi berjalan dalam Mode Preview.

### 2. Buat database Neon
1. Di project Vercel buka tab **Storage → Create Database → Neon (Serverless Postgres)**, pilih paket **Free**, lalu **Connect** ke project ini. Vercel otomatis menambahkan Environment Variable `DATABASE_URL`.
   *(Alternatif: buat project di [neon.tech](https://neon.tech), salin connection string, lalu tambahkan sendiri sebagai `DATABASE_URL` di Settings → Environment Variables.)*
2. Tabel dan fungsi database **dibuat otomatis** saat aplikasi pertama kali dibuka, termasuk contoh unit (MTs, MA, SMK, Asrama Putra, Asrama Putri) yang bisa diubah dari menu Unit. Tidak perlu menjalankan SQL manual. (Skema lengkapnya ada di [`database/schema.sql`](database/schema.sql); bila ingin menjalankannya sendiri, gunakan SQL Editor di console.neon.tech, bukan editor query di Vercel yang hanya menerima satu perintah.)
3. (Disarankan) Tambahkan Environment Variable `AUTH_SECRET` berisi teks acak panjang untuk menandatangani sesi login petugas.
4. **Redeploy** project (Deployments → ⋯ → Redeploy) agar variabel baru terbaca.

### 3. Buat admin pertama
Buka `https://<domain-anda>/#/petugas`. Karena belum ada akun, aplikasi otomatis menampilkan halaman **Buat Akun Admin Pertama**. Isi nama, email, dan password. Halaman ini tertutup sendiri setelah admin dibuat. Akun operator berikutnya dibuat dari menu **Pengguna**.

## Mode Preview
Jika `DATABASE_URL` belum diatur (atau dibuka lokal tanpa server), aplikasi otomatis masuk **Mode Preview**: memakai data contoh di memori, ada banner "Mode Preview Aktif" dan tombol *quick login* untuk mencoba semua role. Begitu `DATABASE_URL` terisi, mode preview hilang dan aplikasi memakai database. Pengaturan ada di [`js/config.js`](js/config.js) (`IS_PREVIEW = 'auto' | true | false`).

Menjalankan lokal: `npx serve .` (Mode Preview), atau `vercel dev` dengan `DATABASE_URL` di file `.env` untuk memakai database.

## Struktur
```
index.html            Halaman utama (SPA)
css/style.css         Tema hijau-emas (lihat docs/DESIGN.md)
js/app.js             Halaman & logika antarmuka
js/data.js            Pemanggil API + mode preview
js/config.js          Saklar preview
js/vendor/            Ikon lucide (disimpan lokal)
api/psb.js            Satu endpoint API untuk semua aksi
api/config.js         Memberi tahu browser apakah database sudah tersambung
api/_lib/             Koneksi database, pembuatan tabel otomatis & token login petugas
database/schema.sql   Skema PostgreSQL (tabel & fungsi); setelah diubah naikkan schema_version (juga di api/_lib/db.js) lalu jalankan `npm run schema`
```

## Keamanan
- Browser tidak pernah tersambung langsung ke database; semua lewat `api/psb.js` di server Vercel.
- Pendaftar hanya bisa membaca/mengubah datanya sendiri dengan Nomor Pendaftaran + Nomor HP.
- Password petugas disimpan sebagai hash bcrypt (`pgcrypto`). Sesi petugas memakai token bertanda tangan (12 jam), dan role selalu dicek ulang dari database.
- Operator hanya melihat pendaftar di unitnya dan hanya bisa mengubah status sisi unitnya (pendidikan atau asrama).

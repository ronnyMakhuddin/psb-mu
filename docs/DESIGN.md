# Spesifikasi Desain UI – PSB Mamba'ul Ulum

Hasil analisis `webappbuilder-ui-designer` dari referensi logo Yayasan Induk Mamba'ul Ulum.

## 1. Karakter & Gaya Desain
**Islamic Modern Corporate + Glassmorphism ringan.** Logo berbentuk perisai hijau dengan bintang & sinar emas, obor merah, dan buku terbuka. Kesan: religius, terpercaya, berwibawa, ramah keluarga. Target: wali santri (mayoritas pengguna HP) dan petugas yayasan (desktop).

## 2. Palet Warna & Token
| Token | HEX | Padanan Tailwind | Pemakaian |
|---|---|---|---|
| `--bg` | `#F7FAF8` | `bg-emerald-50/40` | Latar halaman |
| `--surface` | `rgba(255,255,255,.72)` | `bg-white/70` | Kartu kaca (blur 16px) |
| `--green-500` (logo) | `#5FA777` | `bg-emerald-500` | Aksen sekunder, ikon |
| `--green-700` (brand) | `#1E7A4C` | `bg-emerald-700` | Tombol utama, sidebar aktif |
| `--green-900` | `#0F3D27` | `bg-emerald-950` | Judul, hero gelap |
| `--gold` | `#F2C311` | `bg-yellow-400` | Highlight, badge, garis aksen |
| `--gold-700` | `#B8900A` | `text-yellow-700` | Teks emas di latar terang |
| `--red` (obor) | `#E3262E` | `bg-red-600` | Status ditolak / bahaya |
| `--text` | `#13261C` | `text-slate-900` | Teks judul |
| `--muted` | `#5B6B62` | `text-slate-500` | Teks isi redup |
| `--border` | `rgba(30,122,76,.14)` | `border-emerald-700/15` | Garis tepi |
| Status | menunggu `#B8900A`, diverifikasi `#2563EB`, diterima `#1E7A4C`, ditolak `#E3262E` | | Badge status |

## 3. Tipografi
- Font: **Plus Jakarta Sans** (400/500/600/700/800).
- H1 hero 40px/800 (mobile 28px), H2 halaman 22px/700, judul kartu 16px/700, body 14–15px/500, label 12px/600 uppercase tracking 0.04em.
- line-height 1.55 untuk isi, 1.15 untuk judul.

## 4. Layout & Navigasi
- Publik: top navbar transparan + hero 2 kolom (desktop) / 1 kolom (HP).
- Panel petugas: **Fixed Sidebar 260px** di desktop; di HP (<900px) sidebar disembunyikan dan diganti **Bottom Navigation melayang** (radius 20px, blur).
- Container maks 1180px, padding 24px (HP 16px), gap 16–20px.

## 5. Komponen
- Kartu: `rounded-2xl` (18px), border tipis hijau 14%, shadow `0 10px 30px rgba(15,61,39,.08)`, latar kaca.
- Tombol: `rounded-xl` (12px), utama hijau gradasi `#1E7A4C→#2E9563`, sekunder outline, aksen emas.
- Input: tinggi 44px, radius 12px, fokus ring hijau 3px.
- Badge status: pill (`rounded-full`), latar 12% warna status.
- Tabel: header sticky, baris hover hijau 4%; di HP berubah menjadi daftar kartu.
- Kartu statistik: ikon dalam kotak 44px berwarna, angka 28px/800.

## 6. Interaksi
- Transisi 180ms ease; hover tombol naik 1px; toast di pojok kanan atas.
- Skeleton/spinner saat memuat; empty state dengan ikon dan teks "Belum ada data".
- Ikon: **Lucide Icons**.

## 7. Design System Blueprint
> Tema hijau-emas Mamba'ul Ulum. Font Plus Jakarta Sans. Latar `#F7FAF8` dengan gradasi radial hijau & emas lembut. Kartu kaca putih 72% + blur 16px, radius 18px, border hijau 14%. Tombol utama hijau `#1E7A4C`, aksen emas `#F2C311`, bahaya merah `#E3262E`. Desktop: sidebar kiri tetap 260px berwarna hijau tua `#0F3D27` dengan item aktif emas. HP: bottom nav melayang. Ikon Lucide. Semua teks Bahasa Indonesia.

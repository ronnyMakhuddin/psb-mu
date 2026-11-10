// =====================================================================
// KONFIGURASI APLIKASI
// ---------------------------------------------------------------------
// IS_PREVIEW:
//   'auto'  -> (default) pakai Supabase bila SUPABASE_URL & SUPABASE_ANON_KEY
//              tersedia (dari Environment Variables Vercel lewat /api/config
//              atau dari isian di bawah). Jika tidak ada, otomatis Mode Preview.
//   true    -> selalu Mode Preview (data dummy di memori, tanpa database).
//   false   -> selalu terhubung ke Supabase (Mode Produksi).
// =====================================================================
export const IS_PREVIEW = 'auto';

// Opsional: isi di sini jika TIDAK memakai Environment Variables Vercel.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

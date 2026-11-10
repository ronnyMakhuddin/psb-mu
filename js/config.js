// =====================================================================
// KONFIGURASI APLIKASI
// ---------------------------------------------------------------------
// IS_PREVIEW:
//   'auto'  -> (default) pakai database bila DATABASE_URL sudah diatur di
//              Vercel (dicek lewat /api/config). Jika belum, Mode Preview.
//   true    -> selalu Mode Preview (data contoh di memori, tanpa database).
//   false   -> selalu memakai API + database (Mode Produksi).
// =====================================================================
export const IS_PREVIEW = 'auto';

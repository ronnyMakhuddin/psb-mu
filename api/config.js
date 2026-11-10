import { hasDb } from './_lib/db.js';

// Memberi tahu browser apakah database sudah dikonfigurasi.
// Jika belum, aplikasi berjalan dalam Mode Preview (data contoh).
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ backend: hasDb() ? 'api' : 'preview' });
}

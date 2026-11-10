import pg from 'pg';
import { SCHEMA_SQL } from './schema.js';

const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
let pool = globalThis.__psbPool;

export const hasDb = () => Boolean(conn);

export function db() {
  if (!conn) throw httpError(500, 'DATABASE_URL belum diatur di Environment Variables Vercel');
  if (!pool) {
    const local = /localhost|127\.0\.0\.1|host=\/|@\/tmp/.test(conn);
    pool = new pg.Pool({
      connectionString: conn,
      max: 3,
      idleTimeoutMillis: 10000,
      ssl: local ? false : { rejectUnauthorized: false },
    });
    globalThis.__psbPool = pool;
  }
  return pool;
}

export async function q(text, params = []) {
  try {
    return await db().query(text, params);
  } catch (e) {
    // pesan RAISE EXCEPTION dari fungsi database diteruskan apa adanya
    if (e.code === 'P0001') throw httpError(400, e.message);
    if (e.code === '23505') throw httpError(400, 'Data sudah ada (duplikat)');
    if (e.code === '22P02' || e.code === '22007' || e.code === '22008') throw httpError(400, 'Format data tidak valid');
    if (e.code === '42P01') throw httpError(500, 'Tabel belum dibuat. Jalankan database/schema.sql di Neon SQL Editor.');
    throw e;
  }
}

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Membuat tabel & fungsi otomatis saat database masih kosong (sekali per cold start).
let schemaReady = globalThis.__psbSchemaReady || null;
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await db().connect();
      try {
        const { rows } = await client.query(
          "select to_regclass('public.pengaturan') is not null and to_regclass('public.petugas') is not null and to_regprocedure('public.daftar_pendaftar(jsonb)') is not null as ok");
        if (rows[0].ok) return;
        await client.query('select pg_advisory_lock(727001)');
        try { await client.query(SCHEMA_SQL); } finally { await client.query('select pg_advisory_unlock(727001)'); }
      } finally { client.release(); }
    })().catch((e) => {
      schemaReady = null; globalThis.__psbSchemaReady = null;
      throw httpError(500, `Gagal menyiapkan database otomatis: ${e.message}`);
    });
    globalThis.__psbSchemaReady = schemaReady;
  }
  return schemaReady;
}

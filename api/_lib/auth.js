import crypto from 'node:crypto';
import { q, httpError } from './db.js';

const SECRET = process.env.AUTH_SECRET
  || crypto.createHash('sha256').update('psb-mu:' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || 'dev')).digest('hex');
const TTL = 1000 * 60 * 60 * 12; // 12 jam

const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export function makeToken(id) {
  const body = b64(JSON.stringify({ id, exp: Date.now() + TTL }));
  return `${body}.${sign(body)}`;
}

function readToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const good = sign(body);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export const PROFILE_SQL = `
  select p.id, p.nama, p.email, p.role, p.unit_id, p.no_wa, p.tampil_kontak, p.created_at,
    case when u.id is null then null else json_build_object('id', u.id, 'nama', u.nama, 'jenis', u.jenis) end as unit
  from petugas p left join units u on u.id = p.unit_id`;

/** Petugas yang sedang login (atau null). Role selalu dibaca ulang dari database. */
export async function currentStaff(req) {
  const t = readToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!t) return null;
  const { rows } = await q(`${PROFILE_SQL} where p.id = $1`, [t.id]);
  return rows[0] || null;
}

export function requireStaff(staff) {
  if (!staff) throw httpError(401, 'Sesi berakhir, silakan masuk kembali');
  return staff;
}
export function requireAdmin(staff) {
  requireStaff(staff);
  if (staff.role !== 'admin') throw httpError(403, 'Hanya admin yang boleh melakukan ini');
  return staff;
}

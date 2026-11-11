// Satu endpoint API untuk seluruh aplikasi PSB: POST /api/psb { action, ...data }
import { q, httpError, ensureSchema } from './_lib/db.js';
import { makeToken, currentStaff, requireStaff, requireAdmin, PROFILE_SQL } from './_lib/auth.js';

const ROLES = ['admin', 'operator_pendidikan', 'operator_asrama'];
const STATUS = ['menunggu', 'diverifikasi', 'diterima', 'ditolak'];
const BIODATA = [
  'nama_lengkap', 'nik', 'nisn', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'anak_ke',
  'jumlah_saudara', 'alamat', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'kode_pos',
  'asal_sekolah', 'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'nama_wali',
  'hubungan_wali', 'penghasilan', 'email',
];
const normHp = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('62') ? '0' + d.slice(2) : d; };
const str = (v, max = 2000) => (v == null ? '' : String(v).trim().slice(0, max));
const uuidOrNull = (v) => (v && /^[0-9a-f-]{36}$/i.test(String(v)) ? String(v) : null);

const PENDAFTAR_SQL = `
  select d.*,
    case when up.id is null then null else json_build_object('id', up.id, 'nama', up.nama) end as unit_pendidikan,
    case when ua.id is null then null else json_build_object('id', ua.id, 'nama', ua.nama) end as unit_asrama
  from pendaftar d
  left join units up on up.id = d.unit_pendidikan_id
  left join units ua on ua.id = d.unit_asrama_id`;

// Filter baris sesuai role petugas
function scope(staff, alias = 'd') {
  if (staff.role === 'admin') return { sql: 'true', params: [] };
  if (!staff.unit_id) return { sql: 'false', params: [] };
  const col = staff.role === 'operator_pendidikan' ? 'unit_pendidikan_id' : 'unit_asrama_id';
  return { sql: `${alias}.${col} = $1`, params: [staff.unit_id] };
}

async function getPendaftarScoped(staff, id) {
  const s = scope(staff);
  const { rows } = await q(`${PENDAFTAR_SQL} where ${s.sql} and d.id = $${s.params.length + 1}`, [...s.params, id]);
  if (!rows[0]) throw httpError(404, 'Data pendaftar tidak ditemukan atau bukan unit Anda');
  return rows[0];
}

const actions = {
  // ------------------------------------------------------------ publik
  async getPengaturan() {
    return (await q('select * from pengaturan where id = 1')).rows[0];
  },
  async listUnits(_, staff) {
    const where = staff ? '' : 'where aktif';
    return (await q(`select * from units ${where} order by jenis, urutan, nama`)).rows;
  },
  async listPengumuman({ onlyVisible }, staff) {
    const where = onlyVisible || !staff ? 'where n.tampil' : '';
    return (await q(`select n.*, case when u.id is null then null else json_build_object('id', u.id, 'nama', u.nama) end as unit
      from pengumuman n left join units u on u.id = n.unit_id ${where} order by n.created_at desc`)).rows;
  },
  // Kontak petugas yang boleh ditampilkan ke publik (tanpa email)
  async listKontak() {
    return (await q(`select p.id, p.nama, p.role, p.no_wa, p.unit_id,
        case when u.id is null then null else json_build_object('id', u.id, 'nama', u.nama, 'jenis', u.jenis) end as unit
      from petugas p left join units u on u.id = p.unit_id
      where p.tampil_kontak and coalesce(p.no_wa, '') <> '' and (u.id is null or u.aktif)
      order by (p.role = 'admin') desc, u.jenis nulls first, u.urutan, p.nama`)).rows;
  },
  async daftar({ payload }) {
    return (await q('select daftar_pendaftar($1::jsonb) as d', [JSON.stringify(payload || {})])).rows[0].d;
  },
  async loginPendaftar({ no, hp }) {
    return (await q('select login_pendaftar($1, $2) as d', [str(no, 30), str(hp, 30)])).rows[0].d;
  },
  async updateBiodata({ no, hp, payload }) {
    const clean = Object.fromEntries(BIODATA.filter((k) => k in (payload || {})).map((k) => [k, payload[k]]));
    return (await q('select update_biodata_pendaftar($1, $2, $3::jsonb) as d', [str(no, 30), str(hp, 30), JSON.stringify(clean)])).rows[0].d;
  },

  // ------------------------------------------------------------ setup admin pertama
  async setupStatus() {
    const { rows } = await q('select count(*)::int as n from petugas');
    return { needed: rows[0].n === 0 };
  },
  async setupAdmin({ nama, email, password }) {
    if (!email || !password || String(password).length < 6) throw httpError(400, 'Email dan password (min. 6 karakter) wajib diisi');
    const { rows } = await q(`insert into petugas (nama, email, password_hash, role)
      select $1, lower($2), crypt($3, gen_salt('bf')), 'admin'
      where not exists (select 1 from petugas) returning id`, [str(nama, 100), str(email, 200), String(password)]);
    if (!rows[0]) throw httpError(400, 'Admin sudah ada. Silakan masuk melalui halaman petugas.');
    return actions.signIn({ email, password });
  },

  // ------------------------------------------------------------ login petugas
  async signIn({ email, password }) {
    const { rows } = await q(`select id from petugas where email = lower($1) and password_hash = crypt($2, password_hash)`,
      [str(email, 200), String(password || '')]);
    if (!rows[0]) throw httpError(400, 'Email atau password salah');
    const profile = (await q(`${PROFILE_SQL} where p.id = $1`, [rows[0].id])).rows[0];
    return { token: makeToken(profile.id), profile };
  },
  async me(_, staff) { return staff; },
  async changePassword({ oldPassword, newPassword }, staff) {
    requireStaff(staff);
    if (!newPassword || String(newPassword).length < 6) throw httpError(400, 'Password baru minimal 6 karakter');
    const { rowCount } = await q(`update petugas set password_hash = crypt($3, gen_salt('bf'))
      where id = $1 and password_hash = crypt($2, password_hash)`, [staff.id, String(oldPassword || ''), String(newPassword)]);
    if (!rowCount) throw httpError(400, 'Password lama salah');
    return { ok: true };
  },

  // ------------------------------------------------------------ pendaftar (petugas)
  async listPendaftar(_, staff) {
    requireStaff(staff);
    const s = scope(staff);
    return (await q(`${PENDAFTAR_SQL} where ${s.sql} order by d.created_at desc`, s.params)).rows;
  },
  async updatePendaftar({ id, patch = {} }, staff) {
    requireStaff(staff);
    await getPendaftarScoped(staff, id);
    const allowed = [...BIODATA, 'no_hp'];
    if (staff.role === 'admin') allowed.push('unit_pendidikan_id', 'unit_asrama_id', 'status_pendidikan', 'catatan_pendidikan', 'status_asrama', 'catatan_asrama');
    if (staff.role === 'operator_pendidikan') allowed.push('status_pendidikan', 'catatan_pendidikan');
    if (staff.role === 'operator_asrama') allowed.push('status_asrama', 'catatan_asrama');
    const sets = []; const params = [id];
    for (const k of allowed) {
      if (!(k in patch)) continue;
      let v = patch[k];
      if (v === '' || v === undefined) v = null;
      if (k === 'no_hp') { v = normHp(v); if (v.length < 9) throw httpError(400, 'Nomor HP tidak valid'); }
      if (k.startsWith('status_') && !STATUS.includes(v)) throw httpError(400, 'Status tidak valid');
      if (k === 'nama_lengkap' && !v) throw httpError(400, 'Nama lengkap wajib diisi');
      if (k === 'unit_pendidikan_id' && !v) throw httpError(400, 'Unit pendidikan wajib dipilih');
      if (k.endsWith('_id')) v = uuidOrNull(v);
      if (['anak_ke', 'jumlah_saudara'].includes(k) && v !== null) v = Number.parseInt(v, 10) || null;
      params.push(v);
      sets.push(`${k} = $${params.length}`);
    }
    if (sets.length) await q(`update pendaftar set ${sets.join(', ')} where id = $1`, params);
    return getPendaftarScoped(staff, id);
  },
  async deletePendaftar({ id }, staff) {
    requireAdmin(staff);
    await q('delete from pendaftar where id = $1', [id]);
    return { ok: true };
  },

  // ------------------------------------------------------------ pengumuman
  async savePengumuman({ data = {} }, staff) {
    requireStaff(staff);
    const unitId = staff.role === 'admin' ? uuidOrNull(data.unit_id) : staff.unit_id;
    if (staff.role !== 'admin' && !unitId) throw httpError(400, 'Akun Anda belum memiliki unit');
    const judul = str(data.judul, 200); const isi = str(data.isi, 10000);
    if (!judul || !isi) throw httpError(400, 'Judul dan isi wajib diisi');
    const tampil = data.tampil !== false;
    if (data.id) {
      const own = staff.role === 'admin' ? '' : 'and unit_id = $6';
      const p = [data.id, judul, isi, unitId, tampil]; if (own) p.push(staff.unit_id);
      const { rows } = await q(`update pengumuman set judul = $2, isi = $3, unit_id = $4, tampil = $5 where id = $1 ${own} returning *`, p);
      if (!rows[0]) throw httpError(403, 'Tidak boleh mengubah pengumuman ini');
      return rows[0];
    }
    return (await q('insert into pengumuman (judul, isi, unit_id, tampil, created_by) values ($1,$2,$3,$4,$5) returning *',
      [judul, isi, unitId, tampil, staff.id])).rows[0];
  },
  async deletePengumuman({ id }, staff) {
    requireStaff(staff);
    const own = staff.role === 'admin' ? '' : 'and unit_id = $2';
    const { rowCount } = await q(`delete from pengumuman where id = $1 ${own}`, own ? [id, staff.unit_id] : [id]);
    if (!rowCount) throw httpError(403, 'Tidak boleh menghapus pengumuman ini');
    return { ok: true };
  },

  // ------------------------------------------------------------ admin
  async updatePengaturan({ data = {} }, staff) {
    requireAdmin(staff);
    return (await q(`update pengaturan set tahun_ajaran = $1, gelombang = $2, pendaftaran_buka = $3, prefix_nomor = $4,
      kontak_wa = $5, alamat = $6, info_pendaftaran = $7, syarat_pendaftaran = $8, updated_at = now() where id = 1 returning *`, [
      str(data.tahun_ajaran, 20) || '2027/2028', str(data.gelombang, 50) || 'Gelombang 1', data.pendaftaran_buka !== false,
      (str(data.prefix_nomor, 6) || 'MU').toUpperCase(), str(data.kontak_wa, 30), str(data.alamat, 300), str(data.info_pendaftaran, 10000), str(data.syarat_pendaftaran, 10000),
    ])).rows[0];
  },
  async saveUnit({ data = {} }, staff) {
    requireAdmin(staff);
    const nama = str(data.nama, 150);
    if (!nama) throw httpError(400, 'Nama unit wajib diisi');
    if (!['pendidikan', 'asrama'].includes(data.jenis)) throw httpError(400, 'Jenis unit tidak valid');
    const p = [nama, data.jenis, str(data.keterangan, 300), Number(data.kuota) || 0, data.aktif !== false, Number(data.urutan) || 0,
      str(data.wa_operator, 30), str(data.instagram, 200), str(data.facebook, 200), str(data.tiktok, 200), str(data.youtube, 200), str(data.website, 200), str(data.brosur, 500)];
    const cols = 'nama, jenis, keterangan, kuota, aktif, urutan, wa_operator, instagram, facebook, tiktok, youtube, website, brosur';
    if (data.id) {
      return (await q(`update units set (${cols}) = ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) where id = $14 returning *`, [...p, data.id])).rows[0];
    }
    return (await q(`insert into units (${cols}) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`, p)).rows[0];
  },
  async deleteUnit({ id }, staff) {
    requireAdmin(staff);
    await q('delete from units where id = $1', [id]);
    return { ok: true };
  },
  async listProfiles(_, staff) {
    requireAdmin(staff);
    return (await q(`${PROFILE_SQL} order by p.created_at`)).rows;
  },
  async createUser({ data = {} }, staff) {
    requireAdmin(staff);
    if (!data.email || !data.password || String(data.password).length < 6) throw httpError(400, 'Email dan password (min. 6 karakter) wajib diisi');
    if (!ROLES.includes(data.role)) throw httpError(400, 'Role tidak valid');
    const { rows } = await q(`insert into petugas (nama, email, password_hash, role, unit_id, no_wa, tampil_kontak)
      values ($1, lower($2), crypt($3, gen_salt('bf')), $4, $5, $6, $7) returning id`,
    [str(data.nama, 100), str(data.email, 200), String(data.password), data.role, data.role === 'admin' ? null : uuidOrNull(data.unit_id),
      normHp(data.no_wa) || null, data.tampil_kontak !== false]);
    return { ok: true, id: rows[0].id };
  },
  async updateProfile({ id, patch = {} }, staff) {
    requireAdmin(staff);
    if (!ROLES.includes(patch.role)) throw httpError(400, 'Role tidak valid');
    if (id === staff.id && patch.role !== 'admin') throw httpError(400, 'Tidak bisa menurunkan role akun sendiri');
    await q('update petugas set nama = $2, role = $3, unit_id = $4, no_wa = $5, tampil_kontak = $6 where id = $1',
      [id, str(patch.nama, 100), patch.role, patch.role === 'admin' ? null : uuidOrNull(patch.unit_id), normHp(patch.no_wa) || null, patch.tampil_kontak !== false]);
    return { ok: true };
  },
  // Petugas mengubah nama & nomor WA miliknya sendiri
  async updateMyProfile({ nama, no_wa, tampil_kontak }, staff) {
    requireStaff(staff);
    await q('update petugas set nama = $2, no_wa = $3, tampil_kontak = $4 where id = $1',
      [staff.id, str(nama, 100) || staff.nama, normHp(no_wa) || null, tampil_kontak !== false]);
    return { ok: true };
  },
  async resetPassword({ id, password }, staff) {
    requireAdmin(staff);
    if (!password || String(password).length < 6) throw httpError(400, 'Password minimal 6 karakter');
    await q(`update petugas set password_hash = crypt($2, gen_salt('bf')) where id = $1`, [id, String(password)]);
    return { ok: true };
  },
  async deleteUser({ id }, staff) {
    requireAdmin(staff);
    if (id === staff.id) throw httpError(400, 'Tidak bisa menghapus akun sendiri');
    await q('delete from petugas where id = $1', [id]);
    return { ok: true };
  },
};

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });
  try {
    await ensureSchema();
    const body = await readBody(req);
    const fn = Object.prototype.hasOwnProperty.call(actions, body.action) ? actions[body.action] : null;
    if (!fn) return res.status(400).json({ error: 'Aksi tidak dikenal' });
    const staff = await currentStaff(req);
    const data = await fn(body, staff);
    return res.status(200).json({ data: data ?? null });
  } catch (e) {
    if (!e.status) console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Terjadi kesalahan pada server' });
  }
}

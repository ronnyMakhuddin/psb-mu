// Manajemen akun petugas (admin / operator) memakai Service Role Key.
// Hanya bisa dipanggil oleh pengguna yang login dengan role "admin".
const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ROLES = ['admin', 'operator_pendidikan', 'operator_asrama'];

const sb = (path, opts = {}) =>
  fetch(`${URL}${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Tidak ada sesi login'), { status: 401 });
  const u = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${token}` },
  });
  if (!u.ok) throw Object.assign(new Error('Sesi tidak valid'), { status: 401 });
  const user = await u.json();
  const p = await sb(`/rest/v1/profiles?id=eq.${user.id}&select=role`);
  const rows = await p.json();
  if (!rows[0] || rows[0].role !== 'admin')
    throw Object.assign(new Error('Hanya admin yang boleh mengelola akun'), { status: 403 });
  return user;
}

export default async function handler(req, res) {
  try {
    if (!URL || !SERVICE)
      return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel' });
    const admin = await requireAdmin(req);
    const body = req.method === 'GET' ? {} : await readBody(req);

    if (req.method === 'POST') {
      const { email, password, nama, role, unit_id } = body;
      if (!email || !password || password.length < 6)
        return res.status(400).json({ error: 'Email dan password (min. 6 karakter) wajib diisi' });
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'Role tidak valid' });
      const r = await sb('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { nama } }),
      });
      const created = await r.json();
      if (!r.ok) return res.status(400).json({ error: created.msg || created.message || 'Gagal membuat akun' });
      const pr = await sb('/rest/v1/profiles', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: created.id, email, nama: nama || '', role, unit_id: unit_id || null }),
      });
      if (!pr.ok) return res.status(400).json({ error: 'Akun dibuat tetapi profil gagal disimpan' });
      return res.status(200).json({ ok: true, id: created.id });
    }

    if (req.method === 'PATCH') {
      const { id, password, email } = body;
      if (!id) return res.status(400).json({ error: 'ID wajib' });
      const patch = {};
      if (password) {
        if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
        patch.password = password;
      }
      if (email) patch.email = email;
      const r = await sb(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        return res.status(400).json({ error: e.msg || e.message || 'Gagal memperbarui akun' });
      }
      if (email) await sb(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ email }) });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'ID wajib' });
      if (id === admin.id) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
      const r = await sb(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      if (!r.ok) return res.status(400).json({ error: 'Gagal menghapus akun' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method tidak didukung' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Terjadi kesalahan' });
  }
}

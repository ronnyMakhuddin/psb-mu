// Lapisan data: API Vercel + Neon Postgres (produksi) atau memori lokal (Mode Preview).
import { IS_PREVIEW } from './config.js';

export const STATUS = ['menunggu', 'diverifikasi', 'diterima', 'ditolak'];
export const ROLE_LABEL = {
  admin: 'Admin',
  operator_pendidikan: 'Operator Unit Pendidikan',
  operator_asrama: 'Operator Unit Asrama',
};

// Kolom biodata yang boleh diisi pendaftar
export const BIODATA_FIELDS = [
  'nama_lengkap', 'nik', 'nisn', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'anak_ke',
  'jumlah_saudara', 'alamat', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'kode_pos',
  'asal_sekolah', 'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'nama_wali',
  'hubungan_wali', 'penghasilan', 'email',
];

export const normHp = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  return d.startsWith('62') ? '0' + d.slice(2) : d;
};

// =====================================================================
// MODE PRODUKSI: API Vercel (/api/psb) + Neon Postgres
// =====================================================================
const TOKEN_KEY = 'psb_staff_token';
const tokenStore = {
  get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ } },
};

async function call(action, body = {}) {
  let r;
  try {
    const token = tokenStore.get();
    r = await fetch('/api/psb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action, ...body }),
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.');
  }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) tokenStore.set(null);
  if (!r.ok) throw new Error(j.error || `Terjadi kesalahan (${r.status})`);
  return j.data;
}

function serverApi() {
  return {
    mode: 'api',
    getPengaturan: () => call('getPengaturan'),
    updatePengaturan: (data) => call('updatePengaturan', { data }),
    listUnits: () => call('listUnits'),
    saveUnit: (data) => call('saveUnit', { data }),
    deleteUnit: (id) => call('deleteUnit', { id }),
    listKontak: () => call('listKontak'),
    updateMyUnit: (data) => call('updateMyUnit', data),
    updateMyProfile: (data) => call('updateMyProfile', data),
    daftar: (payload) => call('daftar', { payload }),
    loginPendaftar: (no, hp) => call('loginPendaftar', { no, hp }),
    updateBiodata: (no, hp, payload) => call('updateBiodata', { no, hp, payload }),
    listPengumuman: ({ onlyVisible = false } = {}) => call('listPengumuman', { onlyVisible }),
    savePengumuman: (data) => call('savePengumuman', { data }),
    deletePengumuman: (id) => call('deletePengumuman', { id }),
    setupStatus: () => call('setupStatus'),
    async setupAdmin(data) { const r = await call('setupAdmin', data); tokenStore.set(r.token); return r.profile; },
    async signIn(email, password) { const r = await call('signIn', { email, password }); tokenStore.set(r.token); return r.profile; },
    async signOut() { tokenStore.set(null); },
    async currentProfile() { return tokenStore.get() ? call('me') : null; },
    changePassword: (oldPassword, newPassword) => call('changePassword', { oldPassword, newPassword }),
    listPendaftar: () => call('listPendaftar'),
    updatePendaftar: (id, patch) => call('updatePendaftar', { id, patch }),
    deletePendaftar: (id) => call('deletePendaftar', { id }),
    listProfiles: () => call('listProfiles'),
    updateProfile: (id, patch) => call('updateProfile', { id, patch }),
    createUser: (data) => call('createUser', { data }),
    resetPassword: (id, password) => call('resetPassword', { id, password }),
    deleteUser: (id) => call('deleteUser', { id }),
  };
}

// =====================================================================
// MODE PREVIEW (data dummy minimal di memori)
// =====================================================================
function previewApi() {
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  const now = () => new Date().toISOString();
  const db = {
    pengaturan: {
      id: 1, tahun_ajaran: '2027/2028', gelombang: 'Gelombang 1', pendaftaran_buka: true, prefix_nomor: 'MU',
      kontak_wa: '081234567890', alamat: 'Awang-awang, Mojosari, Mojokerto, Jawa Timur',
      syarat_pendaftaran: "PERSYARATAN UMUM\n- Beragama Islam dan bersedia mematuhi tata tertib Yayasan Mamba'ul Ulum\n- Sehat jasmani dan rohani\n- Lulus atau akan lulus dari jenjang sebelumnya (SD/MI untuk MTs, SMP/MTs untuk MA/SMK)\n- Bersedia tinggal di asrama bagi yang memilih program pondok\n\nBERKAS YANG DIBAWA SAAT DAFTAR ULANG\n- Fotokopi Akta Kelahiran (2 lembar)\n- Fotokopi Kartu Keluarga (2 lembar)\n- Fotokopi KTP ayah, ibu, atau wali (masing-masing 2 lembar)\n- Fotokopi ijazah/SKL atau rapor semester terakhir (2 lembar)\n- Fotokopi kartu NISN\n- Pas foto 3x4 berwarna (4 lembar)\n- Fotokopi KIP/PKH/KKS bila ada\n- Surat keterangan sehat dari dokter atau puskesmas\n\nKETENTUAN LAIN\n- Mengisi formulir pendaftaran online dengan data yang benar\n- Mengikuti tes seleksi (baca Al-Qur'an dan wawancara) sesuai jadwal dari panitia\n- Menyimpan Nomor Pendaftaran untuk cek status dan daftar ulang",
      info_pendaftaran: 'Pendaftaran dibuka mulai 1 Desember 2026. Silakan isi formulir secara lengkap dan simpan nomor pendaftaran Anda.',
    },
    units: [
      { id: 'u1', nama: "MTs Mamba'ul Ulum", jenis: 'pendidikan', keterangan: 'Madrasah Tsanawiyah', kuota: 120, aktif: true, urutan: 1, wa_operator: '081234567891', instagram: 'mtsmambaululum', facebook: '', tiktok: 'mtsmambaululum', youtube: '', website: '', brosur: 'https://drive.google.com/' },
      { id: 'u2', nama: "SMK Mamba'ul Ulum", jenis: 'pendidikan', keterangan: 'Sekolah Menengah Kejuruan', kuota: 144, aktif: true, urutan: 2 },
      { id: 'u3', nama: 'Asrama Putra', jenis: 'asrama', keterangan: 'Pondok Pesantren Putra', kuota: 100, aktif: true, urutan: 1, wa_operator: '081234567892', instagram: 'ppmambaululum', facebook: 'ppmambaululum', tiktok: '', youtube: 'ppmambaululum', website: '' },
      { id: 'u4', nama: 'Asrama Putri', jenis: 'asrama', keterangan: 'Pondok Pesantren Putri', kuota: 100, aktif: true, urutan: 2 },
    ],
    profiles: [
      { id: 'p1', nama: 'Administrator', email: 'admin@preview.id', role: 'admin', unit_id: null, no_wa: '081234567890', tampil_kontak: true },
      { id: 'p2', nama: 'Ustadz Ahmad (Operator MTs)', email: 'mts@preview.id', role: 'operator_pendidikan', unit_id: 'u1', no_wa: '081234567891', tampil_kontak: true },
      { id: 'p3', nama: 'Ustadz Hasan (Asrama Putra)', email: 'putra@preview.id', role: 'operator_asrama', unit_id: 'u3', no_wa: '081234567892', tampil_kontak: true },
    ],
    pendaftar: [
      {
        id: 'd1', no_pendaftaran: 'MU260001', tahun_ajaran: '2027/2028', gelombang: 'Gelombang 1',
        nama_lengkap: 'Ahmad Fauzan', nik: '3516010101120001', nisn: '0121234567', jenis_kelamin: 'L',
        tempat_lahir: 'Mojokerto', tanggal_lahir: '2014-03-12', anak_ke: 1, jumlah_saudara: 2,
        alamat: 'Jl. Raya Awang-awang No. 5', desa: 'Awang-awang', kecamatan: 'Mojosari', kabupaten: 'Mojokerto',
        provinsi: 'Jawa Timur', kode_pos: '61382', asal_sekolah: 'MI Mamba\'ul Ulum',
        nama_ayah: 'Abdul Rahman', pekerjaan_ayah: 'Wiraswasta', nama_ibu: 'Siti Aminah', pekerjaan_ibu: 'Ibu Rumah Tangga',
        nama_wali: '', hubungan_wali: '', penghasilan: '2-5 juta', no_hp: '081234567890', email: '',
        unit_pendidikan_id: 'u1', unit_asrama_id: 'u3', status_pendidikan: 'diverifikasi', catatan_pendidikan: 'Berkas lengkap.',
        status_asrama: 'menunggu', catatan_asrama: '', created_at: now(), updated_at: now(),
      },
    ],
    pengumuman: [
      { id: 'n1', judul: 'Jadwal Tes Seleksi', isi: 'Tes baca Al-Qur\'an dan wawancara dilaksanakan Sabtu, 10 Januari 2027 pukul 08.00 WIB di aula yayasan.', unit_id: null, tampil: true, created_at: now() },
    ],
  };
  let seq = 1;
  let me = null;
  const unitById = (id) => db.units.find((u) => u.id === id) || null;
  const pick = (u) => (u ? { id: u.id, nama: u.nama, jenis: u.jenis } : null);
  const withUnits = (d) => ({
    ...d,
    unit_pendidikan: pick(unitById(d.unit_pendidikan_id)), unit_asrama: pick(unitById(d.unit_asrama_id)),
    unit_pendidikan_nama: unitById(d.unit_pendidikan_id)?.nama || null, unit_asrama_nama: unitById(d.unit_asrama_id)?.nama || null,
  });
  const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
  const canSee = (d) => !me ? false
    : me.role === 'admin' ? true
    : me.role === 'operator_pendidikan' ? d.unit_pendidikan_id === me.unit_id
    : d.unit_asrama_id === me.unit_id;
  const setBio = (d, p) => {
    BIODATA_FIELDS.forEach((k) => { if (k in p) d[k] = p[k] === '' ? null : p[k]; });
    if (!d.nama_lengkap) throw new Error('Nama lengkap wajib diisi');
    d.updated_at = now();
  };
  const findApplicant = (no, hp) => db.pendaftar.find((d) => d.no_pendaftaran.toUpperCase() === String(no).trim().toUpperCase() && d.no_hp === normHp(hp));

  return {
    mode: 'preview',
    quickLogins: db.profiles,
    async getPengaturan() { return delay(db.pengaturan); },
    async updatePengaturan(p) { Object.assign(db.pengaturan, p); return delay(db.pengaturan); },
    async listUnits() { return delay(me ? db.units : db.units.filter((u) => u.aktif)); },
    async saveUnit(u) {
      if (u.id) { Object.assign(db.units.find((x) => x.id === u.id), u); return delay(u); }
      const n = { ...u, id: uid() }; db.units.push(n); return delay(n);
    },
    async deleteUnit(id) { db.units = db.units.filter((u) => u.id !== id); },
    async updateMyUnit(d) {
      const u = unitById(me?.unit_id);
      if (!u) throw new Error('Akun Anda belum memiliki unit');
      Object.assign(u, d); return delay(u);
    },
    async listKontak() {
      return delay(db.profiles.filter((p) => p.tampil_kontak && p.no_wa).map((p) => ({ id: p.id, nama: p.nama, role: p.role, no_wa: p.no_wa, unit_id: p.unit_id, unit: pick(unitById(p.unit_id)) })));
    },
    async updateMyProfile(d) { Object.assign(me, { nama: d.nama || me.nama, no_wa: normHp(d.no_wa) || null, tampil_kontak: d.tampil_kontak !== false }); return { ok: true }; },
    async daftar(p) {
      if (!db.pengaturan.pendaftaran_buka) throw new Error('Pendaftaran sedang ditutup');
      if (normHp(p.no_hp).length < 9) throw new Error('Nomor HP tidak valid');
      if (!unitById(p.unit_pendidikan_id)) throw new Error('Unit pendidikan tidak valid');
      seq += 1;
      const d = {
        id: uid(), no_pendaftaran: db.pengaturan.prefix_nomor + String(new Date().getFullYear()).slice(2) + String(seq).padStart(4, '0'),
        tahun_ajaran: db.pengaturan.tahun_ajaran, gelombang: db.pengaturan.gelombang, no_hp: normHp(p.no_hp),
        unit_pendidikan_id: p.unit_pendidikan_id, unit_asrama_id: p.unit_asrama_id || null,
        status_pendidikan: 'menunggu', status_asrama: 'menunggu', catatan_pendidikan: '', catatan_asrama: '', created_at: now(),
      };
      setBio(d, p);
      db.pendaftar.unshift(d);
      return delay(withUnits(d));
    },
    async loginPendaftar(no, hp) {
      const d = findApplicant(no, hp);
      if (!d) throw new Error('Nomor pendaftaran atau nomor HP salah');
      return delay(withUnits(d));
    },
    async updateBiodata(no, hp, p) {
      const d = findApplicant(no, hp);
      if (!d) throw new Error('Sesi tidak valid, silakan login ulang');
      if (['diterima', 'ditolak'].includes(d.status_pendidikan)) throw new Error('Biodata sudah dikunci karena pendaftaran telah diputuskan. Hubungi panitia untuk perubahan.');
      setBio(d, p);
      return delay(withUnits(d));
    },
    async listPengumuman({ onlyVisible = false } = {}) {
      return delay(db.pengumuman.filter((n) => !onlyVisible || n.tampil).map((n) => ({ ...n, unit: pick(unitById(n.unit_id)) })));
    },
    async savePengumuman(p) {
      const { unit, ...rest } = p;
      if (me.role !== 'admin' && rest.unit_id !== me.unit_id) throw new Error('Operator hanya boleh membuat pengumuman untuk unitnya');
      if (rest.id) { Object.assign(db.pengumuman.find((x) => x.id === rest.id), rest); return delay(rest); }
      const n = { ...rest, id: uid(), created_at: now() }; db.pengumuman.unshift(n); return delay(n);
    },
    async deletePengumuman(id) { db.pengumuman = db.pengumuman.filter((n) => n.id !== id); },
    async signIn(email) {
      const p = db.profiles.find((x) => x.email === email);
      if (!p) throw new Error('Email atau password salah');
      me = p; return this.currentProfile();
    },
    async setupStatus() { return { needed: false }; },
    async setupAdmin() { throw new Error('Tidak tersedia di Mode Preview'); },
    async changePassword() { return { ok: true }; },
    async signOut() { me = null; },
    async currentProfile() { return me ? delay({ ...me, unit: pick(unitById(me.unit_id)) }) : null; },
    async listPendaftar() { return delay(db.pendaftar.filter(canSee).map(withUnits)); },
    async updatePendaftar(id, patch) {
      const d = db.pendaftar.find((x) => x.id === id);
      if (!d || !canSee(d)) throw new Error('Tidak diizinkan');
      const p = { ...patch };
      delete p.unit_pendidikan; delete p.unit_asrama; delete p.no_pendaftaran;
      if (me.role === 'operator_pendidikan') { delete p.status_asrama; delete p.catatan_asrama; delete p.unit_asrama_id; }
      if (me.role === 'operator_asrama') { delete p.status_pendidikan; delete p.catatan_pendidikan; delete p.unit_pendidikan_id; }
      Object.assign(d, p, { updated_at: now() });
      return delay(withUnits(d));
    },
    async deletePendaftar(id) { db.pendaftar = db.pendaftar.filter((d) => d.id !== id); },
    async listProfiles() { return delay(db.profiles.map((p) => ({ ...p, unit: pick(unitById(p.unit_id)) }))); },
    async updateProfile(id, patch) { Object.assign(db.profiles.find((p) => p.id === id), { ...patch, no_wa: normHp(patch.no_wa) || null }); return delay(patch); },
    async createUser(u) {
      if (db.profiles.some((p) => p.email === u.email)) throw new Error('Email sudah terdaftar');
      db.profiles.push({ id: uid(), nama: u.nama, email: u.email, role: u.role, unit_id: u.unit_id || null, no_wa: normHp(u.no_wa) || null, tampil_kontak: u.tampil_kontak !== false });
      return { ok: true };
    },
    async resetPassword() { return { ok: true }; },
    async deleteUser(id) {
      if (id === me?.id) throw new Error('Tidak bisa menghapus akun sendiri');
      db.profiles = db.profiles.filter((p) => p.id !== id);
      return { ok: true };
    },
  };
}

// =====================================================================
// INISIALISASI
// =====================================================================
export async function initData() {
  if (IS_PREVIEW === true) return previewApi();
  if (IS_PREVIEW === false) return serverApi();
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
      const c = await r.json();
      if (c.backend === 'api') return serverApi();
    }
  } catch { /* tidak ada API (mis. dibuka lokal tanpa server) */ }
  return previewApi();
}

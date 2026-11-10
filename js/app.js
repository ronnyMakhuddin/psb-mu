// Aplikasi PSB Yayasan Induk Mamba'ul Ulum
import { initData, STATUS, ROLE_LABEL, BIODATA_FIELDS, normHp } from './data.js';

// ---------------------------------------------------------------------
// STATE & UTILITAS
// ---------------------------------------------------------------------
const S = { api: null, settings: null, units: [], staff: null, applicant: null, lastReg: null };
const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, extra = '') => `<i data-lucide="${n}" ${extra}></i>`;
const icons = () => window.lucide?.createIcons();
const STATUS_LABEL = { menunggu: 'Menunggu', diverifikasi: 'Diverifikasi', diterima: 'Diterima', ditolak: 'Ditolak' };
const STATUS_ICON = { menunggu: 'clock', diverifikasi: 'badge-check', diterima: 'circle-check', ditolak: 'circle-x' };
const badge = (s) => `<span class="badge ${esc(s)}">${ic(STATUS_ICON[s] || 'circle', 'style="width:13px;height:13px"')}${esc(STATUS_LABEL[s] || s)}</span>`;
const fmtDate = (d, withTime = false) => {
  if (!d) return '-';
  const o = { day: 'numeric', month: 'long', year: 'numeric' };
  if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' });
  return new Date(d).toLocaleDateString('id-ID', o);
};
const jk = (v) => (v === 'L' ? 'Laki-laki' : v === 'P' ? 'Perempuan' : '-');
const unitName = (id) => S.units.find((u) => u.id === id)?.nama || '-';
const waLink = (hp, text = '') => {
  const n = normHp(hp).replace(/^0/, '62');
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

// Tautan sosmed: terima URL lengkap atau sekadar nama akun
const SOSMED = [
  { k: 'instagram', l: 'Instagram', icon: 'instagram', url: (v) => `https://instagram.com/${v.replace(/^@/, '')}` },
  { k: 'facebook', l: 'Facebook', icon: 'facebook', url: (v) => `https://facebook.com/${v.replace(/^@/, '')}` },
  { k: 'tiktok', l: 'TikTok', icon: null, url: (v) => `https://www.tiktok.com/@${v.replace(/^@/, '')}` },
  { k: 'youtube', l: 'YouTube', icon: 'youtube', url: (v) => `https://youtube.com/@${v.replace(/^@/, '')}` },
  { k: 'website', l: 'Website', icon: 'globe', url: (v) => `https://${v}` },
];
const TIKTOK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.27 0 .53.04.77.12V9.77a5.7 5.7 0 0 0-.77-.05A5.7 5.7 0 1 0 15.56 15.4V9.01a7.3 7.3 0 0 0 4.27 1.37V7.3a4.28 4.28 0 0 1-3.23-1.48Z"/></svg>';
const sosmedUrl = (s, v) => (/^https?:\/\//i.test(v) ? v : s.url(v.replace(/^https?:\/\//i, '').trim()));
function unitActions(u) {
  const btns = [];
  if (u.wa_operator) {
    btns.push(`<a class="btn btn-sm btn-primary" target="_blank" rel="noopener" href="${esc(waLink(u.wa_operator, `Assalamualaikum, saya ingin bertanya tentang pendaftaran ${u.nama}.`))}">${ic('message-circle')} WA Operator</a>`);
  }
  if (u.brosur) {
    const href = /^https?:\/\//i.test(u.brosur) ? u.brosur : `https://${u.brosur}`;
    btns.push(`<a class="btn btn-sm btn-gold" target="_blank" rel="noopener" href="${esc(href)}">${ic('file-text')} Brosur</a>`);
  }
  SOSMED.forEach((s) => {
    const v = String(u[s.k] || '').trim();
    if (v) btns.push(`<a class="btn btn-sm btn-outline sosmed" target="_blank" rel="noopener" href="${esc(sosmedUrl(s, v))}" title="${s.l}" aria-label="${s.l} ${esc(u.nama)}">${s.icon ? ic(s.icon) : TIKTOK_SVG}<span>${s.l}</span></a>`);
  });
  return btns.length ? `<div class="unit-actions">${btns.join('')}</div>` : '';
}

const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* abaikan */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* abaikan */ } },
};

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.innerHTML = `${ic(type === 'error' ? 'circle-alert' : 'circle-check')}<span>${esc(msg)}</span>`;
  document.getElementById('toasts').appendChild(el);
  icons();
  setTimeout(() => el.remove(), 4200);
}

function openModal({ title, body, foot = '', size = '' }) {
  modalRoot.innerHTML = `
    <div class="modal-bg">
      <div class="modal ${size}" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${title}</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">${ic('x')}</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>
    </div>`;
  const bg = modalRoot.firstElementChild;
  bg.addEventListener('click', (e) => {
    if (e.target === bg || (e.target.closest('[data-close]') && e.target.closest('.modal'))) closeModal();
  });
  icons();
  return bg.querySelector('.modal');
}
const closeModal = () => { modalRoot.innerHTML = ''; };

function confirmDialog(message, { okText = 'Ya, lanjutkan', danger = true } = {}) {
  return new Promise((resolve) => {
    const m = openModal({
      title: 'Konfirmasi', size: 'sm',
      body: `<p style="margin:0">${esc(message)}</p>`,
      foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cf-ok">${esc(okText)}</button>`,
    });
    m.querySelector('#cf-ok').onclick = () => { closeModal(); resolve(true); };
    modalRoot.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => resolve(false)));
  });
}

async function withBusy(btn, fn) {
  const html = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Memproses...'; }
  try { return await fn(); }
  catch (e) { toast(e.message || 'Terjadi kesalahan', 'error'); return undefined; }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = html; icons(); } }
}

const formData = (form) => {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  form.querySelectorAll('input[type=checkbox]').forEach((c) => { o[c.name] = c.checked; });
  return o;
};

const loadingHtml = '<div class="loading"><div class="spinner"></div></div>';
const emptyHtml = (text = 'Belum ada data', icon = 'inbox') => `<div class="empty">${ic(icon)}<div>${esc(text)}</div></div>`;

// ---------------------------------------------------------------------
// DEFINISI FORMULIR BIODATA
// ---------------------------------------------------------------------
const PENGHASILAN = ['< 1 juta', '1-2 juta', '2-5 juta', '5-10 juta', '> 10 juta'];
const F = {
  santri: [
    { k: 'nama_lengkap', l: 'Nama Lengkap', req: true, full: true, ph: 'Sesuai akta kelahiran' },
    { k: 'jenis_kelamin', l: 'Jenis Kelamin', req: true, type: 'select', opts: [['L', 'Laki-laki'], ['P', 'Perempuan']] },
    { k: 'nik', l: 'NIK', ph: '16 digit', pattern: '\\d{16}', inputmode: 'numeric' },
    { k: 'nisn', l: 'NISN', ph: '10 digit', pattern: '\\d{10}', inputmode: 'numeric' },
    { k: 'tempat_lahir', l: 'Tempat Lahir', req: true },
    { k: 'tanggal_lahir', l: 'Tanggal Lahir', req: true, type: 'date' },
    { k: 'anak_ke', l: 'Anak Ke-', type: 'number' },
    { k: 'jumlah_saudara', l: 'Jumlah Saudara', type: 'number' },
    { k: 'asal_sekolah', l: 'Asal Sekolah', req: true, full: true, ph: 'Nama sekolah sebelumnya' },
  ],
  alamat: [
    { k: 'alamat', l: 'Alamat (Jalan, RT/RW)', req: true, full: true, type: 'textarea' },
    { k: 'desa', l: 'Desa/Kelurahan', req: true },
    { k: 'kecamatan', l: 'Kecamatan', req: true },
    { k: 'kabupaten', l: 'Kabupaten/Kota', req: true },
    { k: 'provinsi', l: 'Provinsi', req: true },
    { k: 'kode_pos', l: 'Kode Pos', inputmode: 'numeric' },
  ],
  ortu: [
    { k: 'nama_ayah', l: 'Nama Ayah', req: true },
    { k: 'pekerjaan_ayah', l: 'Pekerjaan Ayah' },
    { k: 'nama_ibu', l: 'Nama Ibu', req: true },
    { k: 'pekerjaan_ibu', l: 'Pekerjaan Ibu' },
    { k: 'nama_wali', l: 'Nama Wali', hint: 'Isi jika tinggal bersama wali' },
    { k: 'hubungan_wali', l: 'Hubungan dengan Wali' },
    { k: 'penghasilan', l: 'Penghasilan Orang Tua / Bulan', type: 'select', opts: PENGHASILAN.map((p) => [p, p]) },
    { k: 'email', l: 'Email (opsional)', type: 'email' },
  ],
};
const SECTIONS = [
  { title: 'Data Calon Santri', icon: 'user', fields: F.santri },
  { title: 'Alamat Tempat Tinggal', icon: 'map-pin', fields: F.alamat },
  { title: 'Data Orang Tua / Wali', icon: 'users', fields: F.ortu },
];

function fieldHtml(f, v = {}, disabled = false) {
  const val = v[f.k] ?? '';
  const common = `name="${f.k}" id="f-${f.k}" ${f.req ? 'required' : ''} ${disabled ? 'disabled' : ''}`;
  let input;
  if (f.type === 'select') {
    input = `<select class="input" ${common}><option value="">— Pilih —</option>${f.opts.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(val) === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea class="input" ${common} rows="2">${esc(val)}</textarea>`;
  } else {
    input = `<input class="input" type="${f.type || 'text'}" ${common} value="${esc(val)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.pattern ? `pattern="${f.pattern}"` : ''} ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} ${f.type === 'number' ? 'min="0" max="30"' : ''}>`;
  }
  return `<div class="field ${f.full ? 'full' : ''}"><label for="f-${f.k}">${esc(f.l)} ${f.req ? '<span class="req">*</span>' : ''}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
}
const sectionHtml = (sec, v, disabled) =>
  `<div class="section-title">${ic(sec.icon)} ${esc(sec.title)}</div>${sec.fields.map((f) => fieldHtml(f, v, disabled)).join('')}`;

function unitSelectFields(v = {}, { disabled = false, lockPend = false, lockAsr = false } = {}) {
  const pend = S.units.filter((u) => u.jenis === 'pendidikan' && (u.aktif || u.id === v.unit_pendidikan_id));
  const asr = S.units.filter((u) => u.jenis === 'asrama' && (u.aktif || u.id === v.unit_asrama_id));
  return `
    <div class="field"><label for="f-unit_pendidikan_id">Unit Pendidikan <span class="req">*</span></label>
      <select class="input" name="unit_pendidikan_id" id="f-unit_pendidikan_id" required ${disabled || lockPend ? 'disabled' : ''}>
        <option value="">— Pilih unit pendidikan —</option>
        ${pend.map((u) => `<option value="${u.id}" ${u.id === v.unit_pendidikan_id ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}
      </select></div>
    <div class="field"><label for="f-unit_asrama_id">Asrama / Pondok</label>
      <select class="input" name="unit_asrama_id" id="f-unit_asrama_id" ${disabled || lockAsr ? 'disabled' : ''}>
        <option value="">Tidak mukim di asrama</option>
        ${asr.map((u) => `<option value="${u.id}" ${u.id === v.unit_asrama_id ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}
      </select></div>`;
}

const pickBiodata = (o) => Object.fromEntries(BIODATA_FIELDS.filter((k) => k in o).map((k) => [k, o[k]]));

function receiptHtml(d) {
  const st = S.settings || {};
  return `
    <div class="receipt" id="receipt">
      <div class="head">
        <img src="/assets/logo.png" alt="Logo">
        <div><b style="font-size:16px">BUKTI PENDAFTARAN SANTRI BARU</b><br>
          <span class="small muted">Yayasan Induk Mamba'ul Ulum · ${esc(st.alamat || 'Awang-awang Mojosari Mojokerto')}</span><br>
          <span class="small muted">Tahun Ajaran ${esc(d.tahun_ajaran || st.tahun_ajaran)} · ${esc(d.gelombang || st.gelombang || '')}</span></div>
      </div>
      <div class="center mb"><div class="small muted">Nomor Pendaftaran</div><div class="nomor">${esc(d.no_pendaftaran)}</div></div>
      <dl class="kv">
        <dt>Nama Lengkap</dt><dd>${esc(d.nama_lengkap)}</dd>
        <dt>Jenis Kelamin</dt><dd>${jk(d.jenis_kelamin)}</dd>
        <dt>Tempat, Tgl Lahir</dt><dd>${esc(d.tempat_lahir || '-')}, ${fmtDate(d.tanggal_lahir)}</dd>
        <dt>Asal Sekolah</dt><dd>${esc(d.asal_sekolah || '-')}</dd>
        <dt>Unit Pendidikan</dt><dd>${esc(d.unit_pendidikan_nama || unitName(d.unit_pendidikan_id))}</dd>
        <dt>Asrama</dt><dd>${esc(d.unit_asrama_nama || (d.unit_asrama_id ? unitName(d.unit_asrama_id) : 'Tidak mukim'))}</dd>
        <dt>Nama Orang Tua</dt><dd>${esc(d.nama_ayah || '-')} / ${esc(d.nama_ibu || '-')}</dd>
        <dt>No. HP / WA</dt><dd>${esc(d.no_hp)}</dd>
        <dt>Tanggal Daftar</dt><dd>${fmtDate(d.created_at, true)}</dd>
      </dl>
      <p class="small muted" style="margin:14px 0 0">Simpan bukti ini. Untuk melihat status, pengumuman, dan mengubah biodata, masuk ke menu <b>Cek Status</b> menggunakan Nomor Pendaftaran dan Nomor HP di atas.</p>
    </div>`;
}

// ---------------------------------------------------------------------
// LAYOUT PUBLIK
// ---------------------------------------------------------------------
function previewBanner() {
  return S.api?.mode === 'preview' ? `<div class="preview-banner no-print">${ic('flask-conical', 'style="width:14px;height:14px"')} Mode Preview Aktif — data contoh, tidak tersimpan</div>` : '';
}

function publicLayout(content) {
  const a = S.applicant;
  app.innerHTML = `
    ${previewBanner()}
    <header class="topnav"><div class="inner">
      <a class="brand" href="#/"><img src="/assets/logo.png" alt="Logo Mamba'ul Ulum"><div><b>PSB Mamba'ul Ulum</b><span>Awang-awang Mojosari Mojokerto</span></div></a>
      <nav>
        ${a ? `<a class="btn btn-outline btn-sm" href="#/akun">${ic('user-round')}<span class="label">Akun Saya</span></a>`
            : `<a class="btn btn-ghost btn-sm" href="#/masuk">${ic('search-check')}<span class="label">Cek Status</span></a>`}
        <a class="btn btn-primary btn-sm" href="#/daftar">${ic('pen-line')}<span class="label">Daftar</span></a>
      </nav>
    </div></header>
    <main class="container">${content}</main>
    <footer class="footer no-print">
      © ${new Date().getFullYear()} Yayasan Induk Mamba'ul Ulum · ${esc(S.settings?.alamat || 'Awang-awang, Mojosari, Mojokerto')}<br>
      <a href="#/petugas">Masuk Petugas</a>
    </footer>`;
  icons();
}

// ---------------------------------------------------------------------
// HALAMAN BERANDA
// ---------------------------------------------------------------------
async function pageHome() {
  publicLayout(loadingHtml);
  let news = [];
  try {
    news = await S.api.listPengumuman({ onlyVisible: true });
  } catch (e) { toast(e.message, 'error'); }
  const st = S.settings;
  const open = st.pendaftaran_buka;
  const unitCard = (u) => `
    <div class="card unit-card-wrap">
      <div class="unit-card">
        <div class="ic ${u.jenis}">${ic(u.jenis === 'asrama' ? 'house' : 'graduation-cap')}</div>
        <div class="grow"><b>${esc(u.nama)}</b><div class="small muted">${esc(u.keterangan || (u.jenis === 'asrama' ? 'Asrama' : 'Unit Pendidikan'))}</div></div>
        ${u.kuota ? `<span class="badge neutral">Kuota ${u.kuota}</span>` : ''}
      </div>
      ${unitActions(u)}
    </div>`;
  const pend = S.units.filter((u) => u.jenis === 'pendidikan');
  const asr = S.units.filter((u) => u.jenis === 'asrama');
  const pub = news.filter((n) => !n.unit_id).slice(0, 5);

  publicLayout(`
    <section class="hero">
      <div>
        <span class="eyebrow ${open ? '' : 'closed'}">${ic(open ? 'sparkles' : 'lock', 'style="width:14px;height:14px"')} ${open ? `Pendaftaran Dibuka · ${esc(st.gelombang)}` : 'Pendaftaran Sedang Ditutup'}</span>
        <h1>Penerimaan Santri Baru <em>Mamba'ul Ulum</em><br>Tahun Ajaran ${esc(st.tahun_ajaran)}</h1>
        <p class="lead">Bergabunglah bersama keluarga besar Yayasan Induk Mamba'ul Ulum Awang-awang Mojosari Mojokerto. Daftar online cukup dari HP, tanpa perlu membuat akun.</p>
        <div class="row mt">
          ${open ? `<a class="btn btn-primary" href="#/daftar">${ic('pen-line')} Daftar Sekarang</a>` : ''}
          <a class="btn btn-outline" href="#/masuk">${ic('search-check')} Cek Status Pendaftaran</a>
        </div>
      </div>
      <div class="logo-wrap"><img src="/assets/logo.png" alt="Logo Yayasan Induk Mamba'ul Ulum"></div>
    </section>

    ${st.info_pendaftaran ? `<div class="card mb"><h3>${ic('info')} Informasi Pendaftaran</h3><p style="margin:0;white-space:pre-line">${esc(st.info_pendaftaran)}</p></div>` : ''}

    <h2 class="mt" style="font-size:20px">Alur Pendaftaran</h2>
    <div class="grid-3 mb">
      <div class="card step"><div class="num">1</div><div><b>Isi Formulir</b><div class="small muted">Lengkapi data calon santri, orang tua, dan pilih unit pendidikan serta asrama.</div></div></div>
      <div class="card step"><div class="num">2</div><div><b>Simpan Nomor</b><div class="small muted">Catat Nomor Pendaftaran dan cetak bukti. Nomor ini dipakai untuk masuk bersama Nomor HP.</div></div></div>
      <div class="card step"><div class="num" style="background:var(--gold);color:#3a2c00">3</div><div><b>Pantau Status</b><div class="small muted">Cek hasil verifikasi, pengumuman, dan perbarui biodata kapan saja.</div></div></div>
    </div>

    <div class="grid-2">
      <div>
        <h2 style="font-size:20px">Unit Pendidikan</h2>
        ${pend.length ? pend.map(unitCard).join('') : `<div class="card">${emptyHtml('Belum ada unit pendidikan')}</div>`}
        <h2 class="mt" style="font-size:20px">Asrama</h2>
        ${asr.length ? asr.map(unitCard).join('') : `<div class="card">${emptyHtml('Belum ada asrama')}</div>`}
      </div>
      <div>
        <h2 style="font-size:20px">Pengumuman</h2>
        <div class="card">
          ${pub.length ? pub.map(newsHtml).join('') : emptyHtml('Belum ada pengumuman', 'megaphone')}
        </div>
        ${st.kontak_wa ? `<div class="card"><h3>${ic('phone')} Butuh bantuan?</h3><p class="muted small" style="margin-top:0">Hubungi panitia PSB melalui WhatsApp.</p><a class="btn btn-gold" target="_blank" rel="noopener" href="${waLink(st.kontak_wa, 'Assalamualaikum, saya ingin bertanya tentang PSB Mamba\'ul Ulum')}">${ic('message-circle')} ${esc(st.kontak_wa)}</a></div>` : ''}
      </div>
    </div>`);
}

const newsHtml = (n) => `
  <div class="news"><h4>${esc(n.judul)}</h4><p>${esc(n.isi)}</p>
    <div class="meta">${ic('calendar', 'style="width:13px;height:13px"')} ${fmtDate(n.created_at)} ${n.unit ? `<span class="badge gold">${esc(n.unit.nama)}</span>` : ''}</div></div>`;

// ---------------------------------------------------------------------
// HALAMAN PENDAFTARAN
// ---------------------------------------------------------------------
async function pageDaftar() {
  const st = S.settings;
  if (!st.pendaftaran_buka) {
    publicLayout(`<div class="card auth-box center">${ic('lock', 'style="width:42px;height:42px;color:var(--red)"')}<h2 class="mt">Pendaftaran Ditutup</h2><p class="muted">Pendaftaran santri baru saat ini sedang ditutup. Pantau pengumuman di halaman depan.</p><a class="btn btn-primary" href="#/">Kembali ke Beranda</a></div>`);
    return;
  }
  const draft = store.get('psb_draft') || {};
  const steps = [
    { title: 'Data Calon Santri', html: (v) => sectionHtml(SECTIONS[0], v) + sectionHtml(SECTIONS[1], v) },
    { title: 'Data Orang Tua / Wali', html: (v) => sectionHtml(SECTIONS[2], v) },
    {
      title: 'Pilihan Unit & Kontak',
      html: (v) => `
        <div class="section-title">${ic('school')} Pilihan Unit</div>
        ${unitSelectFields(v)}
        <div class="section-title">${ic('smartphone')} Kontak (dipakai untuk login)</div>
        <div class="field full"><label for="f-no_hp">Nomor HP / WhatsApp Orang Tua <span class="req">*</span></label>
          <input class="input" type="tel" name="no_hp" id="f-no_hp" required inputmode="tel" placeholder="08xxxxxxxxxx" value="${esc(v.no_hp || '')}" pattern="[0-9+\\s\\-]{9,20}">
          <div class="hint">Nomor ini bersama Nomor Pendaftaran digunakan untuk masuk dan melihat status. Pastikan aktif.</div></div>
        <div class="field full"><label class="switch" style="text-transform:none;letter-spacing:0;font-size:14px;color:var(--text)"><input type="checkbox" name="setuju" required> Saya menyatakan data yang diisi adalah benar.</label></div>`,
    },
  ];
  let cur = 0;
  const data = { ...draft };

  const render = () => {
    publicLayout(`
      <div class="narrow">
        <div class="page-head"><h2>Formulir Pendaftaran</h2><p class="muted" style="margin:0">Tahun Ajaran ${esc(st.tahun_ajaran)} · ${esc(st.gelombang)} — Langkah ${cur + 1} dari ${steps.length}: <b>${steps[cur].title}</b></p></div>
        <div class="stepper">${steps.map((_, i) => `<div class="${i <= cur ? 'on' : ''}"></div>`).join('')}</div>
        <form class="card" id="reg-form" novalidate>
          <div class="form-grid">${steps[cur].html(data)}</div>
          <div class="row between mt">
            ${cur > 0 ? `<button type="button" class="btn btn-outline" id="prev">${ic('arrow-left')} Kembali</button>` : '<span></span>'}
            <button class="btn btn-primary" type="submit" id="next">${cur < steps.length - 1 ? `Lanjut ${ic('arrow-right')}` : `${ic('send')} Kirim Pendaftaran`}</button>
          </div>
        </form>
      </div>`);
    const form = document.getElementById('reg-form');
    const save = () => { Object.assign(data, formData(form)); delete data.setuju; store.set('psb_draft', data); };
    form.addEventListener('input', save);
    document.getElementById('prev')?.addEventListener('click', () => { save(); cur -= 1; render(); window.scrollTo(0, 0); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      save();
      if (cur < steps.length - 1) { cur += 1; render(); window.scrollTo(0, 0); return; }
      await withBusy(document.getElementById('next'), async () => {
        const res = await S.api.daftar({ ...data, no_hp: normHp(data.no_hp) });
        store.del('psb_draft');
        S.lastReg = res;
        S.applicant = { no: res.no_pendaftaran, hp: res.no_hp };
        store.set('psb_applicant', S.applicant);
        location.hash = '#/daftar/sukses';
      });
    });
  };
  render();
}

function pageDaftarSukses() {
  const d = S.lastReg;
  if (!d) { location.hash = '#/akun'; return; }
  publicLayout(`
    <div class="narrow">
      <div class="card center no-print" style="margin-bottom:16px">
        ${ic('party-popper', 'style="width:44px;height:44px;color:var(--green-700)"')}
        <h2 class="mt">Pendaftaran Berhasil!</h2>
        <p class="muted" style="margin:0">Simpan baik-baik Nomor Pendaftaran Anda. Gunakan bersama Nomor HP untuk masuk.</p>
      </div>
      ${receiptHtml(d)}
      <div class="row mt no-print" style="justify-content:center">
        <button class="btn btn-gold" onclick="window.print()">${ic('printer')} Cetak / Simpan PDF</button>
        <a class="btn btn-primary" href="#/akun">${ic('layout-dashboard')} Lihat Status</a>
      </div>
    </div>`);
}

// ---------------------------------------------------------------------
// LOGIN & AKUN PENDAFTAR
// ---------------------------------------------------------------------
function pageMasuk() {
  if (S.applicant) { location.hash = '#/akun'; return; }
  publicLayout(`
    <div class="card auth-box">
      <img class="logo" src="/assets/logo.png" alt="">
      <h2 class="center">Cek Status Pendaftaran</h2>
      <p class="center muted small">Masuk menggunakan Nomor Pendaftaran dan Nomor HP yang didaftarkan.</p>
      <form id="login-form" class="form-grid" style="grid-template-columns:1fr">
        <div class="field"><label for="no">Nomor Pendaftaran</label><input class="input" id="no" name="no" required placeholder="Contoh: MU260001" autocomplete="username" style="text-transform:uppercase"></div>
        <div class="field"><label for="hp">Nomor HP / WhatsApp</label><input class="input" id="hp" name="hp" type="tel" inputmode="tel" required placeholder="08xxxxxxxxxx" autocomplete="tel"></div>
        <button class="btn btn-primary btn-block" id="login-btn">${ic('log-in')} Masuk</button>
      </form>
      ${S.api.mode === 'preview' ? `<div class="quick"><span class="small muted">Coba cepat (preview):</span><button class="btn btn-outline btn-sm" id="quick-app">${ic('zap')} Masuk sebagai pendaftar contoh</button></div>` : ''}
      <p class="center small muted mt">Belum mendaftar? <a href="#/daftar">Daftar sekarang</a></p>
    </div>`);
  const form = document.getElementById('login-form');
  const go = async (no, hp) => withBusy(document.getElementById('login-btn'), async () => {
    const d = await S.api.loginPendaftar(no, hp);
    S.applicant = { no: d.no_pendaftaran, hp: d.no_hp };
    store.set('psb_applicant', S.applicant);
    toast(`Selamat datang, ${d.nama_lengkap}`);
    location.hash = '#/akun';
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = formData(form); go(v.no, v.hp); });
  document.getElementById('quick-app')?.addEventListener('click', () => go('MU260001', '081234567890'));
}

async function pageAkun(tab = 'status') {
  if (!S.applicant) { location.hash = '#/masuk'; return; }
  publicLayout(loadingHtml);
  let d, news = [];
  try {
    [d, news] = await Promise.all([S.api.loginPendaftar(S.applicant.no, S.applicant.hp), S.api.listPengumuman({ onlyVisible: true })]);
  } catch (e) {
    toast(e.message, 'error'); S.applicant = null; store.del('psb_applicant'); location.hash = '#/masuk'; return;
  }
  news = news.filter((n) => !n.unit_id || n.unit_id === d.unit_pendidikan_id || n.unit_id === d.unit_asrama_id);
  const locked = ['diterima', 'ditolak'].includes(d.status_pendidikan);
  const tabs = [['status', 'Status'], ['biodata', 'Biodata'], ['pengumuman', `Pengumuman (${news.length})`], ['bukti', 'Bukti Daftar']];

  let body = '';
  if (tab === 'status') {
    const msg = {
      menunggu: 'Pendaftaran Anda sudah kami terima dan sedang menunggu verifikasi panitia.',
      diverifikasi: 'Berkas Anda sudah diverifikasi. Mohon tunggu pengumuman hasil seleksi.',
      diterima: 'Selamat! Anda dinyatakan DITERIMA. Silakan ikuti pengumuman untuk tahap daftar ulang.',
      ditolak: 'Mohon maaf, pendaftaran Anda belum dapat diterima. Silakan hubungi panitia untuk informasi lebih lanjut.',
    };
    body = `
      <div class="grid-2">
        <div class="card"><h3>${ic('graduation-cap')} Unit Pendidikan</h3><p style="margin:0 0 8px"><b>${esc(d.unit_pendidikan_nama || '-')}</b></p>${badge(d.status_pendidikan)}
          <p class="small" style="margin:10px 0 0">${msg[d.status_pendidikan]}</p>
          ${d.catatan_pendidikan ? `<div class="verify-box mt small"><b>Catatan panitia:</b><br>${esc(d.catatan_pendidikan)}</div>` : ''}</div>
        <div class="card"><h3>${ic('house')} Asrama</h3><p style="margin:0 0 8px"><b>${esc(d.unit_asrama_nama || 'Tidak mukim di asrama')}</b></p>
          ${d.unit_asrama_id ? `${badge(d.status_asrama)}<p class="small" style="margin:10px 0 0">${msg[d.status_asrama]}</p>
          ${d.catatan_asrama ? `<div class="verify-box mt small"><b>Catatan pengurus asrama:</b><br>${esc(d.catatan_asrama)}</div>` : ''}` : '<span class="muted small">—</span>'}</div>
      </div>
      ${news[0] ? `<div class="card"><h3>${ic('megaphone')} Pengumuman Terbaru</h3>${newsHtml(news[0])}</div>` : ''}`;
  } else if (tab === 'biodata') {
    body = `
      <form class="card" id="bio-form">
        ${locked ? `<div class="verify-box mb small">${ic('lock', 'style="width:14px;height:14px;vertical-align:-2px"')} Biodata sudah dikunci karena pendaftaran telah diputuskan. Hubungi panitia bila ada perubahan.</div>` : ''}
        <div class="form-grid">
          ${SECTIONS.map((s) => sectionHtml(s, d, locked)).join('')}
          <div class="section-title">${ic('school')} Pilihan Unit & Kontak</div>
          ${unitSelectFields(d, { disabled: true })}
          <div class="field full"><label>Nomor HP</label><input class="input" value="${esc(d.no_hp)}" disabled><div class="hint">Unit dan nomor HP hanya dapat diubah oleh panitia.</div></div>
        </div>
        ${locked ? '' : `<div class="row mt" style="justify-content:flex-end"><button class="btn btn-primary" id="bio-save">${ic('save')} Simpan Perubahan</button></div>`}
      </form>`;
  } else if (tab === 'pengumuman') {
    body = `<div class="card">${news.length ? news.map(newsHtml).join('') : emptyHtml('Belum ada pengumuman', 'megaphone')}</div>`;
  } else {
    body = `${receiptHtml(d)}<div class="row mt no-print" style="justify-content:center"><button class="btn btn-gold" onclick="window.print()">${ic('printer')} Cetak / Simpan PDF</button></div>`;
  }

  publicLayout(`
    <div class="narrow">
      <div class="card no-print" style="margin-bottom:16px">
        <div class="row between">
          <div><div class="small muted">Assalamu'alaikum,</div><h2 style="margin:0;font-size:22px">${esc(d.nama_lengkap)}</h2>
            <div class="small muted">No. Pendaftaran <b style="color:var(--green-800)">${esc(d.no_pendaftaran)}</b></div></div>
          <button class="btn btn-outline btn-sm" id="out">${ic('log-out')} Keluar</button>
        </div>
      </div>
      <div class="tabs no-print">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${body}
    </div>`);
  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => pageAkun(b.dataset.tab)));
  document.getElementById('out').onclick = () => { S.applicant = null; store.del('psb_applicant'); location.hash = '#/'; };
  const bio = document.getElementById('bio-form');
  if (bio && !locked) {
    bio.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!bio.reportValidity()) return;
      await withBusy(document.getElementById('bio-save'), async () => {
        await S.api.updateBiodata(S.applicant.no, S.applicant.hp, pickBiodata(formData(bio)));
        toast('Biodata berhasil disimpan');
      });
    });
  }
}

// ---------------------------------------------------------------------
// LOGIN PETUGAS
// ---------------------------------------------------------------------
async function pagePetugasLogin() {
  if (S.staff) { location.hash = '#/admin/dashboard'; return; }
  try {
    const st = await S.api.setupStatus();
    if (st?.needed) { location.hash = '#/setup'; return; }
  } catch (e) { toast(e.message, 'error'); }
  publicLayout(`
    <div class="card auth-box">
      <img class="logo" src="/assets/logo.png" alt="">
      <h2 class="center">Masuk Petugas</h2>
      <p class="center muted small">Admin, Operator Unit Pendidikan, dan Operator Unit Asrama.</p>
      <form id="staff-form" class="form-grid" style="grid-template-columns:1fr">
        <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" required autocomplete="username"></div>
        <div class="field"><label for="password">Password</label><input class="input" id="password" name="password" type="password" required autocomplete="current-password"></div>
        <button class="btn btn-primary btn-block" id="staff-btn">${ic('shield-check')} Masuk</button>
      </form>
      ${S.api.mode === 'preview' ? `<div class="quick"><span class="small muted">Quick login (preview):</span>
        ${S.api.quickLogins.map((p) => `<button class="btn btn-outline btn-sm" data-quick="${esc(p.email)}">${ic('zap')} ${esc(ROLE_LABEL[p.role])}</button>`).join('')}</div>` : ''}
    </div>`);
  const form = document.getElementById('staff-form');
  const go = (email, pw) => withBusy(document.getElementById('staff-btn'), async () => {
    S.staff = await S.api.signIn(email, pw);
    toast(`Selamat datang, ${S.staff.nama || S.staff.email}`);
    location.hash = '#/admin/dashboard';
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = formData(form); go(v.email, v.password); });
  document.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => go(b.dataset.quick, 'preview')));
}

// Setup admin pertama (hanya bisa sekali, saat belum ada petugas sama sekali)
async function pageSetup() {
  let needed = false;
  try { needed = (await S.api.setupStatus())?.needed; } catch (e) { toast(e.message, 'error'); }
  if (!needed) { location.hash = '#/petugas'; return; }
  publicLayout(`
    <div class="card auth-box">
      <img class="logo" src="/assets/logo.png" alt="">
      <h2 class="center">Buat Akun Admin Pertama</h2>
      <p class="center muted small">Database sudah terhubung tetapi belum ada akun petugas. Akun ini menjadi Admin utama dan halaman ini otomatis tertutup setelahnya.</p>
      <form id="setup-form" class="form-grid" style="grid-template-columns:1fr">
        <div class="field"><label for="s-nama">Nama</label><input class="input" id="s-nama" name="nama" required value="Administrator"></div>
        <div class="field"><label for="s-email">Email</label><input class="input" id="s-email" name="email" type="email" required autocomplete="username"></div>
        <div class="field"><label for="s-pw">Password</label><input class="input" id="s-pw" name="password" type="password" minlength="6" required autocomplete="new-password"></div>
        <button class="btn btn-primary btn-block" id="setup-btn">${ic('shield-plus')} Buat Admin &amp; Masuk</button>
      </form>
    </div>`);
  const f = document.getElementById('setup-form');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!f.reportValidity()) return;
    withBusy(document.getElementById('setup-btn'), async () => {
      S.staff = await S.api.setupAdmin(formData(f));
      S.units = await S.api.listUnits();
      toast('Akun admin dibuat. Selamat datang!');
      location.hash = '#/admin/dashboard';
    });
  });
}

function changeOwnPassword() {
  const m = openModal({
    title: 'Ganti Password', size: 'sm',
    body: `<form id="cp-form" class="form-grid" style="grid-template-columns:1fr">
      <div class="field"><label for="cp-old">Password Lama</label><input class="input" id="cp-old" name="old" type="password" required autocomplete="current-password"></div>
      <div class="field"><label for="cp-new">Password Baru</label><input class="input" id="cp-new" name="new" type="password" minlength="6" required autocomplete="new-password"></div>
    </form>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="cp-save">${ic('key-round')} Simpan</button>`,
  });
  m.querySelector('#cp-save').onclick = (e) => withBusy(e.currentTarget, async () => {
    const f = m.querySelector('#cp-form');
    if (!f.reportValidity()) return;
    const v = formData(f);
    await S.api.changePassword(v.old, v.new);
    closeModal(); toast('Password berhasil diganti');
  });
}

// ---------------------------------------------------------------------
// LAYOUT PANEL PETUGAS
// ---------------------------------------------------------------------
const isAdmin = () => S.staff?.role === 'admin';
function staffMenu() {
  const m = [
    ['dashboard', 'Dashboard', 'layout-dashboard'],
    ['pendaftar', 'Pendaftar', 'users'],
    ['pengumuman', 'Pengumuman', 'megaphone'],
  ];
  if (isAdmin()) m.push(['unit', 'Unit', 'school'], ['pengguna', 'Pengguna', 'user-cog'], ['pengaturan', 'Pengaturan', 'settings']);
  return m;
}

function staffLayout(active, title, content, actions = '') {
  const menu = staffMenu();
  const p = S.staff;
  app.innerHTML = `
    ${previewBanner()}
    <aside class="sidebar">
      <a class="brand" href="#/admin/dashboard"><img src="/assets/logo.png" alt=""><div><b>PSB Mamba'ul Ulum</b><span>Panel Petugas</span></div></a>
      <nav class="side-nav">${menu.map(([k, l, i]) => `<a href="#/admin/${k}" class="${k === active ? 'active' : ''}">${ic(i)} ${l}</a>`).join('')}
        <a href="#/" target="_blank">${ic('external-link')} Halaman Publik</a></nav>
      <div class="side-user"><b>${esc(p.nama || p.email)}</b><span style="color:#a6c8b4">${esc(ROLE_LABEL[p.role])}${p.unit ? ` · ${esc(p.unit.nama)}` : ''}</span>
        <button class="btn btn-sm btn-block" id="chpw">${ic('key-round')} Ganti Password</button>
        <button class="btn btn-sm btn-block" id="logout">${ic('log-out')} Keluar</button></div>
    </aside>
    <main class="main">
      <div class="mobile-head"><img src="/assets/logo.png" alt=""><b>PSB Mamba'ul Ulum</b><button class="btn btn-outline btn-icon" id="chpw-m" aria-label="Ganti password">${ic('key-round')}</button><button class="btn btn-outline btn-icon" id="logout-m" aria-label="Keluar">${ic('log-out')}</button></div>
      <div class="main-top"><h2 class="grow">${esc(title)}</h2>${actions}</div>
      <div id="view">${content}</div>
    </main>
    <nav class="bottom-nav">${menu.map(([k, l, i]) => `<a href="#/admin/${k}" class="${k === active ? 'active' : ''}">${ic(i)}<span>${l}</span></a>`).join('')}</nav>`;
  const out = async () => { await S.api.signOut(); S.staff = null; location.hash = '#/petugas'; };
  document.getElementById('logout').onclick = out;
  document.getElementById('logout-m').onclick = out;
  document.getElementById('chpw').onclick = changeOwnPassword;
  document.getElementById('chpw-m').onclick = changeOwnPassword;
  icons();
}
const setView = (html) => { const v = document.getElementById('view'); if (v) { v.innerHTML = html; icons(); } };

// status yang relevan menurut role
const statusOf = (d) => (S.staff?.role === 'operator_asrama' ? d.status_asrama : d.status_pendidikan);

// ---------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------
async function adminDashboard() {
  staffLayout('dashboard', 'Dashboard', loadingHtml);
  let list = [];
  try { list = await S.api.listPendaftar(); } catch (e) { toast(e.message, 'error'); }
  const cnt = (s) => list.filter((d) => statusOf(d) === s).length;
  const L = list.filter((d) => d.jenis_kelamin === 'L').length;
  const P = list.filter((d) => d.jenis_kelamin === 'P').length;
  const role = S.staff.role;
  const units = role === 'admin' ? S.units : S.units.filter((u) => u.id === S.staff.unit_id);
  const per = units.map((u) => ({ u, n: list.filter((d) => d.unit_pendidikan_id === u.id || d.unit_asrama_id === u.id).length }));
  const max = Math.max(1, ...per.map((x) => x.n), ...per.map((x) => x.u.kuota || 0));
  const today = new Date().toDateString();
  const todayCount = list.filter((d) => new Date(d.created_at).toDateString() === today).length;

  setView(`
    ${role !== 'admin' ? `<div class="card mb small">${ic('info', 'style="width:14px;height:14px;vertical-align:-2px"')} Anda melihat pendaftar untuk <b>${esc(S.staff.unit?.nama || 'unit belum ditentukan')}</b>.${!S.staff.unit_id ? ' Minta admin untuk menetapkan unit Anda.' : ''}</div>` : ''}
    <div class="stats">
      <div class="card stat"><div class="ic ic-green">${ic('users')}</div><div><div class="val">${list.length}</div><div class="lbl">Total Pendaftar</div></div></div>
      <div class="card stat"><div class="ic ic-gold">${ic('clock')}</div><div><div class="val">${cnt('menunggu')}</div><div class="lbl">Menunggu Verifikasi</div></div></div>
      <div class="card stat"><div class="ic ic-blue">${ic('badge-check')}</div><div><div class="val">${cnt('diverifikasi')}</div><div class="lbl">Diverifikasi</div></div></div>
      <div class="card stat"><div class="ic ic-green">${ic('circle-check')}</div><div><div class="val">${cnt('diterima')}</div><div class="lbl">Diterima</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>${ic('chart-bar')} Pendaftar per Unit</h3>
        ${per.length ? `<div class="bar-list">${per.map(({ u, n }) => `
          <div class="bar-item"><div class="top"><span>${esc(u.nama)} <span class="muted small">(${u.jenis})</span></span><span>${n}${u.kuota ? ` / ${u.kuota}` : ''}</span></div>
          <div class="bar"><span style="width:${Math.round((n / (u.kuota || max)) * 100)}%"></span></div></div>`).join('')}</div>` : emptyHtml('Belum ada unit')}
      </div>
      <div class="card">
        <h3>${ic('chart-pie')} Ringkasan</h3>
        <dl class="kv">
          <dt>Laki-laki</dt><dd>${L}</dd><dt>Perempuan</dt><dd>${P}</dd>
          <dt>Ditolak</dt><dd>${cnt('ditolak')}</dd><dt>Mendaftar hari ini</dt><dd>${todayCount}</dd>
          <dt>Status pendaftaran</dt><dd>${S.settings.pendaftaran_buka ? '<span class="badge diterima">Dibuka</span>' : '<span class="badge ditolak">Ditutup</span>'}</dd>
          <dt>Tahun ajaran</dt><dd>${esc(S.settings.tahun_ajaran)} · ${esc(S.settings.gelombang)}</dd>
        </dl>
      </div>
    </div>
    <div class="card">
      <div class="row between"><h3 style="margin:0">${ic('history')} Pendaftar Terbaru</h3><a class="btn btn-ghost btn-sm" href="#/admin/pendaftar">Lihat semua ${ic('arrow-right')}</a></div>
      ${list.length ? `<div class="mt">${list.slice(0, 5).map((d) => `
        <div class="row" style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div class="grow"><b>${esc(d.nama_lengkap)}</b><div class="small muted">${esc(d.no_pendaftaran)} · ${esc(d.unit_pendidikan?.nama || '-')} · ${fmtDate(d.created_at)}</div></div>${badge(statusOf(d))}</div>`).join('')}</div>` : emptyHtml()}
    </div>`);
}

// ---------------------------------------------------------------------
// DATA PENDAFTAR
// ---------------------------------------------------------------------
const PF = { q: '', unit: '', status: '', jk: '' };
let pendaftarCache = [];

async function adminPendaftar() {
  staffLayout('pendaftar', 'Data Pendaftar', loadingHtml,
    `<button class="btn btn-outline btn-sm" id="export">${ic('download')} Export CSV</button>`);
  try { pendaftarCache = await S.api.listPendaftar(); } catch (e) { toast(e.message, 'error'); pendaftarCache = []; }
  document.getElementById('export').onclick = () => exportCsv(filtered());
  const units = isAdmin() ? S.units : [];
  setView(`
    <div class="card">
      <div class="toolbar">
        <input class="input search" id="q" placeholder="Cari nama, no. pendaftaran, NISN, asal sekolah..." value="${esc(PF.q)}">
        ${isAdmin() ? `<select class="input" id="fu"><option value="">Semua unit</option>${units.map((u) => `<option value="${u.id}" ${PF.unit === u.id ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}</select>` : ''}
        <select class="input" id="fs"><option value="">Semua status</option>${STATUS.map((s) => `<option value="${s}" ${PF.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
        <select class="input" id="fj"><option value="">L / P</option><option value="L" ${PF.jk === 'L' ? 'selected' : ''}>Laki-laki</option><option value="P" ${PF.jk === 'P' ? 'selected' : ''}>Perempuan</option></select>
      </div>
      <div id="tbl"></div>
    </div>`);
  const bind = (id, key) => document.getElementById(id)?.addEventListener('input', (e) => { PF[key] = e.target.value; renderTable(); });
  bind('q', 'q'); bind('fu', 'unit'); bind('fs', 'status'); bind('fj', 'jk');
  renderTable();
}

function filtered() {
  const q = PF.q.toLowerCase();
  return pendaftarCache.filter((d) =>
    (!q || [d.nama_lengkap, d.no_pendaftaran, d.nisn, d.asal_sekolah, d.no_hp].some((x) => String(x || '').toLowerCase().includes(q)))
    && (!PF.unit || d.unit_pendidikan_id === PF.unit || d.unit_asrama_id === PF.unit)
    && (!PF.status || (S.staff.role === 'admin' ? (d.status_pendidikan === PF.status || d.status_asrama === PF.status) : statusOf(d) === PF.status))
    && (!PF.jk || d.jenis_kelamin === PF.jk));
}

function renderTable() {
  const el = document.getElementById('tbl');
  if (!el) return;
  const rows = filtered();
  if (!rows.length) { el.innerHTML = emptyHtml(pendaftarCache.length ? 'Tidak ada pendaftar yang cocok dengan filter' : 'Belum ada data pendaftar', 'users'); icons(); return; }
  el.innerHTML = `
    <div class="small muted mb">${rows.length} pendaftar</div>
    <div class="table-wrap responsive"><table class="tbl">
      <thead><tr><th>No. Daftar</th><th>Nama</th><th>L/P</th><th>Unit Pendidikan</th><th>Asrama</th><th>Status Pendidikan</th><th>Status Asrama</th><th>Tanggal</th></tr></thead>
      <tbody>${rows.map((d) => `
        <tr class="clickable" data-id="${d.id}">
          <td><b>${esc(d.no_pendaftaran)}</b></td>
          <td class="name"><b>${esc(d.nama_lengkap)}</b><span>${esc(d.asal_sekolah || '')}</span></td>
          <td>${esc(d.jenis_kelamin || '-')}</td>
          <td>${esc(d.unit_pendidikan?.nama || '-')}</td>
          <td>${esc(d.unit_asrama?.nama || '—')}</td>
          <td>${badge(d.status_pendidikan)}</td>
          <td>${d.unit_asrama_id ? badge(d.status_asrama) : '<span class="muted">—</span>'}</td>
          <td class="small">${fmtDate(d.created_at)}</td>
        </tr>`).join('')}</tbody></table></div>
    <div class="list-cards">${rows.map((d) => `
      <div class="list-card" data-id="${d.id}">
        <div class="top"><div><b>${esc(d.nama_lengkap)}</b><span class="small muted">${esc(d.no_pendaftaran)} · ${jk(d.jenis_kelamin)}</span></div>${ic('chevron-right')}</div>
        <div class="small muted" style="margin-top:4px">${esc(d.unit_pendidikan?.nama || '-')}${d.unit_asrama ? ` · ${esc(d.unit_asrama.nama)}` : ''}</div>
        <div class="badges">${badge(d.status_pendidikan)}${d.unit_asrama_id ? badge(d.status_asrama) : ''}</div>
      </div>`).join('')}</div>`;
  el.querySelectorAll('[data-id]').forEach((r) => r.addEventListener('click', () => openPendaftar(r.dataset.id)));
  icons();
}

function openPendaftar(id, tab = 'detail') {
  const d = pendaftarCache.find((x) => x.id === id);
  if (!d) return;
  const role = S.staff.role;
  const canPend = role === 'admin' || role === 'operator_pendidikan';
  const canAsr = (role === 'admin' || role === 'operator_asrama') && d.unit_asrama_id;
  const tabs = [['detail', 'Biodata'], ['verifikasi', 'Verifikasi'], ['edit', 'Edit Data']];
  const kvRows = [
    ['No. Pendaftaran', d.no_pendaftaran], ['Tahun Ajaran', `${d.tahun_ajaran || '-'} · ${d.gelombang || ''}`],
    ['Nama Lengkap', d.nama_lengkap], ['NIK', d.nik], ['NISN', d.nisn], ['Jenis Kelamin', jk(d.jenis_kelamin)],
    ['Tempat, Tgl Lahir', `${d.tempat_lahir || '-'}, ${fmtDate(d.tanggal_lahir)}`], ['Anak ke / Saudara', `${d.anak_ke ?? '-'} / ${d.jumlah_saudara ?? '-'}`],
    ['Asal Sekolah', d.asal_sekolah], ['Alamat', [d.alamat, d.desa, d.kecamatan, d.kabupaten, d.provinsi, d.kode_pos].filter(Boolean).join(', ')],
    ['Ayah', `${d.nama_ayah || '-'} (${d.pekerjaan_ayah || '-'})`], ['Ibu', `${d.nama_ibu || '-'} (${d.pekerjaan_ibu || '-'})`],
    ['Wali', d.nama_wali ? `${d.nama_wali} (${d.hubungan_wali || '-'})` : '-'], ['Penghasilan', d.penghasilan],
    ['No. HP / WA', d.no_hp], ['Email', d.email], ['Unit Pendidikan', d.unit_pendidikan?.nama], ['Asrama', d.unit_asrama?.nama || 'Tidak mukim'],
    ['Tanggal Daftar', fmtDate(d.created_at, true)], ['Terakhir Diubah', fmtDate(d.updated_at, true)],
  ];
  let body;
  if (tab === 'detail') {
    body = `<dl class="kv">${kvRows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || '-')}</dd>`).join('')}</dl>`;
  } else if (tab === 'verifikasi') {
    const box = (key, label, unit, enabled) => `
      <div class="verify-box mb">
        <div class="row between mb"><b>${ic(key === 'pendidikan' ? 'graduation-cap' : 'house', 'style="width:16px;height:16px;vertical-align:-3px"')} ${label}: ${esc(unit || '-')}</b>${badge(d[`status_${key}`])}</div>
        <div class="form-grid">
          <div class="field full"><label>Status</label>
            <select class="input" name="status_${key}" ${enabled ? '' : 'disabled'}>${STATUS.map((s) => `<option value="${s}" ${d[`status_${key}`] === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select></div>
          <div class="field full"><label>Catatan (terlihat oleh pendaftar)</label>
            <textarea class="input" name="catatan_${key}" rows="2" ${enabled ? '' : 'disabled'}>${esc(d[`catatan_${key}`] || '')}</textarea></div>
        </div>
      </div>`;
    body = `<form id="verif-form">
      ${box('pendidikan', 'Unit Pendidikan', d.unit_pendidikan?.nama, canPend)}
      ${d.unit_asrama_id ? box('asrama', 'Asrama', d.unit_asrama?.nama, canAsr) : '<p class="muted small">Pendaftar tidak memilih asrama.</p>'}
    </form>`;
  } else {
    body = `<form id="edit-form"><div class="form-grid">
      ${SECTIONS.map((s) => sectionHtml(s, d)).join('')}
      <div class="section-title">${ic('school')} Unit & Kontak</div>
      ${unitSelectFields(d, { lockPend: role !== 'admin', lockAsr: role !== 'admin' })}
      <div class="field full"><label for="f-no_hp">Nomor HP / WA <span class="req">*</span></label><input class="input" id="f-no_hp" name="no_hp" required value="${esc(d.no_hp)}"></div>
    </div></form>`;
  }
  const foot = `
    <a class="btn btn-outline" target="_blank" rel="noopener" href="${waLink(d.no_hp, `Assalamualaikum, kami panitia PSB Mamba'ul Ulum terkait pendaftaran ${d.nama_lengkap} (${d.no_pendaftaran}).`)}">${ic('message-circle')} WhatsApp</a>
    <button class="btn btn-outline" id="pd-print">${ic('printer')} Cetak Bukti</button>
    ${isAdmin() ? `<button class="btn btn-danger" id="pd-del">${ic('trash-2')} Hapus</button>` : ''}
    ${tab !== 'detail' ? `<button class="btn btn-primary" id="pd-save">${ic('save')} Simpan</button>` : ''}`;
  const m = openModal({
    title: `${esc(d.nama_lengkap)} <span class="small muted" style="font-weight:600">· ${esc(d.no_pendaftaran)}</span>`,
    body: `<div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`,
    foot,
  });
  m.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => openPendaftar(id, b.dataset.t)));
  m.querySelector('#pd-print').onclick = () => printReceipt({ ...d, unit_pendidikan_nama: d.unit_pendidikan?.nama, unit_asrama_nama: d.unit_asrama?.nama });
  m.querySelector('#pd-del')?.addEventListener('click', async () => {
    if (!(await confirmDialog(`Hapus data pendaftar ${d.nama_lengkap} (${d.no_pendaftaran})? Tindakan ini tidak dapat dibatalkan.`, { okText: 'Hapus' }))) return;
    try { await S.api.deletePendaftar(id); toast('Data pendaftar dihapus'); adminPendaftar(); } catch (e) { toast(e.message, 'error'); }
  });
  m.querySelector('#pd-save')?.addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    let patch;
    if (tab === 'verifikasi') {
      patch = formData(m.querySelector('#verif-form'));
    } else {
      const f = m.querySelector('#edit-form');
      if (!f.reportValidity()) return;
      const v = formData(f);
      patch = { ...pickBiodata(v), no_hp: normHp(v.no_hp) };
      if ('unit_pendidikan_id' in v) patch.unit_pendidikan_id = v.unit_pendidikan_id || null;
      if ('unit_asrama_id' in v) patch.unit_asrama_id = v.unit_asrama_id || null;
      BIODATA_FIELDS.forEach((k) => { if (patch[k] === '') patch[k] = null; });
      if (!patch.nama_lengkap) throw new Error('Nama lengkap wajib diisi');
    }
    await S.api.updatePendaftar(id, patch);
    toast('Perubahan disimpan');
    pendaftarCache = await S.api.listPendaftar();
    renderTable();
    if (pendaftarCache.some((x) => x.id === id)) openPendaftar(id, tab); else closeModal();
  }));
}

function printReceipt(d) {
  const w = window.open('', '_blank');
  if (!w) { toast('Izinkan pop-up untuk mencetak', 'error'); return; }
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Bukti ${esc(d.no_pendaftaran)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${location.origin}/css/style.css"><style>body::before{display:none}body{background:#fff;padding:24px}</style></head>
    <body>${receiptHtml(d)}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  w.document.close();
}

function exportCsv(rows) {
  if (!rows.length) { toast('Tidak ada data untuk diekspor', 'error'); return; }
  const cols = ['no_pendaftaran', 'tahun_ajaran', 'gelombang', ...BIODATA_FIELDS, 'no_hp', 'unit_pendidikan', 'status_pendidikan', 'catatan_pendidikan', 'unit_asrama', 'status_asrama', 'catatan_asrama', 'created_at'];
  const val = (d, c) => (c === 'unit_pendidikan' ? d.unit_pendidikan?.nama : c === 'unit_asrama' ? d.unit_asrama?.nama : d[c]);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [cols.join(','), ...rows.map((d) => cols.map((c) => q(val(d, c))).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `pendaftar-psb-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------------------------------------------------------------------
// PENGUMUMAN
// ---------------------------------------------------------------------
async function adminPengumuman() {
  staffLayout('pengumuman', 'Pengumuman', loadingHtml, `<button class="btn btn-primary btn-sm" id="add">${ic('plus')} Tambah</button>`);
  let list = [];
  try { list = await S.api.listPengumuman(); } catch (e) { toast(e.message, 'error'); }
  const mine = (n) => isAdmin() || n.unit_id === S.staff.unit_id;
  document.getElementById('add').onclick = () => editPengumuman();
  setView(`<div class="card">${list.length ? list.map((n) => `
    <div class="news" style="${n.tampil ? '' : 'opacity:.6'}">
      <div class="row between"><h4 style="margin:0">${esc(n.judul)}</h4>
        ${mine(n) ? `<div class="row" style="gap:4px"><button class="btn btn-ghost btn-icon" data-edit="${n.id}" aria-label="Ubah">${ic('pencil')}</button><button class="btn btn-ghost btn-icon" data-del="${n.id}" aria-label="Hapus">${ic('trash-2')}</button></div>` : ''}</div>
      <p>${esc(n.isi)}</p>
      <div class="meta">${fmtDate(n.created_at, true)} · <span class="badge ${n.unit ? 'gold' : 'neutral'}">${esc(n.unit?.nama || 'Semua pendaftar')}</span> ${n.tampil ? '' : '<span class="badge ditolak">Disembunyikan</span>'}</div>
    </div>`).join('') : emptyHtml('Belum ada pengumuman', 'megaphone')}</div>`);
  document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editPengumuman(list.find((n) => n.id === b.dataset.edit))));
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmDialog('Hapus pengumuman ini?', { okText: 'Hapus' }))) return;
    try { await S.api.deletePengumuman(b.dataset.del); toast('Pengumuman dihapus'); adminPengumuman(); } catch (e) { toast(e.message, 'error'); }
  }));
}

function editPengumuman(n = { tampil: true, unit_id: isAdmin() ? '' : S.staff.unit_id }) {
  const unitOpts = isAdmin()
    ? `<option value="">Semua pendaftar (umum)</option>${S.units.map((u) => `<option value="${u.id}" ${u.id === n.unit_id ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}`
    : `<option value="${S.staff.unit_id || ''}">${esc(S.staff.unit?.nama || '-')}</option>`;
  const m = openModal({
    title: n.id ? 'Ubah Pengumuman' : 'Pengumuman Baru',
    body: `<form id="pg-form" class="form-grid" style="grid-template-columns:1fr">
      <div class="field"><label>Judul</label><input class="input" name="judul" required value="${esc(n.judul || '')}"></div>
      <div class="field"><label>Isi Pengumuman</label><textarea class="input" name="isi" rows="6" required>${esc(n.isi || '')}</textarea></div>
      <div class="field"><label>Ditujukan untuk</label><select class="input" name="unit_id" ${isAdmin() ? '' : 'disabled'}>${unitOpts}</select></div>
      <label class="switch"><input type="checkbox" name="tampil" ${n.tampil ? 'checked' : ''}> Tampilkan ke pendaftar</label>
    </form>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="pg-save">${ic('save')} Simpan</button>`,
  });
  m.querySelector('#pg-save').onclick = (e) => withBusy(e.currentTarget, async () => {
    const f = m.querySelector('#pg-form');
    if (!f.reportValidity()) return;
    const v = formData(f);
    await S.api.savePengumuman({ id: n.id, judul: v.judul, isi: v.isi, tampil: v.tampil, unit_id: isAdmin() ? (v.unit_id || null) : S.staff.unit_id });
    closeModal(); toast('Pengumuman disimpan'); adminPengumuman();
  });
}

// ---------------------------------------------------------------------
// UNIT (ADMIN)
// ---------------------------------------------------------------------
async function adminUnit() {
  staffLayout('unit', 'Unit Pendidikan & Asrama', loadingHtml, `<button class="btn btn-primary btn-sm" id="add">${ic('plus')} Tambah Unit</button>`);
  let list = [];
  try { [S.units, list] = await Promise.all([S.api.listUnits(), S.api.listPendaftar()]); } catch (e) { toast(e.message, 'error'); }
  document.getElementById('add').onclick = () => editUnit();
  const group = (jenis, title) => {
    const us = S.units.filter((u) => u.jenis === jenis);
    return `<div class="card"><h3>${ic(jenis === 'asrama' ? 'house' : 'graduation-cap')} ${title}</h3>
      ${us.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Keterangan</th><th>Pendaftar / Kuota</th><th>Status</th><th></th></tr></thead><tbody>
        ${us.map((u) => `<tr><td><b>${esc(u.nama)}</b></td><td class="small">${esc(u.keterangan || '-')}${u.wa_operator ? `<br><span class="muted">WA: ${esc(u.wa_operator)}</span>` : ''}</td>
          <td>${list.filter((d) => d.unit_pendidikan_id === u.id || d.unit_asrama_id === u.id).length} / ${u.kuota || '∞'}</td>
          <td>${u.aktif ? '<span class="badge diterima">Aktif</span>' : '<span class="badge ditolak">Nonaktif</span>'}</td>
          <td style="text-align:right;white-space:nowrap"><button class="btn btn-ghost btn-icon" data-edit="${u.id}" aria-label="Ubah">${ic('pencil')}</button><button class="btn btn-ghost btn-icon" data-del="${u.id}" aria-label="Hapus">${ic('trash-2')}</button></td></tr>`).join('')}
      </tbody></table></div>` : emptyHtml()}</div>`;
  };
  setView(group('pendidikan', 'Unit Pendidikan') + group('asrama', 'Asrama'));
  document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editUnit(S.units.find((u) => u.id === b.dataset.edit))));
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const u = S.units.find((x) => x.id === b.dataset.del);
    if (!(await confirmDialog(`Hapus unit "${u.nama}"? Pendaftar yang memilih unit ini akan kehilangan pilihan unitnya. Sebaiknya nonaktifkan saja bila sudah ada pendaftar.`, { okText: 'Hapus' }))) return;
    try { await S.api.deleteUnit(u.id); toast('Unit dihapus'); adminUnit(); } catch (e) { toast(e.message, 'error'); }
  }));
}

function editUnit(u = { jenis: 'pendidikan', aktif: true, kuota: 0, urutan: 0 }) {
  const m = openModal({
    title: u.id ? 'Ubah Unit' : 'Unit Baru', size: 'sm',
    body: `<form id="u-form" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="field full"><label>Nama Unit</label><input class="input" name="nama" required value="${esc(u.nama || '')}"></div>
      <div class="field"><label>Jenis</label><select class="input" name="jenis"><option value="pendidikan" ${u.jenis === 'pendidikan' ? 'selected' : ''}>Pendidikan</option><option value="asrama" ${u.jenis === 'asrama' ? 'selected' : ''}>Asrama</option></select></div>
      <div class="field"><label>Kuota</label><input class="input" type="number" min="0" name="kuota" value="${esc(u.kuota ?? 0)}"><div class="hint">0 = tanpa batas</div></div>
      <div class="field full"><label>Keterangan</label><input class="input" name="keterangan" value="${esc(u.keterangan || '')}"></div>
      <div class="field"><label>Urutan</label><input class="input" type="number" name="urutan" value="${esc(u.urutan ?? 0)}"></div>
      <div class="field" style="align-self:end"><label class="switch"><input type="checkbox" name="aktif" ${u.aktif ? 'checked' : ''}> Aktif</label></div>
      <div class="section-title">${ic('share-2')} Brosur, Kontak &amp; Media Sosial (tampil di beranda)</div>
      <div class="field full"><label>Link Brosur</label><input class="input" name="brosur" type="text" inputmode="url" placeholder="Link Google Drive / PDF / gambar brosur" value="${esc(u.brosur || '')}"><div class="hint">Pastikan link bisa dibuka publik (mis. Google Drive: Bagikan → Siapa saja yang memiliki link).</div></div>
      <div class="field full"><label>WhatsApp Operator</label><input class="input" name="wa_operator" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" value="${esc(u.wa_operator || '')}"></div>
      ${SOSMED.map((s) => `<div class="field ${s.k === 'website' ? 'full' : ''}"><label>${s.l}</label><input class="input" name="${s.k}" placeholder="${s.k === 'website' ? 'contoh: mambaulummojosari.sch.id' : 'nama akun atau link'}" value="${esc(u[s.k] || '')}"></div>`).join('')}
      <div class="hint full" style="grid-column:1/-1">Kosongkan yang tidak dimiliki; tombolnya otomatis tidak ditampilkan.</div>
    </form>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="u-save">${ic('save')} Simpan</button>`,
  });
  m.querySelector('#u-save').onclick = (e) => withBusy(e.currentTarget, async () => {
    const f = m.querySelector('#u-form');
    if (!f.reportValidity()) return;
    const v = formData(f);
    await S.api.saveUnit({
      id: u.id, nama: v.nama, jenis: v.jenis, keterangan: v.keterangan, kuota: Number(v.kuota) || 0, urutan: Number(v.urutan) || 0, aktif: v.aktif,
      wa_operator: v.wa_operator, instagram: v.instagram, facebook: v.facebook, tiktok: v.tiktok, youtube: v.youtube, website: v.website, brosur: v.brosur,
    });
    closeModal(); toast('Unit disimpan'); adminUnit();
  });
}

// ---------------------------------------------------------------------
// PENGGUNA (ADMIN)
// ---------------------------------------------------------------------
async function adminPengguna() {
  staffLayout('pengguna', 'Pengguna & Operator', loadingHtml, `<button class="btn btn-primary btn-sm" id="add">${ic('user-plus')} Tambah Pengguna</button>`);
  let list = [];
  try { list = await S.api.listProfiles(); } catch (e) { toast(e.message, 'error'); }
  document.getElementById('add').onclick = () => editUser();
  setView(`<div class="card">${list.length ? `<div class="table-wrap"><table class="tbl">
    <thead><tr><th>Nama</th><th>Role</th><th>Unit</th><th></th></tr></thead><tbody>
    ${list.map((p) => `<tr><td class="name"><b>${esc(p.nama || '-')}</b><span>${esc(p.email || '')}</span></td>
      <td><span class="badge ${p.role === 'admin' ? 'gold' : 'neutral'}">${esc(ROLE_LABEL[p.role])}</span></td>
      <td>${esc(p.unit?.nama || '—')}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-ghost btn-icon" data-edit="${p.id}" aria-label="Ubah">${ic('pencil')}</button>
        <button class="btn btn-ghost btn-icon" data-pw="${p.id}" aria-label="Reset password">${ic('key-round')}</button>
        ${p.id !== S.staff.id ? `<button class="btn btn-ghost btn-icon" data-del="${p.id}" aria-label="Hapus">${ic('trash-2')}</button>` : ''}
      </td></tr>`).join('')}
    </tbody></table></div>` : emptyHtml('Belum ada pengguna')}</div>
    <p class="small muted">Operator Unit Pendidikan hanya melihat pendaftar di unit pendidikannya, Operator Unit Asrama hanya melihat pendaftar di asramanya.</p>`);
  document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editUser(list.find((p) => p.id === b.dataset.edit))));
  document.querySelectorAll('[data-pw]').forEach((b) => b.addEventListener('click', () => resetPw(list.find((p) => p.id === b.dataset.pw))));
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const p = list.find((x) => x.id === b.dataset.del);
    if (!(await confirmDialog(`Hapus akun ${p.nama || p.email}?`, { okText: 'Hapus' }))) return;
    try { await S.api.deleteUser(p.id); toast('Akun dihapus'); adminPengguna(); } catch (e) { toast(e.message, 'error'); }
  }));
}

function editUser(p = null) {
  const isNew = !p;
  const v = p || { role: 'operator_pendidikan' };
  const unitOptions = (role, sel) => {
    const jenis = role === 'operator_asrama' ? 'asrama' : 'pendidikan';
    return `<option value="">— Pilih unit —</option>${S.units.filter((u) => u.jenis === jenis).map((u) => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}`;
  };
  const m = openModal({
    title: isNew ? 'Tambah Pengguna' : 'Ubah Pengguna', size: 'sm',
    body: `<form id="us-form" class="form-grid" style="grid-template-columns:1fr">
      <div class="field"><label>Nama</label><input class="input" name="nama" required value="${esc(v.nama || '')}"></div>
      ${isNew ? `<div class="field"><label>Email</label><input class="input" type="email" name="email" required></div>
      <div class="field"><label>Password</label><input class="input" type="text" name="password" minlength="6" required><div class="hint">Minimal 6 karakter. Sampaikan ke operator yang bersangkutan.</div></div>`
        : `<div class="field"><label>Email</label><input class="input" value="${esc(v.email || '')}" disabled></div>`}
      <div class="field"><label>Role</label><select class="input" name="role" id="us-role">${Object.entries(ROLE_LABEL).map(([k, l]) => `<option value="${k}" ${v.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field" id="us-unit-wrap"><label>Unit</label><select class="input" name="unit_id" id="us-unit">${unitOptions(v.role, v.unit_id)}</select></div>
    </form>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="us-save">${ic('save')} Simpan</button>`,
  });
  const roleSel = m.querySelector('#us-role');
  const syncUnit = () => {
    const r = roleSel.value;
    m.querySelector('#us-unit-wrap').classList.toggle('hidden', r === 'admin');
    m.querySelector('#us-unit').innerHTML = unitOptions(r, v.unit_id);
    m.querySelector('#us-unit').required = r !== 'admin';
  };
  roleSel.addEventListener('change', syncUnit);
  syncUnit();
  m.querySelector('#us-save').onclick = (e) => withBusy(e.currentTarget, async () => {
    const f = m.querySelector('#us-form');
    if (!f.reportValidity()) return;
    const d = formData(f);
    const unit_id = d.role === 'admin' ? null : (d.unit_id || null);
    if (isNew) await S.api.createUser({ nama: d.nama, email: d.email, password: d.password, role: d.role, unit_id });
    else await S.api.updateProfile(p.id, { nama: d.nama, role: d.role, unit_id });
    closeModal(); toast('Pengguna disimpan'); adminPengguna();
  });
}

function resetPw(p) {
  const m = openModal({
    title: 'Reset Password', size: 'sm',
    body: `<p class="small muted" style="margin-top:0">Atur password baru untuk <b>${esc(p.nama || p.email)}</b>.</p>
      <form id="pw-form"><div class="field"><label>Password Baru</label><input class="input" name="password" type="text" minlength="6" required></div></form>`,
    foot: `<button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="pw-save">${ic('key-round')} Simpan</button>`,
  });
  m.querySelector('#pw-save').onclick = (e) => withBusy(e.currentTarget, async () => {
    const f = m.querySelector('#pw-form');
    if (!f.reportValidity()) return;
    await S.api.resetPassword(p.id, formData(f).password);
    closeModal(); toast('Password berhasil diubah');
  });
}

// ---------------------------------------------------------------------
// PENGATURAN (ADMIN)
// ---------------------------------------------------------------------
async function adminPengaturan() {
  staffLayout('pengaturan', 'Pengaturan PSB', loadingHtml);
  try { S.settings = await S.api.getPengaturan(); } catch (e) { toast(e.message, 'error'); }
  const s = S.settings;
  setView(`
    <form class="card" id="set-form" style="max-width:760px">
      <div class="form-grid">
        <div class="field full"><label class="switch"><input type="checkbox" name="pendaftaran_buka" ${s.pendaftaran_buka ? 'checked' : ''}> Pendaftaran dibuka</label>
          <div class="hint">Jika dimatikan, formulir pendaftaran tidak dapat diakses. Pendaftar lama tetap bisa login.</div></div>
        <div class="field"><label>Tahun Ajaran</label><input class="input" name="tahun_ajaran" required value="${esc(s.tahun_ajaran)}"></div>
        <div class="field"><label>Gelombang</label><input class="input" name="gelombang" required value="${esc(s.gelombang)}"></div>
        <div class="field"><label>Awalan Nomor Pendaftaran</label><input class="input" name="prefix_nomor" required maxlength="6" value="${esc(s.prefix_nomor)}"><div class="hint">Contoh hasil: ${esc(s.prefix_nomor)}${String(new Date().getFullYear()).slice(2)}0001</div></div>
        <div class="field"><label>Nomor WhatsApp Panitia</label><input class="input" name="kontak_wa" value="${esc(s.kontak_wa || '')}" placeholder="08xxxxxxxxxx"></div>
        <div class="field full"><label>Alamat Yayasan</label><input class="input" name="alamat" value="${esc(s.alamat || '')}"></div>
        <div class="field full"><label>Informasi Pendaftaran (tampil di beranda)</label><textarea class="input" name="info_pendaftaran" rows="5">${esc(s.info_pendaftaran || '')}</textarea><div class="hint">Jadwal, syarat berkas, biaya, dan informasi penting lainnya.</div></div>
      </div>
      <div class="row mt" style="justify-content:flex-end"><button class="btn btn-primary" id="set-save">${ic('save')} Simpan Pengaturan</button></div>
    </form>`);
  const f = document.getElementById('set-form');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!f.reportValidity()) return;
    withBusy(document.getElementById('set-save'), async () => {
      const v = formData(f);
      S.settings = await S.api.updatePengaturan({ ...v, prefix_nomor: v.prefix_nomor.toUpperCase() });
      toast('Pengaturan disimpan');
    });
  });
}

// ---------------------------------------------------------------------
// ROUTER
// ---------------------------------------------------------------------
const ADMIN_ROUTES = { dashboard: adminDashboard, pendaftar: adminPendaftar, pengumuman: adminPengumuman, unit: adminUnit, pengguna: adminPengguna, pengaturan: adminPengaturan };
const ADMIN_ONLY = ['unit', 'pengguna', 'pengaturan'];

async function route() {
  closeModal();
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  window.scrollTo(0, 0);
  if (a === 'admin') {
    if (!S.staff) { location.hash = '#/petugas'; return; }
    const page = ADMIN_ROUTES[b] && (!ADMIN_ONLY.includes(b) || isAdmin()) ? b : 'dashboard';
    return ADMIN_ROUTES[page]();
  }
  if (a === 'daftar') return b === 'sukses' ? pageDaftarSukses() : pageDaftar();
  if (a === 'masuk') return pageMasuk();
  if (a === 'akun') return pageAkun();
  if (a === 'petugas') return pagePetugasLogin();
  if (a === 'setup') return pageSetup();
  return pageHome();
}

async function boot() {
  try {
    S.api = await initData();
    [S.settings, S.units] = await Promise.all([S.api.getPengaturan(), S.api.listUnits()]);
    S.applicant = store.get('psb_applicant');
    try { S.staff = await S.api.currentProfile(); } catch (e) { S.staff = null; toast(e.message, 'error'); }
    if (S.staff) S.units = await S.api.listUnits();
  } catch (e) {
    app.innerHTML = `<div class="card auth-box center">${ic('triangle-alert', 'style="width:42px;height:42px;color:var(--red)"')}<h2 class="mt">Aplikasi belum siap</h2><p class="muted">${esc(e.message)}</p><p class="small muted">Pastikan database/schema.sql sudah dijalankan di Neon dan DATABASE_URL sudah diatur di Vercel.</p><button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button></div>`;
    icons();
    return;
  }
  window.addEventListener('hashchange', async () => {
    // muat ulang daftar unit setelah login petugas agar unit nonaktif ikut terlihat
    if (S.staff && location.hash.startsWith('#/admin') && !S._unitsForStaff) { S.units = await S.api.listUnits(); S._unitsForStaff = true; }
    route();
  });
  route();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
}
boot();

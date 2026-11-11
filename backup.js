/* backup.js — Backup, Restore & Sync antar-device (dipindah dari index lama).
 * Dimuat di SEMUA halaman. Panel dibuka dengan: LaporanBackup.open()
 * Dashboard (index.html): sinkron otomatis penuh. Halaman lain: hanya mengirim perubahan, dan hanya reload sendiri bila device masih KOSONG (device baru). */
(function () {
function __bkBoot() {
  const st = document.createElement("style"); st.textContent = "  .bk-ov{font-family:\"Segoe UI\",Arial,sans-serif;--bg:#fff;--tx:#1e293b;--mu:#64748b;--bd:#d6dde8;--pr:#1f4e8c;display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);align-items:stretch;justify-content:flex-end;padding:0}\n  .bk-ov.dk{--bg:#161b22;--tx:#e6edf3;--mu:#8b949e;--bd:#30363d;--pr:#2f5fa8}\n  .bk-ov.show{display:flex}\n@keyframes bkIn{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}\n  .bk-box{background:var(--bg);color:var(--tx);width:min(100%,360px);height:100%;max-height:none;overflow:auto;border-radius:0;padding:16px 14px calc(16px + env(safe-area-inset-bottom,0px));border:0;border-left:1px solid var(--bd);box-shadow:-8px 0 30px rgba(0,0,0,.35);animation:bkIn .22s ease-out;font-size:.78rem;line-height:1.45}\n  .bk-box h3{font-size:.9rem;margin:2px 0 6px;display:flex;justify-content:space-between;align-items:center}\n  .bk-box h3 button{background:none;border:0;color:var(--mu);font-size:1.1rem;cursor:pointer}\n  .bk-box .mu{color:var(--mu);font-size:.72rem}\n  .bk-b{display:block;width:100%;text-align:left;padding:9px 12px;margin:6px 0;border:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--tx);font:600 .8rem inherit;font-family:inherit;cursor:pointer}\n  .bk-b.p{background:var(--pr);color:#fff;border-color:var(--pr)} .bk-b:disabled{opacity:.45;cursor:not-allowed}\n  .bk-hr{border:0;border-top:1px solid var(--bd);margin:12px 0}\n  #bkMsg{margin-top:8px;padding:7px 9px;border-radius:7px;background:rgba(37,99,235,.12);display:none;word-break:break-word}\n  #bkMsg.err{background:rgba(220,38,38,.14);color:#dc2626}\n  .bk-lnk{background:none;border:0;color:var(--pr);text-decoration:underline;cursor:pointer;font-size:.72rem;padding:0}"; document.head.appendChild(st);
  document.body.insertAdjacentHTML("beforeend", "<div class=\"bk-ov\" id=\"bkOv\"><div class=\"bk-box\">\n<h3>💾 Backup &amp; Restore Semua Data <button data-a=\"close\" title=\"Tutup\">✕</button></h3>\n<div class=\"mu\" id=\"bkStat\"></div>\n<button class=\"bk-b\" data-a=\"pick\" data-dir>🔗 Pilih Folder Google Drive (sekali saja)</button>\n<button class=\"bk-b p\" data-a=\"bkDrive\" data-dir>💾 Backup Sekarang ke Google Drive</button>\n<button class=\"bk-b\" data-a=\"bkFile\">⬇️ Unduh File Backup (manual)</button>\n<button class=\"bk-b\" data-a=\"rsDrive\" data-dir>♻️ Restore dari Folder Google Drive</button>\n<button class=\"bk-b\" data-a=\"rsFile\">📁 Restore dari File Backup...</button>\n<div class=\"mu\">Backup mencakup: Rekap Penjualan, Rekap Uang Masuk, dan data AR, termasuk faktur Batal di tab Penjualan. Gunakan \"Restore\" jika terjadi error atau data hilang.</div>\n<hr class=\"bk-hr\">\n<h3>☁️ Sync Antar-Device (Cloud)</h3>\n<div class=\"mu\" id=\"syStat\"></div>\n<button class=\"bk-b p\" data-a=\"up\">⬆️ Upload Data Device Ini ke Cloud</button>\n<button class=\"bk-b\" data-a=\"down\">⬇️ Ambil Data Terbaru dari Cloud</button>\n<button class=\"bk-b\" data-a=\"auto\" id=\"bkAuto\"></button>\n<div class=\"mu\"><b>Sinkron otomatis</b> (otomatis aktif di semua device, tanpa PIN / kode yang perlu diisi): perubahan di device ini dikirim ke cloud ±20 detik setelah selesai, dan saat aplikasi dibuka data terbaru dari cloud diambil otomatis bila device ini tidak punya perubahan yang belum terkirim. Jika cloud dan device sama-sama berubah, Anda akan ditanya data mana yang dipakai. Tombol Upload/Ambil manual tetap bisa dipakai (data terbaru MENIMPA data di device tujuan). <button class=\"bk-lnk\" data-a=\"code\">Ganti Kode Sinkron</button></div>\n<div id=\"bkMsg\"></div>\n<input type=\"file\" id=\"bkFile\" hidden>\n</div></div>");
(() => {
const SB = 'https://jczaqftfhcsckrcesgst.supabase.co', KEY = 'sb_publishable_xqRphhgaUo9qB9VBu5GMMw_WQdjHRUY';
const DBS = [
  { k: 'penjualan', db: 'pj-v1', st: 'pj-data' },
  { k: 'um2', db: 'laporan_uang_masuk_db', st: 'kv', all: true },   /* Uang Masuk (UM.html baru): semua key 'months' + 'month:YYYY-MM' */
  { k: 'uangmasuk', db: 'um-fixv1', st: 'um-data' },
  { k: 'cekmanual', db: 'cek-v1', st: 'cek-data' },
  { k: 'pjbatal', db: 'pjbatal-v1', st: 'pjbatal-data' },
  { k: 'pjharga', db: 'pjharga-v1', st: 'pjharga-data' },   /* perubahan harga beli (tab Penjualan) */
  { k: 'ar', db: 'piutangHarianDB', st: 'slots', kp: 'slot' },   /* data AR dari AR.html (slot A & B) */
];
let QUIET = false;
const IS_HOME = /\/(index\.html|cari\.html)?$/i.test(location.pathname);   /* hanya dashboard yang boleh 'Ambil dari cloud' otomatis + reload */
/* KODE SINKRON BAWAAN: tertanam di aplikasi, jadi semua device otomatis memakai kode yang sama
   tanpa perlu mengisi / memasukkan PIN. Ganti nilai ini bila ingin kode lain (semua device ikut otomatis). */
const DEFAULT_CODE = 'yhK0ZtOq7De3kJjokhomkRgD';
const $ = s => document.querySelector(s), LS = localStorage, CHUNK = 900000, PFX = 'Backup_Laporan_';
const HAS_DIR = 'showDirectoryPicker' in window, HAS_GZ = typeof CompressionStream !== 'undefined';
const fmtT = t => t ? new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const rq = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const txd = t => new Promise((ok, no) => { t.oncomplete = ok; t.onerror = t.onabort = () => no(t.error); });
const idb = (d, s, kp) => new Promise((ok, no) => {
  /* Pastikan object store 's' ada TANPA menghapus data.
     - Dibuka tanpa nomor versi -> tidak ada VersionError bila halaman lain sudah menaikkan versi.
     - Database belum ada -> dibuat (v1) beserta store-nya.
     - Database ada tapi TANPA satupun store (sisa pembuatan kosong) -> aman dihapus & dibuat ulang v1 (kompatibel dengan halaman lain).
     - Database ada, punya store lain tapi tidak punya 's' -> naikkan versi & tambah store (data lain tidak disentuh). */
  let done = false;
  const tm = setTimeout(() => { if (!done) { done = true; no(new Error('Penyimpanan browser sedang dipakai tab lain. Tutup tab lain aplikasi ini, lalu muat ulang.')); } }, 10000);
  const fin = (f, v) => { if (done) { if (f === ok && v && v.close) v.close(); return; } done = true; clearTimeout(tm); f(v); };
  const mk = db => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, kp ? { keyPath: kp } : undefined); };
  const good = db => { db.onversionchange = () => db.close(); return db; };
  const open = retry => {
    const r = indexedDB.open(d);
    r.onupgradeneeded = () => mk(r.result);
    r.onsuccess = () => {
      const db = r.result;
      if (db.objectStoreNames.contains(s)) return fin(ok, good(db));
      const empty = db.objectStoreNames.length === 0, nv = db.version + 1;
      db.close();
      if (retry) return fin(no, new Error('Penyimpanan "' + s + '" tidak dapat dibuat di browser ini.'));
      if (empty) {
        const del = indexedDB.deleteDatabase(d);
        del.onsuccess = () => open(true); del.onerror = () => fin(no, del.error);
      } else {
        const u = indexedDB.open(d, nv);
        u.onupgradeneeded = () => mk(u.result);
        u.onsuccess = () => fin(ok, good(u.result));
        u.onerror = () => fin(no, u.error);
      }
    };
    r.onerror = () => fin(no, r.error);
  };
  open(false);
});
const utf8 = s => new TextEncoder().encode(s);
/* Data biner (file Excel Penjualan = ArrayBuffer) HARUS ikut tersimpan utuh. JSON.stringify biasa mengubahnya jadi {} (kosong). */
const bytesOf = x => x instanceof ArrayBuffer ? new Uint8Array(x) : new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
const abToB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const b64ToAb = t => { const bin = atob(t), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
const isBin = x => x instanceof ArrayBuffer || ArrayBuffer.isView(x);
const enc = o => JSON.stringify(o, function (k, v) {
  const x = this[k];
  if (x instanceof Date) return { $d: isNaN(x) ? null : x.getTime() };
  if (isBin(x)) return { $ab: abToB64(bytesOf(x)) };
  return v;
});
const dec = t => JSON.parse(t, (k, v) => {
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (ks.length === 1 && '$d' in v) return new Date(v.$d == null ? NaN : v.$d);
    if (ks.length === 1 && '$ab' in v) return b64ToAb(v.$ab);
  }
  return v;
});
const pipe = async (u, S) => new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new S('gzip'))).arrayBuffer());
const b64 = u => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(new Blob([u])); });
const unb64 = async s => new Uint8Array(await (await fetch('data:application/octet-stream;base64,' + s)).arrayBuffer());

/* ---------- snapshot / apply ---------- */
async function readOne(c) {
  const db = await idb(c.db, c.st, c.kp);
  try { const s = db.transaction(c.st).objectStore(c.st); if (c.all) { const rk = s.getAllKeys(), rv = s.getAll(); const [ks, vs] = await Promise.all([rq(rk), rq(rv)]); return ks.map((k, i) => ({ key: k, val: vs[i] })); }
    return await rq(c.kp ? s.getAll() : s.get('latest')); }
  finally { db.close(); }
}
async function snap() {
  const o = { v: 1, at: new Date().toISOString(), d: {} };
  for (const c of DBS) o.d[c.k] = await readOne(c);
  return o;
}
/* ---------- sidik jari ringan ----------
   Pengganti JSON.stringify + SHA-256 atas seluruh isi (puluhan MB base64) yang dulu dijalankan tiap siklus sinkron.
   Cukup satu putaran hash 2 jalur (FNV-1a + pencampur kedua) langsung pada data hasil baca, tanpa membuat string JSON
   raksasa / TextEncoder / digest, dan memberi kesempatan UI bernapas tiap ±1 juta karakter. Seluruh byte tetap ikut
   dihitung, jadi perubahan sekecil apa pun terdeteksi (tidak memakai sampling). */
const tick = () => new Promise(r => setTimeout(r, 0));
async function fpWalk(v, st) {
  const mixc = c => { st.a = Math.imul(st.a ^ c, 16777619) >>> 0; st.b = Math.imul(st.b ^ c, 2654435761); st.b = (st.b ^ (st.b >>> 15)) >>> 0; };
  const small = t => { for (let i = 0; i < t.length; i++) mixc(t.charCodeAt(i)); };
  if (v == null) { mixc(0); return; }
  const t = typeof v;
  if (t === 'string') {
    mixc(1); mixc(v.length & 0xffff); mixc(v.length >>> 16);
    for (let i = 0; i < v.length; i += 65536) {
      const e = Math.min(v.length, i + 65536);
      let a = st.a, b = st.b;
      for (let j = i; j < e; j++) { const c = v.charCodeAt(j); a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 2654435761); b ^= b >>> 15; }
      st.a = a >>> 0; st.b = b >>> 0;
      if ((st.w += e - i) >= 1000000) { st.w = 0; await tick(); }
    }
    return;
  }
  if (t === 'number' || t === 'boolean' || t === 'bigint') { mixc(2); small(String(v)); return; }
  if (v instanceof Date) { mixc(3); small(String(v.getTime())); return; }
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    const u = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    mixc(4); small(String(u.length));
    for (let i = 0; i < u.length; i++) { mixc(u[i]); if ((++st.w) >= 1000000) { st.w = 0; await tick(); } }
    return;
  }
  if (Array.isArray(v)) { mixc(5); small(String(v.length)); for (const x of v) await fpWalk(x, st); return; }
  if (t === 'object') {
    mixc(6);
    for (const k of Object.keys(v)) { mixc(7); small(k); await fpWalk(v[k], st); }
    return;
  }
  mixc(8);
}
const fpNew = () => ({ a: 2166136261, b: 40503, w: 0 });
const fpEnd = st => st.a.toString(36) + '.' + st.b.toString(36);
const lenOf = x => Array.isArray(x) ? x.length : (x && typeof x === 'object' ? Object.keys(x).length : 0);
const cntOf = (k, v) => {
  if (v == null) return 0;
  if (k === 'penjualan') return v.files ? v.files.length : 0;
  if (k === 'um2') return Array.isArray(v) ? v.filter(x => x && /^month:/.test(x.key)).length : 0;
  if (k === 'uangmasuk') return v.records ? v.records.length : 0;
  if (k === 'ar') return Array.isArray(v) ? v.length : 0;
  /* pjbatal / pjharga / cekmanual = keputusan manual (faktur batal, perubahan harga beli, konfirmasi cek):
     hitung semua entri di dalamnya, karena ini data berharga yang tidak bisa dibuat ulang dari Excel. */
  if (typeof v !== 'object') return 0;
  let n = 0; for (const f of Object.keys(v)) n += lenOf(v[f]); return n;
};
/* Baca tiap database satu per satu, hitung sidik jari, lalu lepaskan datanya (tidak ditahan di memori). */
async function quick() {
  const st = fpNew(); let n = 0;
  for (const c of DBS) {
    let v = await readOne(c);
    await fpWalk(c.k, st); await fpWalk(v, st);
    n += cntOf(c.k, v); v = null;
  }
  return { fp: fpEnd(st), empty: !n };
}
/* Sidik jari dari snapshot yang SUDAH ada (dipakai setelah upload; tidak membaca ulang database). */
async function fpOfSnap(o) {
  const st = fpNew();
  for (const c of DBS) { await fpWalk(c.k, st); await fpWalk(o.d[c.k], st); }
  return fpEnd(st);
}

function validBackup(c, v) {
  if (v == null) return true;
  if (c.k === 'penjualan') return !!v && typeof v === 'object' && (!Array.isArray(v.files) || v.files.every(f => f && (isBin(f.buf) || typeof f.b64 === 'string')));
  if (c.all) return Array.isArray(v) && v.every(x => x && typeof x === 'object' && typeof x.key === 'string');
  if (c.kp) return Array.isArray(v) && v.every(x => x && typeof x === 'object' && x[c.kp] != null);
  return typeof v === 'object';
}
async function apply(o) {
  /* 1) Validasi SEMUA bagian dulu, sebelum ada data yang disentuh. */
  for (const c of DBS) {
    if (!(c.k in o.d)) continue;
    if (!validBackup(c, o.d[c.k])) throw new Error(c.k === 'penjualan'
      ? 'File Penjualan di backup/cloud ini RUSAK (isi file Excel hilang, disimpan oleh versi lama). Restore dibatalkan, data di device ini tidak diubah. Upload ulang dari device yang masih punya data Penjualan yang benar.'
      : 'Backup tidak valid pada bagian "' + c.k + '". Restore dibatalkan, data tidak diubah.');
  }
  /* 2) Tulis per database: satu transaksi, di-abort bila ada error, db selalu ditutup. */
  for (const c of DBS) {
    if (!(c.k in o.d)) continue;                              /* backup lama (sebelum ada tab ini): jangan hapus data yang ada */
    const db = await idb(c.db, c.st, c.kp);
    try {
      const tx = db.transaction(c.st, 'readwrite'), s = tx.objectStore(c.st), v = o.d[c.k];
      try {
        if (c.kp && s.keyPath !== c.kp) throw new Error('Struktur penyimpanan "' + c.db + '" berbeda dari yang diharapkan. Restore bagian ini dibatalkan.');
        s.clear();
        if (c.all) (v || []).forEach(x => s.put(x.val, x.key)); else if (c.kp) (v || []).forEach(x => s.put(x)); else if (v) s.put(v, 'latest');
      } catch (e) { try { tx.abort(); } catch (_) {} throw e; }
      await txd(tx);
    } finally { db.close(); }
  }
}
function cnt(o) {
  const d = o.d || {};
  return { p: cntOf('penjualan', d.penjualan), u: cntOf('uangmasuk', d.uangmasuk), u2: cntOf('um2', d.um2), a: cntOf('ar', d.ar),
    b: cntOf('pjbatal', d.pjbatal), h: cntOf('pjharga', d.pjharga), m: cntOf('cekmanual', d.cekmanual) };
}
const sum = o => {
  const c = cnt(o), f = x => x.toLocaleString("id-ID"), man = c.b + c.h + c.m;
  return `Penjualan: ${f(c.p)} file • Uang Masuk: ${f(c.u2)} bulan • AR: ${f(c.a)} file` + (man ? ` • Keputusan manual: ${f(man)} (batal ${f(c.b)}, harga ${f(c.h)}, cek ${f(c.m)})` : '');
};
/* Kosong = TIDAK ADA data apa pun, termasuk keputusan manual. */
const isEmpty = o => { const c = cnt(o); return !(c.p || c.u || c.u2 || c.a || c.b || c.h || c.m); };
/* Data inti (hasil upload Excel/AR). Device yang hanya punya keputusan manual tidak boleh diam-diam menimpa cloud. */
const coreEmpty = o => { const c = cnt(o); return !(c.p || c.u || c.u2 || c.a); };
async function pack(o) {
  const j = enc(o);
  if (!HAS_GZ) return utf8(j);
  return new Uint8Array(await new Response(new Blob([j]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
}
async function unpack(u) {
  if (u[0] === 0x1f && u[1] === 0x8b) u = await pipe(u, DecompressionStream);
  const o = dec(new TextDecoder().decode(u));
  if (!o || !o.d) throw new Error('File bukan backup Laporan yang valid.');
  return o;
}
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };

/* ---------- folder Google Drive (File System Access API) ---------- */
const hdb = () => idb('bk-handles', 'h');
async function getH() { const db = await hdb(), h = await rq(db.transaction('h').objectStore('h').get('dir')); db.close(); return h || null; }
async function setH(h) { const db = await hdb(), t = db.transaction('h', 'readwrite'); t.objectStore('h').put(h, 'dir'); await txd(t); db.close(); }
async function getDir(ask) {
  const h = await getH(); if (!h) return null;
  let p = await h.queryPermission({ mode: 'readwrite' });
  if (p !== 'granted' && ask) p = await h.requestPermission({ mode: 'readwrite' });
  return p === 'granted' ? h : null;
}
async function saveFile(name, bytes) { const dir = await getDir(true); if (!dir) throw new Error('Folder belum dipilih / izin ditolak. Pilih folder dulu.'); const fh = await dir.getFileHandle(name, { create: true }), w = await fh.createWritable(); await w.write(bytes); await w.close(); return dir; }

/* ---------- Supabase REST ---------- */
async function sb(path, opt = {}) {
  const r = await fetch(SB + '/rest/v1/' + path, { ...opt, headers: { apikey: KEY, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  if (!r.ok) { const t = await r.text(); throw new Error(/PGRST205|does not exist|42P01/.test(t) ? 'TABEL_BELUM_ADA' : r.status + ' ' + t.slice(0, 160)); }
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function ckey(c) {
  const b = await crypto.subtle.importKey('raw', utf8(c), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: utf8('laporan-sync-v1'), iterations: 120000, hash: 'SHA-256' }, b, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function nsOf(c) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8('ns:' + c))); return [...h].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join(''); }
async function seal(u, c) { const iv = crypto.getRandomValues(new Uint8Array(12)), e = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await ckey(c), u)), o = new Uint8Array(12 + e.length); o.set(iv); o.set(e, 12); return o; }
async function unseal(u, c) { try { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, await ckey(c), u.slice(12))); } catch (e) { throw new Error('Kode Sinkron salah / data rusak.'); } }
/* Pakai kode bawaan kecuali pengguna sengaja mengganti kode manual (tombol "Ganti Kode Sinkron"). */
function initCode() {
  if (LS.getItem('syncCodeManual') === '1') return;
  if (LS.getItem('syncCode') !== DEFAULT_CODE) {
    LS.setItem('syncCode', DEFAULT_CODE);
    LS.removeItem('syncLast'); LS.removeItem('syncHash'); LS.removeItem('syncFp');   /* kode berubah -> tentukan ulang arah sinkron */
  }
}
initCode();
function getCode(force) {
  let c = force ? null : LS.getItem('syncCode');
  if (!c) {
    const ans = prompt('Ganti KODE SINKRON (minimal 6 karakter).\nGunakan kode yang SAMA di semua device.\nKosongkan lalu OK untuk kembali ke kode bawaan (otomatis).');
    if (ans === null) return LS.getItem('syncCode');   /* Cancel = tidak berubah */
    c = ans.trim();
    if (!c) { LS.removeItem('syncCodeManual'); initCode(); return LS.getItem('syncCode'); }
    if (c.length < 6) throw new Error('Kode Sinkron minimal 6 karakter.');
    LS.setItem('syncCode', c); LS.setItem('syncCodeManual', '1'); LS.removeItem('syncLast'); LS.removeItem('syncHash'); LS.removeItem('syncFp');
  }
  return c;
}
async function cloudMeta(c) {
  const r = await sb(`laporan_sync?select=ver,data&ns=eq.${await nsOf(c)}&part=eq.-1&order=ver.desc&limit=1`);
  return r && r[0] ? { ver: r[0].ver, ...JSON.parse(r[0].data) } : null;
}
async function upload() {
  const code = getCode(), o = await snap();   /* hanya satu kali baca penuh per upload */
  for (const c of DBS) if (!validBackup(c, o.d[c.k])) throw new Error(c.k === 'penjualan' ? 'Data Penjualan di device ini rusak (isi file Excel hilang). Upload dibatalkan supaya cloud tidak ikut rusak. Hapus data Penjualan lalu upload ulang file Excelnya.' : 'Data "' + c.k + '" di device ini tidak valid. Upload dibatalkan.');
  if (isEmpty(o)) throw new Error('Device ini belum punya data. Upload dibatalkan supaya data di cloud tidak tertimpa kosong.');
  if (coreEmpty(o)) {
    /* Hanya ada keputusan manual (batal/harga/cek), belum ada data Penjualan / Uang Masuk / AR. */
    const m0 = await cloudMeta(code).catch(() => null);
    if (m0 && !confirm('Device ini baru punya keputusan manual (' + sum(o).split(' • ').pop() + '), belum ada data Penjualan / Uang Masuk / AR.\n\nUpload akan MENIMPA data di cloud (' + fmtT(m0.ver) + ') dengan isi yang hampir kosong.\n\nSaran: batalkan, lalu pilih "Ambil Data Terbaru" dulu.\n\nTetap upload?')) throw new Error('Upload dibatalkan.');
  }
  msg('Menyiapkan data...');
  const s = await b64(await seal(await pack(o), code)), ns = await nsOf(code), ver = new Date().toISOString(), n = Math.ceil(s.length / CHUNK);
  for (let i = 0; i < n; i++) {
    msg(`Mengunggah ${i + 1}/${n}...`);
    await sb('laporan_sync', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ ns, ver, part: i, data: s.slice(i * CHUNK, (i + 1) * CHUNK) }]) });
  }
  await sb('laporan_sync', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ ns, ver, part: -1, data: JSON.stringify({ n, at: ver }) }]) });
  await sb(`laporan_sync?ns=eq.${ns}&ver=lt.${encodeURIComponent(ver)}`, { method: 'DELETE' }).catch(() => {});
  LS.setItem('syncLast', ver); LS.setItem('syncFp', await fpOfSnap(o)); LS.removeItem('syncHash'); autoPaused = false; msg('✅ Upload ke cloud berhasil.\n' + sum(o));
}
/* Setelah data cloud/backup ditulis ke penyimpanan: beri tahu halaman induk (index.html) supaya tab lain yang sudah terbuka
   (dan masih menampilkan data kosong) dimuat ulang. Tanpa ini, tab yang dibuka SEBELUM data tiba tetap kosong. */
function notifyPulled() { try { const bc = new BroadcastChannel('laporan-pulled'); bc.postMessage({ from: location.pathname + location.search }); bc.close(); } catch (e) {} }
async function download(silent) {
  /* Ambil dari cloud memakai Kode Sinkron yang sudah tersimpan di perangkat.
     Tombol Ambil tidak lagi memunculkan prompt PIN/Kode. Kode tetap diperlukan
     untuk membuka enkripsi; atur satu kali melalui Upload / Ganti Kode Sinkron. */
  const code = LS.getItem('syncCode');
  if (!code) throw new Error('Kode Sinkron belum disimpan di perangkat ini. Atur satu kali melalui Backup/Sync → Upload atau Ganti Kode Sinkron, lalu klik Ambil Data Terbaru lagi.');
  const m = await cloudMeta(code);
  if (!m) throw new Error('Belum ada data di cloud untuk Kode Sinkron ini.');
  msg('Mengambil data dari cloud...');
  const rows = await sb(`laporan_sync?select=part,data&ns=eq.${await nsOf(code)}&ver=eq.${encodeURIComponent(m.ver)}&part=gte.0&order=part`);
  if (!rows || rows.length !== m.n) throw new Error('Data cloud belum lengkap, coba lagi.');
  const o = await unpack(await unseal(await unb64(rows.map(r => r.data).join('')), code));
  if (!silent && !confirm(`Ambil data dari cloud (${fmtT(m.ver)})?\n\n${sum(o)}\n\nData di device ini akan DITIMPA.`)) return msg('Dibatalkan.');
  await apply(o); LS.setItem('syncLast', m.ver); LS.setItem('syncFp', (await quick()).fp); LS.removeItem('syncHash'); notifyPulled(); msg('✅ Selesai. Memuat ulang...'); setTimeout(() => location.reload(), 700);
}

/* ---------- aksi backup ---------- */
async function restoreFrom(bytes, label) {
  const o = await unpack(bytes);
  if (!confirm(`Restore dari ${label} (backup ${fmtT(o.at)})?\n\n${sum(o)}\n\nData di device ini akan DITIMPA.`)) return msg('Dibatalkan.');
  await apply(o); notifyPulled(); msg('✅ Restore selesai. Memuat ulang...'); setTimeout(() => location.reload(), 700);
}
const A = {
  close: () => $('#bkOv').classList.remove('show'),
  async pick() { const h = await showDirectoryPicker({ mode: 'readwrite' }); await setH(h); msg('Folder dipilih: ' + h.name); },
  async bkDrive() {
    const dir = await getDir(true); if (!dir) throw new Error('Folder belum dipilih / izin ditolak.');
    const o = await snap(); if (isEmpty(o)) throw new Error('Belum ada data untuk dibackup.');
    await saveFile(`${PFX}${stamp()}.laporan`, await pack(o));
    const names = []; for await (const [n] of dir.entries()) if (n.startsWith(PFX)) names.push(n);
    names.sort(); for (const n of names.slice(0, -10)) await dir.removeEntry(n).catch(() => {});
    LS.setItem('bkLast', new Date().toISOString()); msg('✅ Backup ke Google Drive berhasil.\n' + sum(o));
  },
  async bkFile() {
    const o = await snap(); if (isEmpty(o)) throw new Error('Belum ada data untuk dibackup.');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([await pack(o)], { type: 'application/octet-stream' }));
    a.download = `${PFX}${stamp()}.laporan`; document.body.appendChild(a); a.click(); a.remove();
    LS.setItem('bkLast', new Date().toISOString()); msg('✅ File backup diunduh.\n' + sum(o));
  },
  async rsDrive() {
    const dir = await getDir(true); if (!dir) throw new Error('Folder belum dipilih / izin ditolak.');
    const names = []; for await (const [n] of dir.entries()) if (n.startsWith(PFX)) names.push(n);
    if (!names.length) throw new Error('Tidak ada file backup di folder ini.');
    names.sort(); const f = await (await dir.getFileHandle(names.pop())).getFile();
    await restoreFrom(new Uint8Array(await f.arrayBuffer()), 'folder Google Drive');
  },
  rsFile() { $('#bkFile').value = ''; $('#bkFile').click(); },
  up: upload, down: download,
  async code() { const before = LS.getItem('syncCode'), c = getCode(true); msg(c === before ? 'Kode Sinkron tidak diubah.' : 'Kode Sinkron disimpan.'); }
};


/* ---------- SINKRON OTOMATIS ---------- */
/* Aturan aman: kirim ke cloud hanya jika cloud TIDAK lebih baru; ambil dari cloud hanya jika device TIDAK punya
   perubahan yang belum terkirim; jika keduanya berubah -> tanya pengguna. Perubahan dideteksi dengan sidik jari (hash)
   data, sehingga event palsu saat aplikasi dibuka tidak memicu upload. */
const autoOn = () => LS.getItem('autoSync') !== '0';
let syncing = false, autoPaused = false, pendingChg = false, chgTimer = null, pillT = null, lastCheck = 0;
const hhmm = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
async function hashOf(o) {
  const c = { ...o }; delete c.at;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(enc(c))));
  return [...d].slice(0, 16).map(x => x.toString(16).padStart(2, '0')).join('');
}
function decide(m, ll, dirty, empty, load) {
  if (!m) return dirty && !empty ? 'up' : 'cloud-empty';
  const newer = ll ? (Date.parse(m.ver) - Date.parse(ll) > 1000) : true;
  if (newer && !dirty) return load ? 'down' : 'notice';
  if (newer && dirty) return load ? 'conflict' : 'warn';
  return dirty ? 'up' : 'ok';
}
function pill(t, kind) {
  try { const st = { kind: kind || 'busy', text: t }; window.LaporanBackup = window.LaporanBackup || {}; window.LaporanBackup.last = st; window.dispatchEvent(new CustomEvent('laporan-sync-state', { detail: st })); } catch (_) {}
  let p = document.getElementById('syPill');
  if (!p) {
    p = document.createElement('div'); p.id = 'syPill'; p.title = 'Klik untuk buka Backup / Sync';
    document.body.appendChild(p);
    p.addEventListener('click', () => window.LaporanBackup.open());
  }
  const bg = { ok: '#047857', busy: '#1f4e8c', warn: '#b45309', err: '#b91c1c' }[kind] || '#1f4e8c';
  p.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9000;padding:5px 11px;border-radius:14px;font:600 .72rem Segoe UI,Arial,sans-serif;color:#fff;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35);max-width:80vw;background:' + bg + ';opacity:1;transition:opacity .6s';
  p.textContent = t; clearTimeout(pillT);
  if (kind === 'ok') pillT = setTimeout(() => { p.style.opacity = '.45'; }, 4000);
}
function refreshAutoUI() {
  const b = $('#bkAuto');
  if (b) b.textContent = autoOn() ? '🔄 Sinkron otomatis: AKTIF (klik untuk matikan)' : '⏸ Sinkron otomatis: MATI (klik untuk aktifkan)';
}
async function autoUp() {
  pill('⏳ Mengirim data ke cloud...', 'busy'); QUIET = true;
  try { await upload(); } finally { QUIET = false; }
  pill('✅ Tersinkron ' + hhmm(), 'ok');
}
async function autoDown() {
  pill('⏳ Mengambil data terbaru dari cloud...', 'busy'); QUIET = true;
  try { await download(true); } finally { QUIET = false; }
}
function runSync(trigger) {
  try { if (navigator.locks && navigator.locks.request) return navigator.locks.request('laporan-sync', () => runSyncCore(trigger)); } catch (e) {}
  return runSyncCore(trigger);
}
async function runSyncCore(trigger) {
  if (syncing || !autoOn()) return;
  if (!LS.getItem('syncCode')) { if (trigger === 'start') pill('☁️ Isi Kode Sinkron (Backup/Sync → Upload) untuk sinkron otomatis', 'warn'); return; }
  const load = IS_HOME && (trigger === 'start' || trigger === 'visible');
  syncing = true; lastCheck = Date.now(); LS.setItem('syncChecked', String(lastCheck));
  try {
    pill('⏳ Mengecek sinkron...', 'busy');
    const code = LS.getItem('syncCode'), m = await cloudMeta(code);
    const q = await quick(), h = q.fp, empty = q.empty, ll = LS.getItem('syncLast');
    let lh = LS.getItem('syncFp');
    if (!lh && LS.getItem('syncHash')) {   /* migrasi sekali dari format hash lama (isi penuh) */
      const same = (await hashOf(await snap())) === LS.getItem('syncHash');
      lh = same ? h : 'legacy-mismatch'; if (same) LS.setItem('syncFp', h);
      LS.removeItem('syncHash');
    }
    const dirty = lh ? h !== lh : !empty;
    /* Device BARU / kosong (tidak ada data apa pun yang bisa tertimpa): di SEMUA halaman (PJ, UM, dst) data cloud langsung diambil otomatis, tanpa klik. */
    const loadNow = load || ((trigger === 'start' || trigger === 'visible') && empty);
    let act = decide(m, ll, dirty, empty, loadNow);
    if (act === 'conflict' && autoPaused) act = 'warn';
    if (act === 'up') await autoUp();
    else if (act === 'down') await autoDown();
    else if (act === 'conflict') {
      if (confirm('Data di cloud lebih baru (' + fmtT(m.ver) + '), tetapi device ini juga punya perubahan yang belum terkirim.\n\nOK = Ambil data cloud (data device ini DITIMPA)\nBatal = pilihan lain')) await autoDown();
      else if (confirm('Timpa data CLOUD dengan data device ini?\n\nOK = Upload (data cloud DITIMPA)\nBatal = jangan lakukan apa-apa (sinkron otomatis dijeda sampai halaman dimuat ulang)')) await autoUp();
      else { autoPaused = true; pill('⏸ Sinkron otomatis dijeda (ada konflik)', 'warn'); }
    }
    else if (act === 'warn') { autoPaused = true; pill('⚠️ Konflik: cloud & device sama-sama berubah. Buka Backup/Sync', 'warn'); }
    else if (act === 'notice') pill('⚠️ Ada data baru di cloud. Buka Backup/Sync → Ambil', 'warn');
    else if (act === 'cloud-empty') pill('☁️ Cloud masih kosong. Upload dulu dari device utama', 'warn');
    else pill('✅ Tersinkron ' + hhmm(), 'ok');
  } catch (e) {
    const t = String((e && e.message) || e);
    if (t === 'TABEL_BELUM_ADA') pill('⚠️ Tabel Supabase belum dibuat', 'err');
    else if (e instanceof TypeError || /fetch|network/i.test(t)) pill('📴 Offline, sinkron ditunda', 'warn');
    else if (/RUSAK/.test(t)) pill('⚠️ Data Penjualan di cloud rusak. Upload ulang dari device utama', 'err');
    else pill('⚠️ Sinkron gagal: ' + t.slice(0, 80), 'err');
  } finally {
    syncing = false;
    if (pendingChg) { pendingChg = false; onChange(); }
  }
}
function onChange() {
  if (!autoOn() || !LS.getItem('syncCode')) return;
  if (syncing) { pendingChg = true; return; }
  clearTimeout(chgTimer); chgTimer = setTimeout(() => { chgTimer = null; runSync('change'); }, 20000);
}
A.auto = async function () {
  const on = !autoOn();
  LS.setItem('autoSync', on ? '1' : '0'); refreshAutoUI();
  if (on) { if (!LS.getItem('syncCode')) getCode(true); msg('✅ Sinkron otomatis AKTIF'); runSync('start'); }
  else { msg('Sinkron otomatis dimatikan.'); const p = document.getElementById('syPill'); if (p) p.remove(); }
};
try { ['laporan-data'].forEach(n => { new BroadcastChannel(n).onmessage = onChange; }); } catch (e) {}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { if (chgTimer) { clearTimeout(chgTimer); chgTimer = null; runSync('change'); } }
  else if (Date.now() - lastCheck > 60000) runSync('visible');
});
setTimeout(() => { if (IS_HOME || !LS.getItem('syncLast') || Date.now() - (+LS.getItem('syncChecked') || 0) > 300000) runSync('start'); }, 2500);

/* ---------- UI ---------- */
function msg(t, err) {
  if (QUIET && !err) return;
  const m = $('#bkMsg'); m.textContent = t; m.className = err ? 'err' : ''; m.style.display = 'block'; m.style.whiteSpace = 'pre-line';
  const ok = /^✅/.test(t), busy = /\.\.\.$/.test(t);
  let b = document.getElementById('bkToast');
  if (!b) { b = document.createElement('div'); b.id = 'bkToast'; document.body.appendChild(b); }
  b.textContent = t;
  b.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:100000;max-width:92vw;white-space:pre-line;text-align:center;padding:12px 18px;border-radius:10px;font:600 .85rem Segoe UI,Arial,sans-serif;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.4);background:' + (err ? '#b91c1c' : ok ? '#047857' : '#1f4e8c');
  clearTimeout(b._t); b._t = setTimeout(() => b.remove(), err ? 7000 : busy ? 60000 : 5000);
}
async function status() {
  refreshAutoUI();
  const h = HAS_DIR ? await getH().catch(() => null) : null;
  $('#bkStat').textContent = (LS.getItem('bkLast') ? 'Backup terakhir: ' + fmtT(LS.getItem('bkLast')) : 'Belum pernah backup.') + ' • ' + (!HAS_DIR ? 'Browser ini tidak bisa pilih folder (pakai Unduh/Restore File).' : h ? 'Folder: ' + h.name : 'Folder Google Drive belum dipilih.');
  document.querySelectorAll('[data-dir]').forEach(b => b.disabled = !HAS_DIR);
  const loc = LS.getItem('syncLast'); let cl = '-';
  const c = LS.getItem('syncCode');
  if (!c) cl = 'Kode Sinkron belum diatur';
  else try { const m = await cloudMeta(c); cl = m ? fmtT(m.ver) : 'belum ada'; } catch (e) { cl = e.message === 'TABEL_BELUM_ADA' ? 'tabel Supabase belum dibuat' : 'tidak terhubung'; }
  $('#syStat').textContent = `Sync terakhir di device ini: ${fmtT(loc)} • Data di Cloud: ${cl}`;
}
const isDark = () => { const m = (getComputedStyle(document.body).backgroundColor || '').match(/[\d.]+/g) || []; if (m.length > 3 && +m[3] === 0) return false; return m.length >= 3 && (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128; };
function openPanel() { const ov = $('#bkOv'); ov.classList.toggle('dk', isDark()); ov.classList.add('show'); $('#bkMsg').style.display = 'none'; status(); }
window.LaporanBackup = Object.assign(window.LaporanBackup || {}, { open: openPanel });
$('#bkOv').addEventListener('click', async e => {
  if (e.target.id === 'bkOv') return A.close();
  const b = e.target.closest('[data-a]'); if (!b || !A[b.dataset.a]) return;
  const all = document.querySelectorAll('.bk-b'); all.forEach(x => x.disabled = true);
  try { await A[b.dataset.a](); }
  catch (err) { if (err && err.name === 'AbortError') msg('Dibatalkan.'); else msg(err.message === 'TABEL_BELUM_ADA' ? 'Tabel Supabase "laporan_sync" belum dibuat. Jalankan SQL setup di Supabase dulu.' : '⚠️ ' + (err.message || err), true); }
  finally { all.forEach(x => x.disabled = false); status(); }
});
$('#bkFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { await restoreFrom(new Uint8Array(await f.arrayBuffer()), 'file ' + f.name); } catch (err) { msg('⚠️ ' + err.message, true); }
});
})();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", __bkBoot); else __bkBoot();
})();

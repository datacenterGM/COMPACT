/* Service worker — Laporan (PWA). Naikkan VERSION setiap kali index.html / AR.html diganti agar cache lama dibuang. */
const VERSION = 'laporan-v3';

/* File aplikasi sendiri (di-cache saat pertama kali dipasang) */
const SHELL = ['./', 'index.html', 'AR.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png'];

/* Pustaka dari internet yang dipakai aplikasi. Semuanya diunduh SEKALI saat service worker dipasang,
   supaya upload Excel, simpan Excel, dan tab AR tetap jalan saat offline.
   Bila versi/alamat pustaka di index.html atau AR.html diganti, ganti juga di sini lalu naikkan VERSION. */
const LIBS = [
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',            /* Uang Masuk */
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',          /* Penjualan */
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',               /* Uang Masuk, Cross Cek */
  'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',         /* AR */
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'                /* AR (worker) */
];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

/* Host pihak ketiga yang boleh di-cache. Host lain (Supabase, analitik) langsung ke jaringan. */
const CACHE_HOSTS = ['cdn.jsdelivr.net', 'cdn.sheetjs.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

async function putLib(cache, url) {
  let r;
  try { r = await fetch(url, { mode: 'cors', cache: 'reload' }); } catch (e) { r = null; }
  if (!r || !r.ok) { try { r = await fetch(url, { mode: 'no-cors', cache: 'reload' }); } catch (e) { return null; } }
  if (r && (r.ok || r.type === 'opaque')) { await cache.put(url, r.clone()); return r; }
  return null;
}

async function precache() {
  const cache = await caches.open(VERSION);
  /* file aplikasi: ambil versi terbaru dari server (lewati cache HTTP browser) */
  await Promise.all(SHELL.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  /* pustaka JS */
  await Promise.all(LIBS.map(u => putLib(cache, u).catch(() => {})));
  /* font Google: simpan CSS-nya beserta file font yang dirujuk */
  try {
    const css = await putLib(cache, FONT_CSS);
    if (css && css.type !== 'opaque') {
      const txt = await css.clone().text();
      const urls = Array.from(new Set((txt.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [])));
      await Promise.all(urls.map(u => putLib(cache, u).catch(() => {})));
    }
  } catch (e) {}
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Halaman: jaringan dulu (update langsung terpakai), tapi bila jaringan lambat (>4 dtk) atau mati, pakai cache. */
function pageResponse(e, req, isTop) {
  const key = isTop ? 'index.html' : req.url;       /* halaman utama = index.html; iframe (mis. AR.html) disimpan atas URL-nya sendiri */
  return caches.open(VERSION).then(async cache => {
    let cached = await cache.match(key, { ignoreSearch: true });
    if (!cached && isTop) cached = await cache.match('./');
    const net = fetch(req).then(r => { if (r && r.ok) cache.put(key, r.clone()); return r; });
    e.waitUntil(net.catch(() => {}));
    if (!cached) return net.catch(() => Response.error());
    return Promise.race([net, new Promise(res => setTimeout(() => res(cached), 4000))]).catch(() => cached);
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Supabase & layanan lain di luar daftar: JANGAN di-cache, langsung ke jaringan */
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CACHE_HOSTS.includes(url.hostname)) return;

  if (req.mode === 'navigate') {
    e.respondWith(pageResponse(e, req, req.destination === 'document'));
    return;
  }

  /* Pustaka CDN, font, ikon, dsb: cache dulu, perbarui di belakang layar */
  e.respondWith(caches.match(req, { ignoreVary: true }).then(hit => {
    const net = fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => hit || Response.error());
    return hit || net;
  }));
});

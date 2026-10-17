/* Service worker — Laporan (PWA). Naikkan VERSION setiap kali index.html diganti agar cache lama dibuang. */
const VERSION = 'laporan-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Supabase & API lain: JANGAN di-cache, langsung ke jaringan */
  if (url.hostname.endsWith('supabase.co')) return;

  /* Halaman: jaringan dulu (supaya update langsung terpakai), cadangan dari cache saat offline */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return r;
    }).catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }

  /* Library CDN (xlsx) & font: cache dulu, perbarui di belakang layar */
  const cdn = url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (cdn || url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});

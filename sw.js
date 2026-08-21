// ================================================================
// SERVICE WORKER — DATACENTER (offline support)
// Naikkan angka versi di CACHE_NAME setiap kali index.html diupdate
// supaya HP mengambil versi terbaru saat online.
// ================================================================
const CACHE_NAME = 'datacenter-cache-v1';

// File "inti" aplikasi (app shell) — wajib bisa dibuka walau offline.
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
];

// Library dari CDN yang dipakai aplikasi.
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
];

// ---- INSTALL: simpan app shell + CDN assets ke cache ----
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Precache satu-satu, biar 1 file gagal (mis. icon-512.png belum ada)
            // tidak menggagalkan seluruh proses install.
            const all = [...APP_SHELL, ...CDN_ASSETS];
            return Promise.all(
                all.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn('[SW] Gagal precache:', url, err);
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// ---- ACTIVATE: bersihkan cache versi lama ----
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ---- FETCH ----
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // jangan campur tangan request POST/PUT (mis. ke Supabase)

    const isNavigation = req.mode === 'navigate';

    if (isNavigation) {
        // Halaman utama: coba internet dulu (biar dapat update terbaru),
        // kalau gagal (offline), pakai index.html yang tersimpan di cache.
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', resClone));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Aset lain (JS/CSS/font/icon): cache dulu kalau ada, sambil diam-diam
    // update cache di background. Kalau belum ada di cache, ambil dari
    // internet lalu simpan untuk dipakai offline berikutnya.
    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const resClone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                    }
                    return res;
                })
                .catch(() => cached); // offline & belum ada di cache -> tetap gagal (undefined ditangani di bawah)

            return cached || networkFetch;
        })
    );
});

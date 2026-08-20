const CACHE_NAME = 'datacenter-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: simpan app shell ke cache
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

// Activate: bersihkan cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: jangan pernah cache request ke Supabase (data harus selalu live/terbaru).
// Untuk file app shell sendiri, pakai strategi "network first, fallback ke cache"
// supaya begitu ada update file (index.html baru di-deploy), pengguna dapat versi terbaru.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('supabase.co')) {
    return; // biarkan lewat langsung ke network, tidak di-intercept
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

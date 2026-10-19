// Cache only same-origin static assets. Supabase/authenticated API data is never cached.
const CACHE_NAME = 'japan-trip-companion-v6-static';
const STATIC_FILES = ['/manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.headers.has('Authorization')) return;
  // In development and on hosted sites, load the HTML online to pick up new app versions.
  if (request.mode === 'navigate') return;
  if (!url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/images/') && url.pathname !== '/manifest.webmanifest') return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  }).catch(() => caches.match(request)));
});

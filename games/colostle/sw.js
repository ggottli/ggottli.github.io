/* Colostle Companion — service worker: makes the app work offline.
   Bump VERSION whenever the app files change so installed copies refresh. */
const VERSION = 'colostle-2026-10-20a';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icon.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png',
  './js/data.js', './js/engine.js', './js/help.js', './js/sync.js', './js/shell.js',
  './js/character.js', './js/explore.js', './js/combat.js', './js/journal.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VERSION + '-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // App files: serve from cache, refresh in the background.
    e.respondWith(caches.open(VERSION).then(async c => {
      const cached = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      return cached || (await net) || new Response('Offline — this page is not cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.host)) {
    // Fonts: cache once, then serve from cache.
    e.respondWith(caches.open(VERSION + '-fonts').then(async c => {
      const cached = await c.match(req); if (cached) return cached;
      try { const res = await fetch(req); if (res && res.ok) c.put(req, res.clone()); return res; }
      catch (err) { return new Response('', { status: 503 }); }
    }));
  }
  // Anything else (GitHub API for sync) goes straight to the network.
});

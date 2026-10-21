// StudySync service worker.
//  - App shell + built assets: cached, so the app opens instantly and offline.
//  - API reads (GET): network first, last good answer kept for offline use.
//  - Anything that changes data (POST/PUT/DELETE) is never touched.
// Bump VERSION to drop every old cache on the next visit.

const VERSION = 'v1';
const STATIC = `studysync-static-${VERSION}`;
const API = 'studysync-api'; // cleared by the page on sign-in / sign-out (src/pwa.js)

// Cache the page plus every script/stylesheet it references, so the very first visit is
// already fully usable offline (files fetched before the worker took control aren't
// otherwise seen by it).
async function precache() {
  const cache = await caches.open(STATIC);
  await cache.addAll(['/manifest.webmanifest', '/icon-192.png']);
  const res = await fetch('/', { cache: 'no-store' });
  const html = await res.clone().text();
  await cache.put('/', res);
  const assets = [...new Set(html.match(/\/assets\/[^"'\s)]+/g) || [])];
  await Promise.all(assets.map((a) => cache.add(a).catch(() => {})));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('studysync-static-') && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Never cache anything that carries credentials or live sync progress.
const NEVER_CACHE = /\/api\/(auth|sap\/(credentials|sync|auto-sync)|profile\/password)/;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Page loads: always try the network so a deploy shows up; fall back to the cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // API reads
  if (url.pathname.includes('/api/')) {
    if (NEVER_CACHE.test(url.pathname)) return;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(API).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.open(API).then((c) => c.match(req)).then((hit) =>
            hit || new Response(JSON.stringify({ message: 'You are offline.' }), {
              status: 503, headers: { 'Content-Type': 'application/json' },
            })
          )
        )
    );
    return;
  }

  // Built files (hashed names never change) and fonts: cache first.
  const sameOrigin = url.origin === self.location.origin;
  const isAsset = sameOrigin && (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname));
  const isFont = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (isAsset || isFont) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const refresh = fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(req, copy));
          }
          return res;
        });
        return hit || refresh;
      }).catch(() => caches.match(req))
    );
  }
});

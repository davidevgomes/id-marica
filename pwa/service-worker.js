/* global PWA_VERSION, PWA_ASSETS */

const scope = new URL(self.registration.scope);
const cachePrefix = `id-marica:${scope.pathname}:`;
const cacheName = cachePrefix + PWA_VERSION;
const shell = new URL(`index.html?v=${PWA_VERSION}`, scope).href;
const assets = new Set(PWA_ASSETS.map((path) => new URL(path, scope).href));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) =>
      cache.addAll([shell, ...assets].map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name.startsWith(cachePrefix) && name !== cacheName).map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;

  if (request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`)) {
    event.respondWith(fetch(request).catch(async () => (await caches.match(shell, { cacheName })) ?? Response.error()));
  } else if (assets.has(url.href)) {
    // Static files are identical whether the browser requests them as modules or ordinary assets.
    event.respondWith(caches.match(request, { cacheName, ignoreVary: true }).then((cached) => cached ?? fetch(request)));
  }
});

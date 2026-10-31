const CACHE = "phisafe-shell-v9";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./core.mjs", "./rung2.mjs", "./rung2-ui.mjs", "./rung3.mjs", "./rung3-ui.mjs", "./rung4.mjs", "./rung4-ui.mjs", "./vault.mjs", "./vault-ui.mjs", "./quick.mjs", "./quick-ui.mjs", "./setup.mjs", "./setup-ui.mjs", "./pilot.mjs", "./pilot-ui.mjs", "./manifest.webmanifest", "./icons/shield.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("phisafe-") && k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});

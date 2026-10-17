// YOG AI service worker (Phase 2).
// - index.html: network-first (always revalidated), cached copy used when offline or slow.
// - Pinned CDN files (MediaPipe wasm/model, supabase-js on esm.sh, Google Fonts): cache-first.
// - Everything else (Supabase API, the Gemini Worker, mantledb, images, ...) is NOT touched.
// Bump VERSION to drop old caches after changing this file.
const VERSION = "v1";
const SHELL_CACHE = "yogai-shell-" + VERSION;
const CDN_CACHE = "yogai-cdn-" + VERSION;
const CDN_HOSTS = ["cdn.jsdelivr.net", "esm.sh", "fonts.googleapis.com", "fonts.gstatic.com", "storage.googleapis.com"];
const SHELL_KEY = new URL("./index.html", self.registration.scope).href;
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.add(new Request(SHELL_KEY, { cache: "reload" })))
      .catch(() => {})            // a failed precache must never block installation
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith("yogai-") && k !== SHELL_CACHE && k !== CDN_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAppPage(url){
  const scope = new URL(self.registration.scope);
  return url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html");
}

async function networkFirstPage(request){
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(SHELL_KEY);
  const net = fetch(request.url, { cache: "no-cache", credentials: "same-origin" }).then(res => {
    if(res.ok) cache.put(SHELL_KEY, res.clone()).catch(() => {});
    return res;
  });
  if(!cached) return net;                                   // nothing to fall back to
  try {
    const res = await Promise.race([net, new Promise(r => setTimeout(() => r(null), NAV_TIMEOUT_MS))]);
    if(res && res.ok) return res;
  } catch(e) { /* offline: use the cached copy */ }
  net.catch(() => {});                                      // a late failure must not surface as an unhandled rejection
  return cached;
}

async function cacheFirstCdn(request){
  const cache = await caches.open(CDN_CACHE);
  const hit = await cache.match(request.url, { ignoreVary: true });
  if(hit) return hit;
  let res;
  try {
    // CORS mode gives a readable (non-opaque) response, so it can be cached without the big
    // quota cost of opaque responses. These hosts all send CORS headers.
    res = await fetch(request.url, { mode: "cors", credentials: "omit" });
  } catch(e) {
    return fetch(request);                                  // fall back to the page's own request
  }
  if(res.ok) cache.put(request.url, res.clone()).catch(() => {});
  return res;
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(req.mode === "navigate" && isAppPage(url)){ event.respondWith(networkFirstPage(req)); return; }
  if(CDN_HOSTS.includes(url.hostname)){ event.respondWith(cacheFirstCdn(req)); }
});

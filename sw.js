const CACHE_PREFIX = `history-map:${new URL(self.registration.scope).pathname}:`;
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const MAX_RUNTIME_ENTRIES = 80;
const scopeUrl = new URL(self.registration.scope);
const local = (path) => new URL(path, scopeUrl).href;

const PRECACHE = [
  local("./"),
  local("./index.html"),
  local("./vr.html"),
  local("./manifest.json"),
  local("./app-config.js"),
  local("./security.js"),
  local("./pwa-icons/icon-192.png"),
  local("./pwa-icons/icon-512.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_RUNTIME_ENTRIES) {
    await Promise.all(keys.filter(request => !PRECACHE.includes(request.url)).slice(0, keys.length - MAX_RUNTIME_ENTRIES).map((request) => cache.delete(request)));
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).origin === scopeUrl.origin) {
      await cache.put(request, response.clone());
      await trimCache(cache);
    }
    return response;
  } catch (_) {
    return (await cache.match(request)) || (await cache.match(local("./index.html")));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trimCache(cache);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (["admin.html", "admin.js", "admin.css", "reset-password.html", "password-recovery.js"].some(path => url.pathname === new URL(path, scopeUrl).pathname)) return;
  if (url.hostname.endsWith("supabase.co") || url.hostname.includes("autonavi.com")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === scopeUrl.origin && ["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(networkFirst(request));
  }
});

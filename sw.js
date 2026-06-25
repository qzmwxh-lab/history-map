/* =====================================================================
   拓荒者足迹 Service Worker
   策略：网络优先 + 本地缓存兜底，让 App 离线也能打开上次内容
   ===================================================================== */
const CACHE_NAME = "tanhzj-v1";

/* 第一次安装时预缓存的核心资源 */
const PRECACHE = [
  "/",
  "/index.html",
  "/vr.html",
  "/manifest.json",
  "/pwa-icons/icon-192.png",
  "/pwa-icons/icon-512.png"
];

/* 安装：预缓存核心文件 */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* 激活：清理旧版本缓存 */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* 请求拦截：网络优先，失败时回退缓存 */
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  /* 只处理同域 + CDN 资源；Supabase API/Storage 始终走网络不缓存 */
  if (url.hostname.includes("supabase.co")) return;
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        /* 成功：更新缓存副本 */
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

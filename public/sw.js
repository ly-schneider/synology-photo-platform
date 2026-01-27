const CACHE_VERSION = "v2";
const CACHES = {
  static: `static-${CACHE_VERSION}`,
  thumbnails: `thumbnails-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
};

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

function getConfig(pathname) {
  if (
    pathname.startsWith("/_next/static/") ||
    /\.(js|css|woff2?|png|jpg|svg|ico)$/.test(pathname)
  ) {
    return { cache: CACHES.static, ttl: null };
  }
  if (/^\/api\/items\/[^/]+\/thumbnail/.test(pathname)) {
    return { cache: CACHES.thumbnails, ttl: 86400000, maxEntries: 500 }; // 1 day
  }
  if (pathname.startsWith("/api/collections")) {
    return { cache: CACHES.api, ttl: 30000, maxEntries: 50 }; // 30 seconds
  }
  return null;
}

async function handleFetch(request, config, forceRefresh) {
  const cache = await caches.open(config.cache);
  const cached = await cache.match(request);
  const cachedAt = cached?.headers.get("sw-cached-at");
  const isExpired =
    !cachedAt ||
    (config.ttl && Date.now() - parseInt(cachedAt, 10) > config.ttl);

  if (cached && !isExpired && !forceRefresh) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set("sw-cached-at", Date.now().toString());
      const timestamped = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, timestamped.clone());
      if (config.maxEntries) {
        cache.keys().then((keys) => {
          if (keys.length > config.maxEntries) {
            keys
              .slice(0, keys.length - config.maxEntries)
              .forEach((k) => cache.delete(k));
          }
        });
      }
      return timestamped;
    }
    return response;
  } catch {
    if (cached) return cached;
    throw new Error("Network failed");
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHES.static)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  const valid = Object.values(CACHES);
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !valid.includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest")
    return;
  if (e.request.headers.get("range")) return;

  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/")));
    return;
  }

  const config = getConfig(url.pathname);
  if (!config) return;

  const forceRefresh = e.request.headers.get("x-cache-refresh") === "true";
  e.respondWith(handleFetch(e.request, config, forceRefresh));
});

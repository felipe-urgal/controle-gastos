const CACHE_VERSION = "v2";
const SHELL_CACHE = `controle-gastos-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `controle-gastos-static-${CACHE_VERSION}`;
const CACHE_PREFIX = "controle-gastos-";

const OFFLINE_URL = "/offline.html";
const OFFLINE_TRANSACTION_URL = "/offline-transacao.html";
const PUBLIC_SHELL_ASSETS = [
  OFFLINE_URL,
  OFFLINE_TRANSACTION_URL,
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PUBLIC_SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith(CACHE_PREFIX) &&
                name !== SHELL_CACHE &&
                name !== STATIC_CACHE,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isSafeStaticRequest(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;

  return (
    url.pathname.startsWith("/_next/static/") ||
    PUBLIC_SHELL_ASSETS.includes(url.pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (!response || response.status !== 200 || response.type !== "basic") {
    return response;
  }

  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API responses and authenticated documents must always stay network-only.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallbackUrl =
          url.pathname === "/transacoes/nova"
            ? OFFLINE_TRANSACTION_URL
            : OFFLINE_URL;
        const offline = await caches.match(fallbackUrl);
        return offline || Response.error();
      }),
    );
    return;
  }

  if (isSafeStaticRequest(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});

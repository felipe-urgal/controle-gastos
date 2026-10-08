const CACHE_VERSION = "v3";
const SHELL_CACHE = `controle-gastos-shell-${CACHE_VERSION}`;
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

// skipWaiting + clients.claim é seguro aqui: o SW não guarda HTML autenticado nem chunks JS,
// então uma nova versão nunca troca assets da aba aberta nem força refresh/perda de formulário.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll(
          PUBLIC_SHELL_ASSETS.map((url) => new Request(url, { cache: "reload" })),
        ),
      )
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
                name !== SHELL_CACHE,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Reescreve no cache do shell uma cópia revalidada (ETag/If-None-Match) do shell público.
// Falha de rede mantém a cópia anterior: o fallback offline nunca fica sem conteúdo.
async function refreshShellAsset(url) {
  try {
    const response = await fetch(new Request(url, { cache: "no-cache" }));
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(url, response);
    }
  } catch {
    // Offline durante o update: mantém o shell já armazenado.
  }
}

// Shell público: rede primeiro (nova versão após deploy), cache apenas como fallback offline.
async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
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
      fetch(request)
        .then((response) => {
          // Online: aproveita para revalidar as páginas offline sem depender de bump de versão.
          event.waitUntil(
            Promise.all([OFFLINE_URL, OFFLINE_TRANSACTION_URL].map(refreshShellAsset)),
          );
          return response;
        })
        .catch(async () => {
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

  // Somente o shell público explícito é interceptado. `/_next/static/**` usa o cache HTTP
  // normal do navegador para não acumular chunks hasheados entre deploys.
  if (PUBLIC_SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(networkFirstShell(request));
  }
});

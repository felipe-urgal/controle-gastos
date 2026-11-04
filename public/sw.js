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

// "Compartilhar para o app" (Web Share Target): o sistema envia um POST com texto e, se houver,
// uma imagem. O texto vai na URL; a imagem fica num cache temporário que a página /compartilhar
// lê (e apaga) para fazer o OCR no navegador. Nada disso passa pelo servidor.
const SHARE_PATH = "/api/share";
const SHARE_PAGE = "/compartilhar";
const SHARE_CACHE = "share-target-v1";
const SHARE_IMAGE_KEY = "/__share-target/imagem";
const SHARE_MAX_TEXT = 2000;
const SHARE_MAX_IMAGE_BYTES = 6 * 1024 * 1024;

async function handleShareTarget(request) {
  const params = new URLSearchParams();
  try {
    const form = await request.formData();
    const field = (name) => {
      const value = form.get(name);
      return typeof value === "string" ? value.trim() : "";
    };
    const text = (field("text") || field("title") || field("url")).slice(0, SHARE_MAX_TEXT);
    if (text) params.set("text", text);

    const image = form
      .getAll("imagem")
      .find((file) => typeof file !== "string" && file.type.startsWith("image/") && file.size > 0 && file.size <= SHARE_MAX_IMAGE_BYTES);
    if (image) {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put(
        SHARE_IMAGE_KEY,
        new Response(image, { headers: { "content-type": image.type, "x-shared-at": String(Date.now()) } }),
      );
      params.set("imagem", "1");
    }
  } catch {
    // Corpo ilegível ou cache indisponível: a página mostra o estado vazio com orientação.
  }

  const query = params.toString();
  return Response.redirect(new URL(query ? `${SHARE_PAGE}?${query}` : SHARE_PAGE, self.location.origin).href, 303);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method === "POST") {
    const postUrl = new URL(request.url);
    if (postUrl.origin === self.location.origin && postUrl.pathname === SHARE_PATH) {
      event.respondWith(handleShareTarget(request));
    }
    return;
  }

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

// Push dos avisos. O navegador exige mostrar uma notificação para todo push recebido, então um
// payload ausente ou inválido vira um aviso genérico em vez de ser ignorado.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" && payload.title ? payload.title : "Controle de Gastos";
  const body = typeof payload.body === "string" && payload.body ? payload.body : "Você tem um aviso novo.";
  const url = typeof payload.url === "string" ? payload.url : "/avisos";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url },
    }),
  );
});

// Só caminhos do próprio app abrem: um push nunca leva a outro site.
function safeAppUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/avisos";
  return value;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(safeAppUrl(event.notification.data && event.notification.data.url), self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        if (typeof existing.navigate === "function") await existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

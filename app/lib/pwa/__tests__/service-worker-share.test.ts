import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://app.example.test";

type Handler = (event: unknown) => void;

function loadServiceWorker() {
  const handlers = new Map<string, Handler>();
  const cacheStore = new Map<string, Map<string, Response>>();

  const caches = {
    open: async (name: string) => {
      if (!cacheStore.has(name)) cacheStore.set(name, new Map());
      const entries = cacheStore.get(name)!;
      return {
        put: async (key: string, value: Response) => void entries.set(key, value),
        addAll: async () => undefined,
      };
    },
    keys: async () => [...cacheStore.keys()],
    delete: async (name: string) => cacheStore.delete(name),
    match: async () => undefined,
  };

  vm.runInNewContext(readFileSync(join(process.cwd(), "public/sw.js"), "utf8"), {
    self: {
      addEventListener: (type: string, handler: Handler) => void handlers.set(type, handler),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
      location: { origin: ORIGIN },
    },
    caches,
    URL,
    URLSearchParams,
    Request: class {},
    Response,
    fetch: async () => new Response("net"),
  });

  async function post(path: string, body: { formData: () => Promise<FormData> }, origin = ORIGIN) {
    let responded: Promise<Response> | undefined;
    handlers.get("fetch")!({
      request: { method: "POST", url: `${origin}${path}`, mode: "cors", ...body },
      respondWith: (value: Promise<Response>) => void (responded = value),
      waitUntil: () => undefined,
    });
    return responded ? await responded : "passthrough";
  }

  const shared = () => cacheStore.get("share-target-v1");
  return { post, shared, cacheStore };
}

const formWith = (entries: Record<string, string | File>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.append(key, value);
  return { formData: async () => form };
};

const png = (size = 1024, type = "image/png") => new File([new Uint8Array(size)], "recibo.png", { type });

const location = (response: Response | "passthrough") => {
  if (response === "passthrough") throw new Error("não interceptou");
  expect(response.status).toBe(303);
  return new URL(response.headers.get("location")!);
};

describe("service worker: compartilhar para o app", () => {
  it("texto compartilhado vai na URL da página de prévia, sem tocar no cache", async () => {
    const sw = loadServiceWorker();
    const url = location(await sw.post("/api/share", formWith({ text: "Compra R$ 45,90 & cia", title: "Banco" })));

    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("/compartilhar");
    expect(url.searchParams.get("text")).toBe("Compra R$ 45,90 & cia");
    expect(url.searchParams.has("imagem")).toBe(false);
    expect(sw.shared()).toBeUndefined();
  });

  it("sem texto usa o título e, sem título, o link", async () => {
    const sw = loadServiceWorker();
    expect(location(await sw.post("/api/share", formWith({ title: "Mercado 10" }))).searchParams.get("text")).toBe("Mercado 10");
    expect(location(await sw.post("/api/share", formWith({ url: "https://x.test/a" }))).searchParams.get("text")).toBe("https://x.test/a");
  });

  it("corta texto enorme", async () => {
    const sw = loadServiceWorker();
    const url = location(await sw.post("/api/share", formWith({ text: "a".repeat(5_000) })));
    expect(url.searchParams.get("text")).toHaveLength(2000);
  });

  it("imagem compartilhada fica num cache temporário e a página é avisada", async () => {
    const sw = loadServiceWorker();
    const url = location(await sw.post("/api/share", formWith({ imagem: png(2048) })));

    expect(url.pathname).toBe("/compartilhar");
    expect(url.searchParams.get("imagem")).toBe("1");
    const stored = sw.shared()!.get("/__share-target/imagem")!;
    expect(stored.headers.get("content-type")).toBe("image/png");
    expect(Number(stored.headers.get("x-shared-at"))).toBeGreaterThan(0);
    expect((await stored.blob()).size).toBe(2048);
  });

  it("recusa o que não é imagem, imagem vazia e imagem acima de 6 MB (o limite do OCR)", async () => {
    for (const file of [png(1024, "application/pdf"), png(0), png(6 * 1024 * 1024 + 1)]) {
      const sw = loadServiceWorker();
      const url = location(await sw.post("/api/share", formWith({ imagem: file })));
      expect(url.searchParams.has("imagem")).toBe(false);
      expect(sw.shared()).toBeUndefined();
    }
    const exactly = loadServiceWorker();
    expect(location(await exactly.post("/api/share", formWith({ imagem: png(6 * 1024 * 1024) }))).searchParams.get("imagem")).toBe("1");
  });

  it("texto e imagem juntos: os dois chegam", async () => {
    const sw = loadServiceWorker();
    const url = location(await sw.post("/api/share", formWith({ text: "Padaria 12,50", imagem: png() })));
    expect(url.searchParams.get("text")).toBe("Padaria 12,50");
    expect(url.searchParams.get("imagem")).toBe("1");
  });

  it("corpo ilegível não quebra: cai na página, que explica o que fazer", async () => {
    const sw = loadServiceWorker();
    const url = location(
      await sw.post("/api/share", {
        formData: async () => {
          throw new TypeError("corpo inválido");
        },
      }),
    );
    expect(url.pathname).toBe("/compartilhar");
    expect(url.search).toBe("");
  });

  it("só intercepta o POST do compartilhamento: outros POST e outra origem passam direto", async () => {
    const sw = loadServiceWorker();
    expect(await sw.post("/api/transactions", formWith({ text: "x" }))).toBe("passthrough");
    expect(await sw.post("/api/share/outra", formWith({ text: "x" }))).toBe("passthrough");
    expect(await sw.post("/api/share", formWith({ text: "x" }), "https://outro.example.test")).toBe("passthrough");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type LifecycleEvent = { waitUntil: (promise: Promise<unknown>) => void };
type FetchEvent = LifecycleEvent & {
  request: { method: string; url: string; mode: string };
  respondWith: (response: Promise<unknown>) => void;
};
type Handler = (event: never) => void;

type FakeResponse = { status: number; type: string; body: string; clone: () => FakeResponse };

function response(body: string, status = 200): FakeResponse {
  const value: FakeResponse = { status, type: "basic", body, clone: () => value };
  return value;
}

const ORIGIN = "https://app.example.test";

function loadServiceWorker(
  initialCaches: string[],
  network: (url: string) => FakeResponse | Promise<FakeResponse> = () => response("net"),
) {
  const store = new Map<string, Map<string, FakeResponse>>(
    initialCaches.map((name) => [name, new Map()]),
  );
  const handlers = new Map<string, Handler>();
  const key = (input: unknown) =>
    new URL(typeof input === "string" ? input : (input as { url: string }).url, ORIGIN).pathname;

  const self = {
    addEventListener: (type: string, handler: Handler) => void handlers.set(type, handler),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
    location: { origin: ORIGIN },
  };
  const caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const entries = store.get(name)!;
      return {
        addAll: async (requests: unknown[]) => {
          for (const request of requests) entries.set(key(request), await Promise.resolve(network(key(request))));
        },
        put: async (request: unknown, value: FakeResponse) => void entries.set(key(request), value),
      };
    },
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
    match: async (request: unknown) => {
      for (const entries of store.values()) {
        const hit = entries.get(key(request));
        if (hit) return hit;
      }
      return undefined;
    },
  };
  class FakeRequest {
    url: string;
    constructor(url: string) {
      this.url = new URL(url, ORIGIN).toString();
    }
  }
  const fetchCalls: string[] = [];
  const fetchImpl = async (input: unknown) => {
    fetchCalls.push(key(input));
    return network(key(input));
  };

  const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  vm.runInNewContext(source, {
    self,
    caches,
    URL,
    Request: FakeRequest,
    Response: { error: () => "error-response" },
    fetch: fetchImpl,
  });

  async function dispatch(type: "install" | "activate") {
    const pending: Promise<unknown>[] = [];
    (handlers.get(type) as (event: LifecycleEvent) => void)({
      waitUntil: (promise) => void pending.push(promise),
    });
    await Promise.all(pending);
  }

  async function request(path: string, mode = "no-cors", method = "GET") {
    let responded: Promise<unknown> | undefined;
    const pending: Promise<unknown>[] = [];
    (handlers.get("fetch") as (event: FetchEvent) => void)({
      request: { method, url: `${ORIGIN}${path}`, mode },
      respondWith: (value) => void (responded = value),
      waitUntil: (promise) => void pending.push(promise),
    });
    const result = responded ? await responded : "passthrough";
    await Promise.all(pending);
    return result as FakeResponse | string;
  }

  return { store, handlers, fetchCalls, dispatch, request };
}

describe("service worker cache upgrade", () => {
  it("precaches the offline transaction page in a cache that is not v2", async () => {
    const { store, dispatch } = loadServiceWorker(["controle-gastos-shell-v2"]);

    await dispatch("install");

    const upgraded = [...store.entries()].filter(
      ([name]) => name.startsWith("controle-gastos-shell-") && name !== "controle-gastos-shell-v2",
    );
    expect(upgraded).toHaveLength(1);
    expect([...upgraded[0][1].keys()]).toEqual(
      expect.arrayContaining(["/offline-transacao.html", "/offline.html"]),
    );
    // O cache antigo não é tocado na instalação: continua servindo até a ativação.
    expect(store.get("controle-gastos-shell-v2")!.size).toBe(0);
  });

  it("removes stale app caches on activate and keeps unrelated caches", async () => {
    const { store, dispatch } = loadServiceWorker([
      "controle-gastos-shell-v2",
      "controle-gastos-static-v2",
      "other-app-cache",
    ]);

    await dispatch("install");
    const [currentShell] = [...store.keys()].filter(
      (name) => name.startsWith("controle-gastos-shell-") && !name.endsWith("-v2"),
    );
    await dispatch("activate");

    expect([...store.keys()].sort()).toEqual([currentShell, "other-app-cache"].sort());
  });

  it("allowlist: never intercepts API, mutations, Next chunks or authenticated pages", async () => {
    const { store, request, dispatch } = loadServiceWorker([]);
    await dispatch("install");

    expect(await request("/api/transactions")).toBe("passthrough");
    expect(await request("/api/transactions", "cors", "POST")).toBe("passthrough");
    expect(await request("/_next/static/chunks/app-abc123.js")).toBe("passthrough");
    expect(await request("/transacoes")).toBe("passthrough");

    const cached = [...store.values()].flatMap((entries) => [...entries.keys()]);
    expect(cached.every((path) => !path.startsWith("/api/") && !path.startsWith("/_next/"))).toBe(true);
  });

  it("serves a new shell version after deploy and keeps the old copy if the update fails offline", async () => {
    let version = "v-old";
    let offline = false;
    const { request, dispatch } = loadServiceWorker([], (url) => {
      if (offline) throw new TypeError("network");
      return response(`${url}:${version}`);
    });
    await dispatch("install");

    version = "v-new";
    const online = (await request("/offline.html")) as FakeResponse;
    expect(online.body).toBe("/offline.html:v-new");

    offline = true;
    const stored = (await request("/offline.html")) as FakeResponse;
    expect(stored.body).toBe("/offline.html:v-new");
  });

  it("revalidates offline pages on online navigation and falls back to them offline", async () => {
    let version = "v1";
    let offline = false;
    const { request, dispatch } = loadServiceWorker([], (url) => {
      if (offline) throw new TypeError("network");
      return response(`${url}:${version}`);
    });
    await dispatch("install");

    version = "v2";
    await request("/transacoes/nova", "navigate");
    offline = true;
    const fallback = (await request("/transacoes/nova", "navigate")) as FakeResponse;
    expect(fallback.body).toBe("/offline-transacao.html:v2");
    const generic = (await request("/dashboard", "navigate")) as FakeResponse;
    expect(generic.body).toBe("/offline.html:v2");
  });

  it("never registers Background Sync handlers (financial sync stays manual)", () => {
    const { handlers } = loadServiceWorker([]);
    expect([...handlers.keys()].sort()).toEqual(["activate", "fetch", "install"]);
    expect(readFileSync(join(process.cwd(), "public/sw.js"), "utf8")).not.toMatch(
      /sync\.register|periodicsync|addEventListener\(\s*["']sync["']/i,
    );
  });
});

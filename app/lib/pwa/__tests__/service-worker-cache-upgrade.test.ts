import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type Handler = (event: {
  waitUntil: (promise: Promise<unknown>) => void;
}) => void;

function loadServiceWorker(initialCaches: string[]) {
  const store = new Map<string, string[]>(
    initialCaches.map((name) => [name, []]),
  );
  const handlers = new Map<string, Handler>();
  const self = {
    addEventListener: (type: string, handler: Handler) =>
      void handlers.set(type, handler),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
    location: { origin: "https://app.example.test" },
  };
  const caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, []);
      return {
        addAll: async (urls: string[]) => {
          store.get(name)!.push(...urls);
        },
      };
    },
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
    match: async () => undefined,
  };

  const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  vm.runInNewContext(source, { self, caches, URL, fetch: () => undefined });

  async function dispatch(type: "install" | "activate") {
    const pending: Promise<unknown>[] = [];
    handlers.get(type)!({ waitUntil: (promise) => void pending.push(promise) });
    await Promise.all(pending);
  }

  return { store, dispatch };
}

describe("service worker cache upgrade", () => {
  it("precaches the offline transaction page in a cache that is not v2", async () => {
    const { store, dispatch } = loadServiceWorker([
      "controle-gastos-shell-v2",
    ]);

    await dispatch("install");

    const current = [...store.entries()].filter(([name]) =>
      name.startsWith("controle-gastos-shell-"),
    );
    const upgraded = current.filter(([name]) => name !== "controle-gastos-shell-v2");
    expect(upgraded).toHaveLength(1);
    expect(upgraded[0][1]).toContain("/offline-transacao.html");
    expect(upgraded[0][1]).toContain("/offline.html");
    // O cache antigo não é tocado na instalação: continua servindo até a ativação.
    expect(store.get("controle-gastos-shell-v2")).toEqual([]);
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

    expect([...store.keys()].sort()).toEqual(
      [currentShell, "other-app-cache"].sort(),
    );
  });
});

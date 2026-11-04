import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const ORIGIN = "https://app.example.test";

type Handler = (event: unknown) => void;

function loadServiceWorker(windows: Array<{ url: string }> = []) {
  const handlers = new Map<string, Handler>();
  const showNotification = vi.fn(async () => undefined);
  const openWindow = vi.fn(async () => undefined);
  const matchAll = vi.fn(async () => windows);

  const self = {
    addEventListener: (type: string, handler: Handler) => void handlers.set(type, handler),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve(), matchAll, openWindow },
    registration: { showNotification },
    location: { origin: ORIGIN },
  };

  vm.runInNewContext(readFileSync(join(process.cwd(), "public/sw.js"), "utf8"), {
    self,
    URL,
    caches: {},
    Request: class {},
    Response: { error: () => "error-response" },
    fetch: async () => undefined,
  });

  async function push(data: unknown) {
    const pending: Promise<unknown>[] = [];
    handlers.get("push")!({
      data: data === undefined ? null : { json: () => (data instanceof Error ? (() => { throw data; })() : data) },
      waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
    });
    await Promise.all(pending);
  }

  async function click(url: unknown) {
    const pending: Promise<unknown>[] = [];
    const close = vi.fn();
    handlers.get("notificationclick")!({
      notification: { close, data: url === undefined ? undefined : { url } },
      waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
    });
    await Promise.all(pending);
    return { close };
  }

  return { push, click, showNotification, openWindow, matchAll };
}

describe("service worker: push dos avisos", () => {
  it("mostra título, texto e destino recebidos", async () => {
    const sw = loadServiceWorker();
    await sw.push({ title: "Fatura · Nubank", body: "vence amanhã", url: "/contas/show/c1" });

    expect(sw.showNotification).toHaveBeenCalledTimes(1);
    expect(sw.showNotification).toHaveBeenCalledWith(
      "Fatura · Nubank",
      expect.objectContaining({ body: "vence amanhã", data: { url: "/contas/show/c1" } }),
    );
  });

  it("push sem dados, com JSON inválido ou com campos errados ainda mostra um aviso genérico", async () => {
    for (const data of [undefined, new Error("json inválido"), { title: 42, body: null, url: {} }]) {
      const sw = loadServiceWorker();
      await sw.push(data);

      expect(sw.showNotification).toHaveBeenCalledWith(
        "Controle de Gastos",
        expect.objectContaining({ body: "Você tem um aviso novo.", data: { url: "/avisos" } }),
      );
    }
  });
});

describe("service worker: clique na notificação", () => {
  it("sem janela aberta, abre o destino no próprio app e fecha a notificação", async () => {
    const sw = loadServiceWorker([]);
    const { close } = await sw.click("/compromissos");

    expect(close).toHaveBeenCalled();
    expect(sw.openWindow).toHaveBeenCalledWith(`${ORIGIN}/compromissos`);
  });

  it("com janela do app aberta, navega e foca nela em vez de abrir outra", async () => {
    const navigate = vi.fn(async () => undefined);
    const focus = vi.fn(async () => undefined);
    const sw = loadServiceWorker([{ url: `${ORIGIN}/dashboard`, navigate, focus } as never]);

    await sw.click("/avisos");

    expect(navigate).toHaveBeenCalledWith(`${ORIGIN}/avisos`);
    expect(focus).toHaveBeenCalled();
    expect(sw.openWindow).not.toHaveBeenCalled();
  });

  it("destino que não é caminho do app (outro site, //host, vazio) cai em /avisos", async () => {
    for (const url of ["https://evil.example/", "//evil.example/x", "javascript:alert(1)", 7, undefined]) {
      const sw = loadServiceWorker([]);
      await sw.click(url);
      expect(sw.openWindow).toHaveBeenCalledWith(`${ORIGIN}/avisos`);
    }
  });
});

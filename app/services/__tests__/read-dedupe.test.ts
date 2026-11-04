import { afterEach, describe, expect, it, vi } from "vitest";

import { accountService } from "@/app/services/account-service";
import { apiClient, dedupeInFlightRead } from "@/app/services/api-client";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((res) => (resolve = res));
  return { promise, resolve };
}

afterEach(() => vi.unstubAllGlobals());

describe("dedupeInFlightRead", () => {
  it("leituras simultâneas idênticas dividem uma requisição; depois que ela termina, a próxima busca de novo", async () => {
    let calls = 0;
    const read = async () => ({ items: [++calls] });

    const [a, b] = await Promise.all([dedupeInFlightRead("k", read), dedupeInFlightRead("k", read)]);
    expect(calls).toBe(1);
    expect(a).toEqual({ items: [1] });
    expect(b).toEqual({ items: [1] });

    await dedupeInFlightRead("k", read);
    expect(calls).toBe(2);
  });

  it("cada chamador recebe sua cópia (alterar uma não afeta a outra)", async () => {
    const read = async () => ({ items: [3, 1, 2] });
    const [a, b] = await Promise.all([dedupeInFlightRead("copy", read), dedupeInFlightRead("copy", read)]);
    a.items.sort();
    expect(b.items).toEqual([3, 1, 2]);
  });

  it("chaves diferentes não se misturam e erro não fica preso", async () => {
    const failing = vi.fn().mockRejectedValueOnce(new Error("falhou")).mockResolvedValueOnce("ok");
    await expect(dedupeInFlightRead("erro", failing)).rejects.toThrow("falhou");
    await expect(dedupeInFlightRead("erro", failing)).resolves.toBe("ok");
    expect(await dedupeInFlightRead("outra", async () => "x")).toBe("x");
  });
});

describe("accountService.getAll", () => {
  it("duas chamadas ao mesmo tempo fazem uma só requisição", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { items: [{ id: "a1" }] } }));
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([accountService.getAll(), accountService.getAll()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.data.items).toEqual([{ id: "a1" }]);
    expect(second.data.items).toEqual([{ id: "a1" }]);
  });

  it("uma escrita feita durante a leitura impede que leituras posteriores usem a resposta antiga", async () => {
    const stale = deferredResponse();
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ success: true, data: null })
        : fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === "GET").length === 1
          ? stale.promise
          : jsonResponse({ success: true, data: { items: [{ id: "novo" }] } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const before = accountService.getAll();
    await apiClient("/api/transactions", { method: "POST", body: {} });
    const after = await accountService.getAll();

    expect(after.data.items).toEqual([{ id: "novo" }]);
    stale.resolve(jsonResponse({ success: true, data: { items: [{ id: "antigo" }] } }));
    expect((await before).data.items).toEqual([{ id: "antigo" }]);
  });
});

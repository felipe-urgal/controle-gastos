import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OFFLINE_TRANSACTION_QUEUE_PREFIX,
  enqueueOfflineTransaction,
  readOfflineTransactionQueue,
  rekeyOfflineTransactionQueueItem,
  syncOfflineTransactionQueueItem,
} from "@/app/lib/pwa/offline-transaction-queue";

function installLocalStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
    removeItem(key: string) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };

  vi.stubGlobal("window", { localStorage });
  return { values, localStorage };
}

const payload = {
  amount: 12_345,
  type: "EXPENSE" as const,
  description: "Mercado offline",
  categoryId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  day: 30,
  month: 9,
  year: 2026,
  status: "COMPLETED" as const,
  allocations: [],
  tagIds: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("offline transaction queue", () => {
  it("persists a pending operation with a stable idempotency key", () => {
    installLocalStorage();
    const queued = enqueueOfflineTransaction("user-a", payload, {
      id: "queue-1",
      idempotencyKey: "attempt-1",
    });

    expect(queued).toMatchObject({
      id: "queue-1",
      ownerUserId: "user-a",
      idempotencyKey: "attempt-1",
      status: "pending",
      payload,
    });
    expect(readOfflineTransactionQueue("user-a")).toHaveLength(1);
  });

  it("keeps the same key after a failed send and reuses it on retry", async () => {
    installLocalStorage();
    enqueueOfflineTransaction("user-a", payload, {
      id: "queue-1",
      idempotencyKey: "attempt-1",
    });
    const calls: string[] = [];

    await expect(
      syncOfflineTransactionQueueItem(
        "user-a",
        "queue-1",
        async (_payload, key) => {
          calls.push(key);
          throw new Error("rede indisponível");
        },
      ),
    ).rejects.toThrow("rede indisponível");

    expect(readOfflineTransactionQueue("user-a")[0]).toMatchObject({
      status: "error",
      idempotencyKey: "attempt-1",
      lastError: "rede indisponível",
    });

    await syncOfflineTransactionQueueItem(
      "user-a",
      "queue-1",
      async (_payload, key) => {
        calls.push(key);
        return { ok: true };
      },
    );

    expect(calls).toEqual(["attempt-1", "attempt-1"]);
    expect(readOfflineTransactionQueue("user-a")).toEqual([]);
  });

  it("accepts two identical purchases as independent attempts", async () => {
    installLocalStorage();
    const first = enqueueOfflineTransaction("user-a", payload, {
      id: "purchase-1",
      idempotencyKey: "key-1",
    });
    const second = enqueueOfflineTransaction("user-a", payload, {
      id: "purchase-2",
      idempotencyKey: "key-2",
    });
    expect(readOfflineTransactionQueue("user-a")).toHaveLength(2);
    const created = new Map<string, string>();
    const send = async (_: typeof payload, key: string) => {
      if (!created.has(key)) created.set(key, `transaction-${created.size + 1}`);
      return { id: created.get(key) };
    };
    const firstResult = await syncOfflineTransactionQueueItem("user-a", first.id, send);
    const secondResult = await syncOfflineTransactionQueueItem("user-a", second.id, send);
    expect(firstResult.result.id).not.toBe(secondResult.result.id);
    expect(created.size).toBe(2);
    expect(readOfflineTransactionQueue("user-a")).toEqual([]);
  });

  it("replays the same key without a second server-side creation after response loss", async () => {
    installLocalStorage();
    enqueueOfflineTransaction("user-a", payload, { id: "attempt", idempotencyKey: "stable-key" });
    const created = new Map<string, string>();
    let requests = 0;
    const simulateServer = async (_: typeof payload, key: string) => {
      requests++;
      if (!created.has(key)) created.set(key, `transaction-${created.size + 1}`);
      if (requests === 1) throw new TypeError("Resposta perdida após criação");
      return { id: created.get(key) };
    };
    await expect(syncOfflineTransactionQueueItem("user-a", "attempt", simulateServer)).rejects.toThrow("Resposta perdida");
    expect(readOfflineTransactionQueue("user-a")[0].idempotencyKey).toBe("stable-key");
    const retried = await syncOfflineTransactionQueueItem("user-a", "attempt", simulateServer);
    expect(retried.result.id).toBe("transaction-1");
    expect(requests).toBe(2);
    expect(created.size).toBe(1);
    expect(readOfflineTransactionQueue("user-a")).toEqual([]);
  });

  it("migrates legacy synced entries without consuming queue capacity", () => {
    const { localStorage } = installLocalStorage();
    const key = `${OFFLINE_TRANSACTION_QUEUE_PREFIX}user-a`;
    const now = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(Array.from({ length: 25 }, (_, n) => ({
      version: 1, id: `old-${n}`, ownerUserId: "user-a",
      idempotencyKey: `old-key-${n}`, payload, status: "synced",
      createdAt: now, updatedAt: now,
    }))));
    expect(readOfflineTransactionQueue("user-a")).toEqual([]);
    expect(enqueueOfflineTransaction("user-a", payload, {
      id: "new-purchase", idempotencyKey: "new-key",
    }).status).toBe("pending");
    expect(readOfflineTransactionQueue("user-a")).toHaveLength(1);
  });

  it("keeps the original key if cleanup fails after server confirmation", async () => {
    const { localStorage } = installLocalStorage();
    enqueueOfflineTransaction("user-a", payload, { id: "crash", idempotencyKey: "same-key" });
    const originalSetItem = localStorage.setItem;
    let failCleanup = true;
    localStorage.setItem = (key, value) => {
      if (failCleanup && JSON.parse(value).length === 0) {
        failCleanup = false;
        throw new Error("disk unavailable");
      }
      originalSetItem(key, value);
    };
    const created = new Map<string, string>();
    const send = async (_: typeof payload, key: string) => {
      if (!created.has(key)) created.set(key, `created-${created.size + 1}`);
      return created.get(key);
    };
    await expect(syncOfflineTransactionQueueItem("user-a", "crash", send)).rejects.toThrow();
    expect(readOfflineTransactionQueue("user-a")[0].idempotencyKey).toBe("same-key");
    await syncOfflineTransactionQueueItem("user-a", "crash", send);
    expect(created.size).toBe(1);
    expect(readOfflineTransactionQueue("user-a")).toEqual([]);
  });

  it("recovers an interrupted sending item as pending after reload", () => {
    const { localStorage } = installLocalStorage();
    const key = `${OFFLINE_TRANSACTION_QUEUE_PREFIX}user-a`;
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          version: 1,
          id: "queue-1",
          ownerUserId: "user-a",
          idempotencyKey: "attempt-1",
          payload,
          status: "sending",
          createdAt: "2026-09-30T12:00:00.000Z",
          updatedAt: "2026-09-30T12:00:00.000Z",
        },
      ]),
    );

    expect(readOfflineTransactionQueue("user-a")[0]).toMatchObject({
      status: "pending",
      lastError: "Envio interrompido antes da confirmação",
    });
  });

  it("classifies session expiration without discarding the queued operation", async () => {
    installLocalStorage();
    enqueueOfflineTransaction("user-a", payload, {
      id: "queue-auth",
      idempotencyKey: "attempt-auth",
    });
    const error = Object.assign(new Error("Não autenticado"), { status: 401 });

    await expect(
      syncOfflineTransactionQueueItem(
        "user-a",
        "queue-auth",
        async () => {
          throw error;
        },
      ),
    ).rejects.toThrow("Não autenticado");

    expect(readOfflineTransactionQueue("user-a")[0]).toMatchObject({
      id: "queue-auth",
      status: "error",
      failureKind: "auth",
      idempotencyKey: "attempt-auth",
    });
  });

  it("requires an explicit rekey to resolve an idempotency conflict as new", async () => {
    installLocalStorage();
    enqueueOfflineTransaction("user-a", payload, {
      id: "queue-conflict",
      idempotencyKey: "attempt-conflict",
    });
    const conflict = Object.assign(new Error("Conflito"), { status: 409, code: "IDEMPOTENCY_PAYLOAD_CONFLICT" });

    await expect(
      syncOfflineTransactionQueueItem(
        "user-a",
        "queue-conflict",
        async () => {
          throw conflict;
        },
      ),
    ).rejects.toThrow("Conflito");

    expect(readOfflineTransactionQueue("user-a")[0]).toMatchObject({
      status: "error",
      failureKind: "idempotency_conflict",
      errorCode: "IDEMPOTENCY_PAYLOAD_CONFLICT",
      idempotencyKey: "attempt-conflict",
    });

    const rekeyed = rekeyOfflineTransactionQueueItem(
      "user-a",
      "queue-conflict",
    );
    expect(rekeyed.idempotencyKey).not.toBe("attempt-conflict");
    expect(rekeyed).toMatchObject({
      status: "pending",
      failureKind: undefined,
      lastError: undefined,
    });
  });

  it.each([
    [409, "CREDIT_CARD_STATEMENT_ALREADY_PAID", "business_conflict"],
    [409, "OTHER_DOMAIN_CONFLICT", "business_conflict"],
    [409, undefined, "business_conflict"],
    [403, "FORBIDDEN", "auth"],
    [422, "INVALID_CATEGORY", "validation"],
    [400, "VALIDATION_ERROR", "validation"],
    [429, "RATE_LIMITED", "rate_limit"],
    [503, "SERVICE_UNAVAILABLE", "server"],
    [409, "IDEMPOTENCY_PAYLOAD_CONFLICT", "idempotency_conflict"],
  ] as const)("classifies HTTP %i / %s as %s", async (status, code, kind) => {
    installLocalStorage();
    enqueueOfflineTransaction("user-a", payload, { id: "item", idempotencyKey: "stable-key" });
    const error = Object.assign(new Error("Falha"), { status, code, retryAfterSeconds: 60 });
    await expect(syncOfflineTransactionQueueItem("user-a", "item", async () => { throw error; })).rejects.toThrow("Falha");
    const item = readOfflineTransactionQueue("user-a")[0];
    if (kind === "validation") {
      expect(item).toBeUndefined();
      return;
    }
    expect(item).toMatchObject({ failureKind: kind, errorCode: code, idempotencyKey: "stable-key" });
    if (kind === "rate_limit") {
      expect(Date.parse(item.retryAfterAt!)).toBeGreaterThan(Date.now());
      await expect(syncOfflineTransactionQueueItem("user-a", "item", async () => ({}))).rejects.toThrow("Aguarde");
    }
    if (kind === "business_conflict") {
      expect(() => rekeyOfflineTransactionQueueItem("user-a", "item")).toThrow("Somente conflito");
    }
  });

  it("keeps 429 key stable across the Retry-After deadline", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-08T12:00:00.000Z"));
      installLocalStorage();
      enqueueOfflineTransaction("user-a", payload, { id: "rate", idempotencyKey: "original-key" });
      const limited = Object.assign(new Error("Aguarde"), { status: 429, code: "RATE_LIMITED", retryAfterSeconds: 30 });
      await expect(syncOfflineTransactionQueueItem("user-a", "rate", async () => { throw limited; })).rejects.toThrow("Aguarde");
      const queued = readOfflineTransactionQueue("user-a")[0];
      expect(queued.retryAfterAt).toBe("2026-10-08T12:00:30.000Z");
      const send = vi.fn(async (_payload: typeof payload, key: string) => ({ key }));
      await expect(syncOfflineTransactionQueueItem("user-a", "rate", send)).rejects.toThrow("Aguarde");
      expect(send).not.toHaveBeenCalled();
      vi.advanceTimersByTime(30_000);
      const result = await syncOfflineTransactionQueueItem("user-a", "rate", send);
      expect(result.result.key).toBe("original-key");
      expect(readOfflineTransactionQueue("user-a")).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not accumulate validation failures after form corrections", async () => {
    installLocalStorage();
    for (let n = 0; n < 3; n++) {
      enqueueOfflineTransaction("user-a", { ...payload, description: `Correção ${n}` }, {
        id: `attempt-${n}`, idempotencyKey: `key-${n}`,
      });
      await expect(syncOfflineTransactionQueueItem("user-a", `attempt-${n}`, async () => {
        throw Object.assign(new Error("Categoria inválida"), { status: 422, code: "INVALID_CATEGORY" });
      })).rejects.toThrow("Categoria inválida");
      expect(readOfflineTransactionQueue("user-a")).toEqual([]);
    }
  });

  it.each([
    ["network", new TypeError("Resposta perdida")],
    ["server", Object.assign(new Error("Falha interna"), { status: 503 })],
    ["auth", Object.assign(new Error("Sessão expirada"), { status: 401 })],
    ["business_conflict", Object.assign(new Error("Conflito financeiro"), { status: 409, code: "CREDIT_CARD_STATEMENT_ALREADY_PAID" })],
  ])("preserves original key after %s error", async (kind, error) => {
    installLocalStorage();
    enqueueOfflineTransaction("user-a", payload, { id: "attempt", idempotencyKey: "original-key" });
    await expect(syncOfflineTransactionQueueItem("user-a", "attempt", async () => { throw error; })).rejects.toThrow();
    expect(readOfflineTransactionQueue("user-a")[0]).toMatchObject({
      status: "error", failureKind: kind, idempotencyKey: "original-key",
    });
  });

  it("drops malformed or foreign queue items instead of exposing them", () => {
    const { localStorage } = installLocalStorage();
    const key = `${OFFLINE_TRANSACTION_QUEUE_PREFIX}user-a`;
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          version: 1,
          id: "queue-1",
          ownerUserId: "user-b",
          idempotencyKey: "attempt-1",
          payload,
          status: "pending",
          createdAt: "2026-09-30T12:00:00.000Z",
          updatedAt: "2026-09-30T12:00:00.000Z",
        },
      ]),
    );

    expect(readOfflineTransactionQueue("user-a")).toEqual([]);
  });
});

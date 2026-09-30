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
    expect(readOfflineTransactionQueue("user-a")[0]).toMatchObject({
      status: "synced",
      idempotencyKey: "attempt-1",
    });
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
    const conflict = Object.assign(new Error("Conflito"), { status: 409 });

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
      failureKind: "conflict",
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

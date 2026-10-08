import type {
  TransactionStatus,
  TransactionType,
} from "@/app/types/transaction";

export const OFFLINE_TRANSACTION_QUEUE_PREFIX =
  "controle-gastos:offline-transaction-queue:v1:";
export const MAX_OFFLINE_TRANSACTION_QUEUE_ITEMS = 25;

export type OfflineTransactionQueueStatus =
  | "pending"
  | "sending"
  | "synced"
  | "error";

export type OfflineTransactionQueueFailureKind =
  | "auth"
  | "conflict"
  | "network"
  | "other";

export type OfflineTransactionQueuePayload = {
  amount: number;
  type: TransactionType;
  description: string;
  categoryId: string;
  accountId: string;
  day: number;
  month: number;
  year: number;
  status: TransactionStatus;
  allocations?: Array<{ categoryId: string; amount: number }>;
  tagIds?: string[];
};

export type OfflineTransactionQueueItem = {
  version: 1;
  id: string;
  ownerUserId: string;
  idempotencyKey: string;
  sourceDraftId?: string;
  payload: OfflineTransactionQueuePayload;
  status: OfflineTransactionQueueStatus;
  failureKind?: OfflineTransactionQueueFailureKind;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export class OfflineTransactionQueueStorageError extends Error {
  constructor() {
    super("Armazenamento local indisponível para a fila offline");
    this.name = "OfflineTransactionQueueStorageError";
  }
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function queueKey(userId: string) {
  return `${OFFLINE_TRANSACTION_QUEUE_PREFIX}${userId}`;
}

function isValidCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function isValidPayload(
  value: unknown,
): value is OfflineTransactionQueuePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineTransactionQueuePayload>;

  return (
    Number.isInteger(payload.amount) &&
    (payload.amount ?? 0) > 0 &&
    (payload.amount ?? 0) <= 1_000_000_000 &&
    (payload.type === "INCOME" || payload.type === "EXPENSE") &&
    typeof payload.description === "string" &&
    payload.description.trim().length >= 2 &&
    payload.description.trim().length <= 100 &&
    typeof payload.accountId === "string" &&
    payload.accountId.length > 0 &&
    typeof payload.categoryId === "string" &&
    payload.categoryId.length > 0 &&
    typeof payload.year === "number" &&
    typeof payload.month === "number" &&
    typeof payload.day === "number" &&
    isValidCalendarDate(payload.year, payload.month, payload.day) &&
    (payload.status === "COMPLETED" ||
      payload.status === "PENDING" ||
      payload.status === "CANCELLED") &&
    (payload.allocations === undefined ||
      (Array.isArray(payload.allocations) &&
        payload.allocations.every(
          (allocation) =>
            allocation &&
            typeof allocation.categoryId === "string" &&
            allocation.categoryId.length > 0 &&
            Number.isInteger(allocation.amount) &&
            allocation.amount > 0,
        ))) &&
    (payload.tagIds === undefined ||
      (Array.isArray(payload.tagIds) &&
        payload.tagIds.every((tagId) => typeof tagId === "string")))
  );
}

function isValidItem(value: unknown): value is OfflineTransactionQueueItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OfflineTransactionQueueItem>;

  return (
    item.version === 1 &&
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.ownerUserId === "string" &&
    item.ownerUserId.length > 0 &&
    typeof item.idempotencyKey === "string" &&
    item.idempotencyKey.length > 0 &&
    item.idempotencyKey.length <= 128 &&
    (item.sourceDraftId === undefined || typeof item.sourceDraftId === "string") &&
    isValidPayload(item.payload) &&
    (item.status === "pending" ||
      item.status === "sending" ||
      item.status === "synced" ||
      item.status === "error") &&
    (item.failureKind === undefined ||
      item.failureKind === "auth" ||
      item.failureKind === "conflict" ||
      item.failureKind === "network" ||
      item.failureKind === "other") &&
    (item.lastError === undefined || typeof item.lastError === "string") &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

function writeQueue(userId: string, items: OfflineTransactionQueueItem[]) {
  const storage = getStorage();
  if (!storage) throw new OfflineTransactionQueueStorageError();

  try {
    storage.setItem(queueKey(userId), JSON.stringify(items));
  } catch {
    throw new OfflineTransactionQueueStorageError();
  }
}

function randomId() {
  return globalThis.crypto.randomUUID();
}

export function readOfflineTransactionQueue(userId: string) {
  const storage = getStorage();
  if (!storage) return [] as OfflineTransactionQueueItem[];

  let raw: string | null;
  try {
    raw = storage.getItem(queueKey(userId));
  } catch {
    return [];
  }
  if (!raw) return [] as OfflineTransactionQueueItem[];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      storage.removeItem(queueKey(userId));
    } catch {
      // Invalid local data is ignored even when cleanup is unavailable.
    }
    return [];
  }

  if (!Array.isArray(parsed)) {
    try {
      storage.removeItem(queueKey(userId));
    } catch {
      // Invalid local data is ignored even when cleanup is unavailable.
    }
    return [];
  }

  const now = new Date().toISOString();
  let changed = false;
  const items = parsed.flatMap((candidate) => {
    if (!isValidItem(candidate) || candidate.ownerUserId !== userId) {
      changed = true;
      return [];
    }

    if (candidate.status === "sending") {
      changed = true;
      return [{
        ...candidate,
        status: "pending" as const,
        lastError: "Envio interrompido antes da confirmação",
        updatedAt: now,
      }];
    }

    return [candidate];
  });

  if (changed) {
    try {
      writeQueue(userId, items);
    } catch {
      // Keep the recovered in-memory queue; never delete valid operations
      // merely because storage cannot be rewritten at this moment.
    }
  }

  return items;
}

export function enqueueOfflineTransaction(
  userId: string,
  payload: OfflineTransactionQueuePayload,
  options?: { id?: string; idempotencyKey?: string; sourceDraftId?: string },
) {
  const items = readOfflineTransactionQueue(userId);
  if (items.length >= MAX_OFFLINE_TRANSACTION_QUEUE_ITEMS) {
    throw new Error(
      "Fila offline cheia. Sincronize ou descarte lançamentos pendentes antes de continuar.",
    );
  }

  const now = new Date().toISOString();
  const item: OfflineTransactionQueueItem = {
    version: 1,
    id: options?.id ?? randomId(),
    ownerUserId: userId,
    idempotencyKey: options?.idempotencyKey ?? randomId(),
    sourceDraftId: options?.sourceDraftId,
    payload,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  writeQueue(userId, [...items, item]);
  return item;
}

export function updateOfflineTransactionQueueItem(
  userId: string,
  itemId: string,
  patch: Partial<
    Pick<
      OfflineTransactionQueueItem,
      "status" | "failureKind" | "lastError"
    >
  >,
) {
  const items = readOfflineTransactionQueue(userId);
  const current = items.find((item) => item.id === itemId);
  if (!current) {
    throw new Error("Lançamento pendente não encontrado");
  }

  const updated: OfflineTransactionQueueItem = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  writeQueue(
    userId,
    items.map((item) => (item.id === itemId ? updated : item)),
  );
  return updated;
}

export function removeOfflineTransactionQueueItem(
  userId: string,
  itemId: string,
) {
  const items = readOfflineTransactionQueue(userId);
  writeQueue(
    userId,
    items.filter((item) => item.id !== itemId),
  );
}

export function clearOfflineTransactionQueue(userId: string) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(queueKey(userId));
  } catch {
    // Cleanup is best-effort when storage becomes unavailable.
  }
}

function classifyQueueFailure(error: unknown): OfflineTransactionQueueFailureKind {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (status === 401) return "auth";
    if (status === 409) return "conflict";
  }

  if (error instanceof TypeError) return "network";
  return "other";
}

export function rekeyOfflineTransactionQueueItem(
  userId: string,
  itemId: string,
) {
  const items = readOfflineTransactionQueue(userId);
  const current = items.find((item) => item.id === itemId);
  if (!current) {
    throw new Error("Lançamento pendente não encontrado");
  }

  const updated: OfflineTransactionQueueItem = {
    ...current,
    idempotencyKey: randomId(),
    status: "pending",
    failureKind: undefined,
    lastError: undefined,
    updatedAt: new Date().toISOString(),
  };

  writeQueue(
    userId,
    items.map((item) => (item.id === itemId ? updated : item)),
  );
  return updated;
}

export async function syncOfflineTransactionQueueItem<T>(
  userId: string,
  itemId: string,
  send: (
    payload: OfflineTransactionQueuePayload,
    idempotencyKey: string,
  ) => Promise<T>,
) {
  const item = readOfflineTransactionQueue(userId).find(
    (candidate) => candidate.id === itemId,
  );
  if (!item) {
    throw new Error("Lançamento pendente não encontrado");
  }
  if (item.status === "synced") {
    throw new Error("Lançamento já sincronizado");
  }

  updateOfflineTransactionQueueItem(userId, item.id, {
    status: "sending",
    failureKind: undefined,
    lastError: undefined,
  });

  try {
    const result = await send(item.payload, item.idempotencyKey);
    // O backend já reservou a chave; não reter sucessos na fila ativa.
    // Se o cleanup falhar, a mesma chave continua protegendo o retry.
    const synced = { ...item, status: "synced" as const };
    removeOfflineTransactionQueueItem(userId, item.id);
    return { item: synced, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao sincronizar lançamento";
    updateOfflineTransactionQueueItem(userId, item.id, {
      status: "error",
      failureKind: classifyQueueFailure(error),
      lastError: message,
    });
    throw error;
  }
}

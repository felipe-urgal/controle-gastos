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
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
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
    (payload.type === "INCOME" || payload.type === "EXPENSE") &&
    typeof payload.description === "string" &&
    payload.description.trim().length >= 2 &&
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
    (item.lastError === undefined || typeof item.lastError === "string") &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

function writeQueue(userId: string, items: OfflineTransactionQueueItem[]) {
  if (!hasStorage()) return;
  window.localStorage.setItem(queueKey(userId), JSON.stringify(items));
}

function randomId() {
  return globalThis.crypto.randomUUID();
}

export function readOfflineTransactionQueue(userId: string) {
  if (!hasStorage()) return [] as OfflineTransactionQueueItem[];

  const raw = window.localStorage.getItem(queueKey(userId));
  if (!raw) return [] as OfflineTransactionQueueItem[];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(queueKey(userId));
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

    if (changed) writeQueue(userId, items);
    return items;
  } catch {
    window.localStorage.removeItem(queueKey(userId));
    return [];
  }
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
    Pick<OfflineTransactionQueueItem, "status" | "lastError">
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
  if (!hasStorage()) return;
  window.localStorage.removeItem(queueKey(userId));
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
    lastError: undefined,
  });

  try {
    const result = await send(item.payload, item.idempotencyKey);
    const synced = updateOfflineTransactionQueueItem(userId, item.id, {
      status: "synced",
      lastError: undefined,
    });
    return { item: synced, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao sincronizar lançamento";
    updateOfflineTransactionQueueItem(userId, item.id, {
      status: "error",
      lastError: message,
    });
    throw error;
  }
}

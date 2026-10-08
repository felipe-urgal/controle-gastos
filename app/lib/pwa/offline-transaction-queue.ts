import type {
  TransactionStatus,
  TransactionType,
} from "@/app/types/transaction";
import { createTransactionSchema } from "@/app/lib/transactions/transaction-schema";

export const OFFLINE_TRANSACTION_QUEUE_PREFIX =
  "controle-gastos:offline-transaction-queue:v1:";
export const MAX_OFFLINE_TRANSACTION_QUEUE_ITEMS = 25;
export const OFFLINE_QUEUE_CHANGED_EVENT = "controle-gastos:offline-queue-changed";

export type OfflineTransactionQueueStatus =
  | "pending"
  | "sending"
  | "synced"
  | "error";

export type OfflineTransactionQueueFailureKind =
  | "auth"
  | "idempotency_conflict"
  | "business_conflict"
  | "validation"
  | "rate_limit"
  | "network"
  | "server"
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
  merchantId?: string | null;
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
  errorCode?: string;
  retryAfterAt?: string;
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

function isValidPayload(
  value: unknown,
): value is OfflineTransactionQueuePayload {
  return createTransactionSchema.safeParse(value).success;
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
      item.failureKind === "idempotency_conflict" ||
      item.failureKind === "business_conflict" ||
      item.failureKind === "validation" ||
      item.failureKind === "rate_limit" ||
      item.failureKind === "server" ||
      item.failureKind === "network" ||
      item.failureKind === "other") &&
    (item.lastError === undefined || typeof item.lastError === "string") &&
    (item.errorCode === undefined || typeof item.errorCode === "string") &&
    (item.retryAfterAt === undefined || (typeof item.retryAfterAt === "string" && !Number.isNaN(Date.parse(item.retryAfterAt)))) &&
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
  notifyQueueChanged();
}

function notifyQueueChanged() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED_EVENT));
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

    // Entries synced by older builds are not active pending operations.
    if (candidate.status === "synced") {
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
  if (!isValidPayload(payload)) {
    throw new Error("Revise os dados: o lançamento ainda é inválido.");
  }
  const items = readOfflineTransactionQueue(userId);
  if (items.filter((item) => item.status !== "synced").length >= MAX_OFFLINE_TRANSACTION_QUEUE_ITEMS) {
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
      "status" | "failureKind" | "lastError" | "errorCode" | "retryAfterAt"
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

/**
 * Explicit user-approved correction of a definitively rejected operation.
 * Never mutate or rekey an uncertain network/server/auth operation.
 */
export function replaceReviewedOfflineTransactionQueueItem(
  userId: string,
  itemId: string,
  payload: OfflineTransactionQueuePayload,
) {
  if (!isValidPayload(payload)) {
    throw new Error("Revise os dados: o lançamento ainda é inválido.");
  }
  const items = readOfflineTransactionQueue(userId);
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new Error("Lançamento pendente não encontrado");
  if (current.failureKind !== "validation" && current.failureKind !== "business_conflict") {
    throw new Error("Antes de editar um envio incerto, tente sincronizar novamente com a chave original.");
  }
  if (JSON.stringify(current.payload) === JSON.stringify(payload)) {
    throw new Error("Altere os dados após revisar o motivo da falha.");
  }
  const updated: OfflineTransactionQueueItem = {
    ...current,
    payload,
    idempotencyKey: randomId(),
    status: "pending",
    failureKind: undefined,
    errorCode: undefined,
    retryAfterAt: undefined,
    lastError: undefined,
    updatedAt: new Date().toISOString(),
  };
  writeQueue(userId, items.map((item) => item.id === itemId ? updated : item));
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
  notifyQueueChanged();
}

export function classifyQueueFailure(error: unknown): OfflineTransactionQueueFailureKind {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    const code = (error as { code?: unknown }).code;
    if (status === 401 || status === 403) return "auth";
    if (status === 429) return "rate_limit";
    if (status === 409) return code === "IDEMPOTENCY_PAYLOAD_CONFLICT"
      ? "idempotency_conflict" : "business_conflict";
    if (status === 400 || status === 422) return "validation";
    if (status >= 500) return "server";
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

  if (current.failureKind !== "idempotency_conflict" || current.errorCode !== "IDEMPOTENCY_PAYLOAD_CONFLICT") {
    throw new Error("Somente conflito de idempotência permite criar uma nova tentativa.");
  }
  const updated: OfflineTransactionQueueItem = {
    ...current,
    idempotencyKey: randomId(),
    status: "pending",
    failureKind: undefined,
    errorCode: undefined,
    retryAfterAt: undefined,
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
  if (item.retryAfterAt && Date.now() < Date.parse(item.retryAfterAt)) {
    throw new Error("Aguarde o prazo informado pelo servidor antes de tentar novamente.");
  }
  if (item.failureKind === "validation" || item.failureKind === "business_conflict") {
    throw new Error("Revise o lançamento antes de uma nova tentativa.");
  }

  updateOfflineTransactionQueueItem(userId, item.id, {
    status: "sending",
    failureKind: undefined,
    errorCode: undefined,
    retryAfterAt: undefined,
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
    const failureKind = classifyQueueFailure(error);
    // A 400/422 validation rejection guarantees no creation. The form keeps
    // the error visible; do not turn each correction into a queued operation.
    if (failureKind === "validation") {
      removeOfflineTransactionQueueItem(userId, item.id);
      throw error;
    }
    // Business conflicts require review; uncertain outcomes keep their key.
    updateOfflineTransactionQueueItem(userId, item.id, {
      status: "error",
      failureKind,
      errorCode: error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined,
      retryAfterAt: failureKind === "rate_limit" && error && typeof error === "object" &&
        "retryAfterSeconds" in error && typeof error.retryAfterSeconds === "number" &&
        Number.isFinite(error.retryAfterSeconds)
        ? new Date(Date.now() + Math.max(0, error.retryAfterSeconds) * 1000).toISOString() : undefined,
      lastError: message,
    });
    throw error;
  }
}

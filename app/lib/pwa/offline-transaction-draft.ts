import { clearOfflineTransactionQueue } from "@/app/lib/pwa/offline-transaction-queue";
import type { FormData } from "@/app/lib/interface/transaction.interface";
import type { TransactionType } from "@/app/types/transaction";

export const OFFLINE_DRAFT_OWNER_KEY =
  "controle-gastos:offline-draft-owner:v1";
export const OFFLINE_TRANSACTION_DRAFT_PREFIX =
  "controle-gastos:offline-transaction-draft:v1:";

export type OfflineTransactionDraft = {
  version: 1;
  id: string;
  ownerUserId: string;
  type: TransactionType;
  amount: number;
  description: string;
  year: number;
  month: number;
  day: number;
  createdAt: string;
  updatedAt: string;
};

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function draftKey(userId: string) {
  return `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${userId}`;
}

function isValidDraft(value: unknown): value is OfflineTransactionDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<OfflineTransactionDraft>;

  if (
    draft.version !== 1 ||
    typeof draft.id !== "string" ||
    typeof draft.ownerUserId !== "string" ||
    (draft.type !== "INCOME" && draft.type !== "EXPENSE") ||
    !Number.isInteger(draft.amount) ||
    (draft.amount ?? -1) < 0 ||
    typeof draft.description !== "string" ||
    typeof draft.year !== "number" ||
    typeof draft.month !== "number" ||
    typeof draft.day !== "number" ||
    typeof draft.createdAt !== "string" ||
    typeof draft.updatedAt !== "string"
  ) {
    return false;
  }

  const date = new Date(Date.UTC(draft.year, draft.month - 1, draft.day));
  return (
    date.getUTCFullYear() === draft.year &&
    date.getUTCMonth() + 1 === draft.month &&
    date.getUTCDate() === draft.day
  );
}

export function getOfflineDraftOwner() {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(OFFLINE_DRAFT_OWNER_KEY);
}

export function setOfflineDraftOwner(userId: string) {
  if (!hasStorage()) return;

  const previousOwner = getOfflineDraftOwner();
  if (previousOwner && previousOwner !== userId) {
    window.localStorage.removeItem(draftKey(previousOwner));
    clearOfflineTransactionQueue(previousOwner);
  }

  window.localStorage.setItem(OFFLINE_DRAFT_OWNER_KEY, userId);
}

export function readOfflineTransactionDraft(userId: string) {
  if (!hasStorage()) return null;

  const raw = window.localStorage.getItem(draftKey(userId));
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidDraft(parsed) || parsed.ownerUserId !== userId) {
      window.localStorage.removeItem(draftKey(userId));
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(draftKey(userId));
    return null;
  }
}

export function clearOfflineTransactionDraft(userId: string) {
  if (!hasStorage()) return;
  window.localStorage.removeItem(draftKey(userId));
}

export function clearOfflineTransactionLocalState() {
  if (!hasStorage()) return;

  const owner = getOfflineDraftOwner();
  if (owner) {
    clearOfflineTransactionDraft(owner);
    clearOfflineTransactionQueue(owner);
  }
  window.localStorage.removeItem(OFFLINE_DRAFT_OWNER_KEY);
}

export function offlineDraftToFormData(
  draft: OfflineTransactionDraft,
): FormData {
  return {
    amount: draft.amount,
    month: draft.month,
    year: draft.year,
    day: draft.day,
    description: draft.description,
    status: "COMPLETED",
    accountId: "",
    categoryId: "",
    allocations: [],
    tagIds: [],
  };
}
